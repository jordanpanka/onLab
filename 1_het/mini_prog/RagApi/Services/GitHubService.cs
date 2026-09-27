using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;


public class RepositoryFile
{
    public IFormFile File { get; set; } = default!;
    public string RelativePath { get; set; } = "";
}

public class RepositorySnapshot
{
    public string CommitSha { get; set; } = "";
    public List<RepositoryFile> Files { get; set; } = new();
    public int SkippedCount { get; set; }
    public int TotalEntries { get; set; }
}

public class GitHubService
{
    private readonly HttpClient httpClient;

    private const string UserAgent = "mini-prog-rag";
    private const string ApiRoot = "https://api.github.com";

    private static readonly string[] IgnoredSegments =
    {
        "node_modules", "bin", "obj", "dist", "build", "out",
        ".git", ".github", ".venv", "venv", "__pycache__", "site-packages",
        ".next", ".nuxt", "target", "vendor", "ragas_env", ".pytest_cache",
        ".mypy_cache", ".idea", ".vs", "coverage", "htmlcov", "packages"
    };

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        // code
        ".cs", ".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".go", ".rs",
        ".php", ".cpp", ".c", ".h", ".hpp",
        // structured / configuration
        ".json", ".yaml", ".yml", ".xml", ".toml", ".ini", ".cfg", ".conf",
        ".properties", ".gradle", ".sql",
        // documentation
        ".md", ".txt", ".rst", ".pdf"
    };

    private static readonly HashSet<string> AllowedFilenames = new(StringComparer.OrdinalIgnoreCase)
    {
        "dockerfile", "containerfile", "makefile", "jenkinsfile", "vagrantfile",
        "procfile", "codeowners", "gemfile", "rakefile",
        "readme", "license", "licence", "changelog", "contributing",
        "authors", "notice", "todo"
    };

    private static readonly HashSet<string> BlockedFilenames = new(StringComparer.OrdinalIgnoreCase)
    {
        ".env", "id_rsa", "id_ed25519", ".npmrc", ".pypirc"
    };

    private const long MaxFileBytes = 1024 * 1024;

    private const int MaxFiles = 2000;

    public GitHubService(HttpClient http)
    {
        httpClient = http;
    }

    private HttpRequestMessage BuildRequest(HttpMethod method, string url, string? token)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.UserAgent.ParseAdd(UserAgent);
        request.Headers.Accept.ParseAdd("application/vnd.github+json");

        if (!string.IsNullOrWhiteSpace(token))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        return request;
    }

    public async Task<ServiceResult> GetCommitShaAsync(string owner, string repo, string reference, string? token = null)
    {
        try
        {
            using var request = BuildRequest(
                HttpMethod.Get,
                $"{ApiRoot}/repos/{owner}/{repo}/commits/{reference}",
                token);

            using var response = await httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                return ServiceResult.Fail($"GitHub returned {(int)response.StatusCode} for {owner}/{repo}@{reference}: {body}");
            }

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var sha = doc.RootElement.GetProperty("sha").GetString() ?? "";
            return ServiceResult.Success(sha);
        }
        catch (Exception ex)
        {
            return ServiceResult.Fail($"Could not resolve {owner}/{repo}@{reference}: {ex.Message}");
        }
    }

    public async Task<ServiceResult> FetchSnapshotAsync(string owner, string repo, string reference, string? token = null)
    {
        var shaResult = await GetCommitShaAsync(owner, repo, reference, token);
        if (!shaResult.Ok) return shaResult;

        var sha = (string)shaResult.Data!;

        try
        {
            using var request = BuildRequest(
                HttpMethod.Get,
                $"{ApiRoot}/repos/{owner}/{repo}/zipball/{reference}",
                token);

            using var response = await httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                return ServiceResult.Fail($"Could not download {owner}/{repo}: HTTP {(int)response.StatusCode} {body}");
            }

            // ZipArchive needs random access, so buffer the download first.
            using var buffer = new MemoryStream();
            await response.Content.CopyToAsync(buffer);
            buffer.Position = 0;

            var snapshot = ExtractSnapshot(buffer, sha);
            return ServiceResult.Success(snapshot);
        }
        catch (Exception ex)
        {
            return ServiceResult.Fail($"Failed to fetch {owner}/{repo}: {ex.Message}");
        }
    }

    private RepositorySnapshot ExtractSnapshot(Stream zipStream, string sha)
    {
        var snapshot = new RepositorySnapshot { CommitSha = sha };

        using var archive = new ZipArchive(zipStream, ZipArchiveMode.Read);

        foreach (var entry in archive.Entries)
        {
            // Directory entries have an empty Name.
            if (string.IsNullOrWhiteSpace(entry.Name)) continue;

            snapshot.TotalEntries++;

            var path = StripArchiveRoot(entry.FullName);

            if (!ShouldIndex(path, entry.Length))
            {
                snapshot.SkippedCount++;
                continue;
            }

            if (snapshot.Files.Count >= MaxFiles)
            {
                snapshot.SkippedCount++;
                continue;
            }

            // Copy out now: the entry stream is only valid while the archive is open.
            var bytes = new MemoryStream();
            using (var entryStream = entry.Open())
            {
                entryStream.CopyTo(bytes);
            }
            bytes.Position = 0;

            var fileName = Path.GetFileName(path);
            var formFile = new FormFile(bytes, 0, bytes.Length, "files", fileName)
            {
                Headers = new HeaderDictionary()
            };
            formFile.ContentType = ContentTypeFor(Path.GetExtension(fileName));

            snapshot.Files.Add(new RepositoryFile
            {
                File = formFile,
                RelativePath = path
            });
        }

        return snapshot;
    }

    private static string StripArchiveRoot(string fullName)
    {
        var path = fullName.Replace("\\", "/").TrimStart('/');

        var slash = path.IndexOf('/');
        return slash >= 0 ? path[(slash + 1)..] : path;
    }

    private static bool ShouldIndex(string path, long length)
    {
        if (string.IsNullOrWhiteSpace(path)) return false;
        if (path.Contains("..")) return false;
        if (length <= 0 || length > MaxFileBytes) return false;

        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length == 0) return false;

        // Compare whole path segments: a blanket Contains() would also reject
        // legitimate files such as "src/binary_search.py" because of "bin".
        if (segments.Take(segments.Length - 1).Any(s => IgnoredSegments.Contains(s, StringComparer.OrdinalIgnoreCase)))
            return false;

        var fileName = segments[^1];
        if (BlockedFilenames.Contains(fileName)) return false;

        var extension = Path.GetExtension(fileName);

        
        return string.IsNullOrEmpty(extension)
            ? AllowedFilenames.Contains(fileName)
            : AllowedExtensions.Contains(extension);
    }

    private static string ContentTypeFor(string extension) => extension.ToLowerInvariant() switch
    {
        ".md" => "text/markdown",
        ".json" => "application/json",
        ".xml" => "application/xml",
        ".yaml" or ".yml" => "application/yaml",
        ".pdf" => "application/pdf",
        _ => "text/plain"
    };
}
