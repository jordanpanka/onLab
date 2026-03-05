using Azure;
using ef;
using Microsoft.AspNetCore.Mvc;
using UglyToad.PdfPig.Graphics.Colors;
[ApiController]
[Route("/api/investigations")]
public class ProjectController : ControllerBase
{
    private readonly CodeDbContext codeDbContext;
    private readonly ProjectService projectService;

    [HttpPost("add")]
    public async Task<IActionResult> AddInvestigation([FromBody] InvestigationData inv)
    {
        var response= await projectService.AddInvAsync(inv);
        if(!response.Ok) return BadRequest(response.Error);
        return Ok();
    }
    [HttpPost("projects/add")]
    public async Task<IActionResult> AddProject([FromBody] ProjectData data)
    {
        var response=await projectService.AddProjectAsync(data);
        if(!response.Ok) return BadRequest(response.Error);
        return Ok();
    }
    [HttpGet("projects/files/add")]
    public async Task<IActionResult> AddFiles([FromBody]FilesData data)
    {
        var response=await projectService.AddFilesAsync(data);
        if(!response.Ok) return BadRequest(response.Error);
        return Ok();
    }
    [HttpGet("load")]
    public async Task<IActionResult> GetInvestigations([FromBody] UserID data)
    {
        var response=await projectService.GetInvestigationsAsync(data);
        if(!response.Ok) return BadRequest(response.Error);
        return Ok(response.Data);
    }
    [HttpGet("projects/load")]
    public async Task<IActionResult> GetProjects([FromBody] InvestigationID data)
    {
        var response=await projectService.GetProjectsAsync(data);
        if(!response.Ok) return BadRequest(response.Error);
        return Ok(response.Data);
    }
    [HttpGet("projects/files/load")]
    public async Task<IActionResult> GetFiles([FromBody] ProjectID data)
    {
        var response=await projectService.GetFilesAsync(data);
        if(!response.Ok) return BadRequest(response.Error);
        return Ok(response.Data);
    }
    


}
public record FilesData(int id,int projectId);
public record ProjectData(int id,int invId, string name, string description);
public record InvestigationData(int id,int userId,string name, string description);
public record UserID(int id);
public record InvestigationID(int id);
public record ProjectID(int id);