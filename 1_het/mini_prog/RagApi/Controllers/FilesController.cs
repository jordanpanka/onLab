using Azure;
using ef;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UglyToad.PdfPig.Graphics.Colors;
[ApiController]
[Route("/api/investigations/projects/files")]
public class FilesController : ControllerBase
{
    private readonly FileService filesService;

    public FilesController(FileService fs)
    {
        filesService=fs;
    }
    [Authorize]
    [HttpPost("upload")]
    public async Task<IActionResult> UploadFile(ProjectID projid, [FromForm] List<IFormFile> files,
    [FromForm] List<string> paths)
    {   
        var uidClaim = User.FindFirst("uid")?.Value;
        if (uidClaim == null) return Unauthorized();

        var response=await filesService.UploadAsync(projid,files,paths);
        if(!response.Ok) return BadRequest();
        return Ok();
        
    }
}