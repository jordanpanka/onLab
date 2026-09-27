using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using ef;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

public class RepositoryIngestService
{
    private readonly CodeDbContext db;
    private readonly GitHubService gitHub;
    private readonly FileService fileService;
    private readonly MinioService minioService;
    private readonly RepositoryIngestQueue queue;
    private readonly ILogger<RepositoryIngestService> logger;

   
    private const int BatchSize = 5;

    public RepositoryIngestService(
        CodeDbContext codeDbContext,
        GitHubService gitHubService,
        FileService files,
        MinioService minio,
        RepositoryIngestQueue ingestQueue,
        ILogger<RepositoryIngestService> log)
    {
        db = codeDbContext;
        gitHub = gitHubService;
        fileService = files;
        minioService = minio;
        queue = ingestQueue;
        logger = log;
    }

   
    public async Task<ServiceResult> QueueAsync(
        int userId, int invId, int projectId,
        string owner, string repo, string reference)
    {
        var project = await db.Projects
            .FirstOrDefaultAsync(p => p.ID == projectId && p.InvestigationID == invId);

        if (project == null) return ServiceResult.Fail("Project doesn't exist.");

        var ownsIt = await db.Investigations
            .AnyAsync(i => i.ID == invId && i.UserID == userId);

        if (!ownsIt) return ServiceResult.Fail("Investigation doesn't belong to this user.");

        // One import at a time per project: two concurrent imports would race on
        // the duplicate check and could store the same file twice.
        var busy = await db.Repositories
            .AnyAsync(r => r.ProjectID == projectId && RepositoryStatus.InFlight.Contains(r.Status));

        if (busy) return ServiceResult.Fail("An import is already running for this project.");

        var record = new DbRepository
        {
            ProjectID = projectId,
            Owner = owner,
            Name = repo,
            Reference = reference,
            Status = RepositoryStatus.Queued
        };

        db.Repositories.Add(record);
        await db.SaveChangesAsync();

        await queue.EnqueueAsync(record.ID);

        return ServiceResult.Success(new
        {
            repositoryId = record.ID,
            status = record.Status
        });
    }

    
    public async Task RunAsync(int repositoryId, CancellationToken cancellationToken = default)
    {
        var record = await db.Repositories.FirstOrDefaultAsync(r => r.ID == repositoryId, cancellationToken);
        if (record == null)
        {
            logger.LogWarning("Repository {RepositoryId} disappeared before it could be ingested", repositoryId);
            return;
        }

        // The queue only carries the id, so the owning user and investigation
        // have to be looked up again here.
        var context = await db.Projects
            .Where(p => p.ID == record.ProjectID)
            .Select(p => new { InvId = p.InvestigationID, UserId = p.Investigation.UserID })
            .FirstOrDefaultAsync(cancellationToken);

        if (context == null)
        {
            await MarkFailedAsync(record, "Project disappeared before the import started.");
            return;
        }

        try
        {
            record.Status = RepositoryStatus.Fetching;
            await db.SaveChangesAsync(cancellationToken);

            var fetch = await gitHub.FetchSnapshotAsync(record.Owner, record.Name, record.Reference);
            if (!fetch.Ok)
            {
                await MarkFailedAsync(record, fetch.Error!);
                return;
            }

            var snapshot = (RepositorySnapshot)fetch.Data!;

            record.CommitSha = snapshot.CommitSha;
            record.SkippedFileCount = snapshot.SkippedCount;
            record.Status = RepositoryStatus.Indexing;
            await db.SaveChangesAsync(cancellationToken);

            logger.LogInformation(
                "Repository {Owner}/{Repo}@{Sha}: {Kept} files to index, {Skipped} skipped of {Total} entries",
                record.Owner, record.Name, snapshot.CommitSha, snapshot.Files.Count,
                snapshot.SkippedCount, snapshot.TotalEntries);

            if (snapshot.Files.Count == 0)
            {
                await MarkFailedAsync(record, "No indexable files found in the repository.");
                return;
            }

            // Drop anything already stored for this project, mirroring the upload path.
            var pending = new List<RepositoryFile>();

            foreach (var candidate in snapshot.Files)
            {
                var duplicate = await fileService.CheckDuplicates(
                    context.UserId, context.InvId, record.ProjectID, candidate.File, candidate.RelativePath);

                if (duplicate.Ok) pending.Add(candidate);
                else record.SkippedFileCount++;
            }

            if (pending.Count == 0)
            {
                await MarkFailedAsync(record, "Every file in this repository was already uploaded.");
                return;
            }

            record.TotalFileCount = pending.Count;
            await db.SaveChangesAsync(cancellationToken);

            
            for (var offset = 0; offset < pending.Count; offset += BatchSize)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var batch = pending.Skip(offset).Take(BatchSize).ToList();
                var files = batch.Select(b => b.File).ToList();
                var paths = batch.Select(b => b.RelativePath).ToList();

                var indexed = await fileService.UploadQdrantPythonAsync(
                    context.UserId, files, paths, record.ProjectID, context.InvId);

                if (!indexed.Ok)
                {
                    await MarkFailedAsync(record, indexed.Error!);
                    return;
                }

                var stored = await fileService.UploadAsync(record.ProjectID, files, paths);
                if (!stored.Ok)
                {
                    await MarkFailedAsync(record, "Failed to record repository files.");
                    return;
                }

                await minioService.UploadAsync(context.UserId, files, paths, record.ProjectID, context.InvId);

                record.IndexedFileCount += files.Count;
                await db.SaveChangesAsync(cancellationToken);

                logger.LogInformation(
                    "Repository {RepositoryId}: {Done}/{Total} files indexed",
                    record.ID, record.IndexedFileCount, record.TotalFileCount);
            }

            record.Status = RepositoryStatus.Ready;
            record.IndexedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (OperationCanceledException)
        {
            await MarkFailedAsync(record, "Import stopped because the backend is shutting down.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Repository ingest failed for {Owner}/{Repo}", record.Owner, record.Name);
            await MarkFailedAsync(record, ex.Message);
        }
    }

    private async Task MarkFailedAsync(DbRepository record, string error)
    {
        record.Status = RepositoryStatus.Failed;
        record.ErrorMessage = error.Length > 1000 ? error[..1000] : error;

        // Deliberately not passing the cancellation token: a shutdown is exactly
        // when this write matters most.
        await db.SaveChangesAsync();
    }

    public async Task<ServiceResult> GetForProjectAsync(int projectId)
    {
        var repositories = await db.Repositories
            .Where(r => r.ProjectID == projectId)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new
            {
                id = r.ID,
                owner = r.Owner,
                name = r.Name,
                reference = r.Reference,
                commitSha = r.CommitSha,
                status = r.Status,
                error = r.ErrorMessage,
                indexed = r.IndexedFileCount,
                total = r.TotalFileCount,
                skipped = r.SkippedFileCount,
                indexedAt = r.IndexedAt
            })
            .ToListAsync();

        return ServiceResult.Success(repositories);
    }
}
