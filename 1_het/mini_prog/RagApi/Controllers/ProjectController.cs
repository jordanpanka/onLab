using Azure;
using ef;
using Microsoft.AspNetCore.Mvc;
using UglyToad.PdfPig.Graphics.Colors;
[ApiController]
[Route("/api/projects")]
public class ProjectController : ControllerBase
{
    private readonly CodeDbContext codeDbContext;
    private readonly ProjectService projectService;

    [HttpPost("add")]
    public async Task<IActionResult> Add([FromBody] ProjectData project)
    {
        var response= await projectService.AddAsync(project);
        if(!response.Ok) return BadRequest(response.Error);
        return Ok();
    }
    /*[HttpGet("load")]
    public async Task<IActionResult> Load()
    {
        var projects=await projectService.LoadAsync();
        return Ok();
    }*/

}
public record ProjectData(string name, string description);