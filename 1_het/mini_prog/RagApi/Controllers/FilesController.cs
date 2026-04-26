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
     private readonly MinioService minioService;

    public FilesController(FileService fs, MinioService ms)
    {
        filesService=fs;
        minioService=ms;
    }
    [Authorize]
    [HttpPost("upload")]
    public async Task<IActionResult> UploadFile( [FromForm] List<IFormFile> files,
    [FromForm] List<string> paths,  [FromForm] int invId,[FromForm] int projectId)
    {   
        var uidClaim = User.FindFirst("uid")?.Value;
        if (uidClaim == null) return Unauthorized();

        var response=await filesService.UploadAsync(projectId,files,paths);
        if(!response.Ok) return BadRequest();

        //response??? minden ok?
        await minioService.UploadAsync(int.Parse(uidClaim),files,paths,projectId, invId);

        var result = await filesService.UploadQdrantPythonAsync(int.Parse(uidClaim), files,paths, projectId, invId);
        if (!result.Ok) return BadRequest(result.Error);

        /*var result=await filesService.UploadQdrantAsync(int.Parse(uidClaim),files,idData);
        if(!result.Ok) return BadRequest();*/
        return Ok();
        
    }

}
public record Ids( int invId, int projectId); 