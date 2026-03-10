using System.Collections.Generic;
using System.Threading.Tasks;
using Azure;
using ef;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
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
    public async Task<IActionResult> UploadFile([FromForm] int projectId, [FromForm] List<IFormFile> files,
    [FromForm] List<string> paths)
    {   
        var uidClaim = User.FindFirst("uid")?.Value;
        if (uidClaim == null) return Unauthorized();

        var response=await filesService.UploadAsync(projectId,files,paths);
        if(!response.Ok) return BadRequest();
        return Ok();
        
    }
}