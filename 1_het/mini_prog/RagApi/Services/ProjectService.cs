using DocumentFormat.OpenXml.Drawing.Diagrams;
using ef;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using UglyToad.PdfPig.Graphics.Colors;

public class ProjectService
{
     private readonly CodeDbContext codeDbContext;

     public ProjectService(CodeDbContext db)
    {
        codeDbContext=db;
    }
    public async Task<ServiceResult> AddAsync(ProjectData data)
    {
        var project=new DbProject{Name=data.name, Description=data.description};
        codeDbContext.Projects.Add(project);
        await codeDbContext.SaveChangesAsync();
        return ServiceResult.Success();
    }
    /*public async Task<Project[]> LoadAsync()
    {
        var projects=codeDbContext.Projects.ToList();
        
    }*/
}