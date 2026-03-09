using System.IO.Compression;
using DocumentFormat.OpenXml.Wordprocessing;
using ef;
using Microsoft.EntityFrameworkCore;

public class FileService
{
    private readonly CodeDbContext codeDbContext;

    public FileService(CodeDbContext cdb)
    {
        codeDbContext=cdb;
    }
    private string NormalizeRelativePath(string path)
    {
         path = path.Replace("\\", "/").Trim();

        while (path.StartsWith("/"))
            path = path[1..];

        if (path.Contains(".."))
            throw new Exception("Invalid relative path.");

        return path;
    }
    public async Task<ServiceResult> UploadAsync(int pid, List<IFormFile> files, List<string> paths)
    {
        if(files.Count==0 || paths.Count==0)
            return ServiceResult.Fail("Files and paths count doesn't exist.");

        if (files.Count != paths.Count)
        {
            return ServiceResult.Fail("The number of files and paths doesn1t match.");
        }
        var projexist=await codeDbContext.Projects.AnyAsync(x=>x.ID==pid);
        if(!projexist) return ServiceResult.Fail("The project doesn't exist.");

        for(int i=0; i<files.Count; i++)
        {
            var file=files[i];
            var relativePath=string.IsNullOrWhiteSpace(paths[i])? file.FileName : paths[i];

            if (file.FileName.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
            {
                var response=await SaveFileAsZip(pid,file,relativePath);
                if(!response.Ok)return ServiceResult.Fail("");
            }
            else
            {
                var response=await SaveFileAsNormal(pid,file,relativePath);
                if(!response.Ok) return ServiceResult.Fail("");
            }
        }
        await codeDbContext.SaveChangesAsync();
        return ServiceResult.Success();
    }


    public async Task<ServiceResult> SaveFileAsZip(int pid, IFormFile file, string path)
    {
        using var archive = new ZipArchive(file.OpenReadStream(), ZipArchiveMode.Read);

        foreach (var entry in archive.Entries)
        {
            if (string.IsNullOrWhiteSpace(entry.Name))
                continue;

            var entryRelativePath = NormalizeRelativePath(entry.FullName);
            var extension = Path.GetExtension(entry.Name);
            //var storedName = $"{Guid.NewGuid()}{extension}";

            var dbFile = new DbFile
            {
                ProjectID = pid,
                Name = entry.Name,
                RelativePath = entryRelativePath,
                StoragePath ="",
                Extension = extension,
                ContentType =file.ContentType ?? "" ,
                Size = entry.Length
            };

            codeDbContext.Files.Add(dbFile);
        }
        return ServiceResult.Success();
        
    }
    public async Task<ServiceResult> SaveFileAsNormal(int pid, IFormFile file, string path)
    {
        var fileSave=new DbFile{ProjectID=pid,Name=file.FileName, RelativePath=NormalizeRelativePath(path),StoragePath="", Size=file.Length, ContentType=file.ContentType , Extension=Path.GetExtension(file.FileName)};
        codeDbContext.Files.Add(fileSave);
        return ServiceResult.Success();
    }
}