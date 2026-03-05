using System.Text.Json;
using DocumentFormat.OpenXml.Drawing.Diagrams;
using ef;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using UglyToad.PdfPig.Graphics.Colors;

public class ProjectService
{
     private readonly CodeDbContext codeDbContext;

     public ProjectService(CodeDbContext db)
    {
        codeDbContext=db;
    }
    public async Task<ServiceResult> AddInvAsync(InvestigationData data)
    {
        //user exist?
        var exist=await codeDbContext.Users.AnyAsync();

        if(!exist) return ServiceResult.Fail("User doesn't exist");

        var inv=new DbInvestigation{Name=data.name, Description=data.description};

        codeDbContext.Investigations.Add(inv);
        await codeDbContext.SaveChangesAsync();
        return ServiceResult.Success();
    }
    public async Task<ServiceResult> AddProjectAsync(ProjectData data)
    {
        //
        var exist=await codeDbContext.Projects.AnyAsync(x=>x.InvestigationID==data.invId);
        if(!exist) return ServiceResult.Fail("Investigation doesn't exist");

        var project=new DbProject{InvestigationID=data.invId,Name=data.name,Description=data.description};
        codeDbContext.Projects.Add(project);
        await codeDbContext.SaveChangesAsync();
        return ServiceResult.Success();
    }
    
    public async Task<ServiceResult> AddFilesAsync(FilesData data)
    {
        var exist=await codeDbContext.Projects.AnyAsync(x=>x.ID==data.projectId);
        if(!exist) return ServiceResult.Fail("Project doesn't exist");

        var file=new DbFile{};

        codeDbContext.Files.Add(file);
        await codeDbContext.SaveChangesAsync();
        return ServiceResult.Success();
    }
    public async Task<ServiceResult> GetInvestigationsAsync(UserID data)
    {
        var exist=await codeDbContext.Users.AnyAsync(x=>x.ID==data.id);
        if(!exist) return ServiceResult.Fail("User doesn't exist");

        var investigations=await codeDbContext.Investigations.Where(x=>x.UserID==data.id).ToListAsync();

        return ServiceResult.Success(JsonSerializer.Serialize(investigations));
    }
    public async Task<ServiceResult> GetProjectsAsync(InvestigationID data)
    {
        var exist=await codeDbContext.Investigations.AnyAsync(x=>x.ID==data.id);
        if(!exist) return ServiceResult.Fail("Investigation doesn't exist");

        var projects=await codeDbContext.Projects.Where(x=>x.InvestigationID==data.id).ToListAsync();

        return ServiceResult.Success(JsonSerializer.Serialize(projects));
    }

    public async Task<ServiceResult> GetFilesAsync(ProjectID data)
    {
        var exist=await codeDbContext.Projects.AnyAsync(x=>x.ID==data.id);
        if(!exist) return ServiceResult.Fail("Project doesn1t exist");

        var files=await codeDbContext.Files.Where(x=>x.ProjectID==data.id).ToListAsync();

        return ServiceResult.Success(JsonSerializer.Serialize(files));
    }


}