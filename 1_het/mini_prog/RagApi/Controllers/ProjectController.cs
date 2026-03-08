using Azure;
using ef;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UglyToad.PdfPig.Graphics.Colors;
[ApiController]
[Route("/api/investigations")]
public class ProjectController : ControllerBase
{
    //private readonly CodeDbContext codeDbContext;
    private readonly ProjectService projectService;
    public ProjectController(ProjectService ps)
    {
        projectService=ps;
    }
    [Authorize]
    [HttpPost("add")]
    public async Task<IActionResult> AddInvestigation([FromBody] InvestigationData inv)
    {
        var userId = int.Parse(User.FindFirst("uid")!.Value);
        var response = await projectService.AddInvAsync(userId, inv);
        if (!response.Ok) return BadRequest(response.Error);
        return Ok();
    }
    [Authorize]
    [HttpPost("projects/add")]
    public async Task<IActionResult> AddProject([FromBody] ProjectData data)
    {
        var response = await projectService.AddProjectAsync(data);
        if (!response.Ok) return BadRequest(response.Error);
        return Ok();
    }
    [Authorize]
    [HttpGet("projects/files/add")]
    public async Task<IActionResult> AddFiles([FromBody] FilesData data)
    {
        var response = await projectService.AddFilesAsync(data);
        if (!response.Ok) return BadRequest(response.Error);
        return Ok();
    }
    [Authorize]
    [HttpGet("load")]
    public async Task<IActionResult> GetInvestigations()
    {
        var uidClaim = User.FindFirst("uid");
        if (uidClaim == null) return Unauthorized("Missing uid claim");

        var userId = int.Parse(uidClaim.Value);

        var response = await projectService.GetInvestigationsAsync(userId);
        if (!response.Ok) return BadRequest(response.Error);
        return Ok(response.Data);
    }
    [Authorize]
    [HttpGet("projects/load")]
    public async Task<IActionResult> GetProjects([FromBody] InvestigationID data)
    {
        var uidClaim = User.FindFirst("uid");
        if (uidClaim == null) return Unauthorized("Missing uid claim");
        var response = await projectService.GetProjectsAsync(data);
        if (!response.Ok) return BadRequest(response.Error);
        return Ok(response.Data);
    }
    [Authorize]
    [HttpGet("projects/files/load")]
    public async Task<IActionResult> GetFiles([FromBody] ProjectID data)
    {
        var response = await projectService.GetFilesAsync(data);
        if (!response.Ok) return BadRequest(response.Error);
        return Ok(response.Data);
    }



}
public record FilesData(int id, int projectId);
public record ProjectData(int invid, string name, string description);
public record InvestigationData(string name, string description);
public record UserID(int id);
public record InvestigationID(int id);
public record ProjectID(int id);