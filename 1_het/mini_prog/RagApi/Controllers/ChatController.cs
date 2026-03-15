using ef;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Drawing;
[ApiController]
[Route("/api/chat")]
public class ChatController : ControllerBase
{
    private readonly ChatService chatService;

    public ChatController(ChatService cservice)
    {
        chatService=cservice;
    }

    [Authorize]
    [HttpPost("conversations/add")]
    public async Task<IActionResult> AddConversation([FromBody]ConversationData data)
    {
        var uidClaim = User.FindFirst("uid")?.Value;
        if (uidClaim == null) return Unauthorized();

        var result=await chatService.AddConversationAsync(data);
        if(!result.Ok)return BadRequest();
        return Ok();
    }

    [Authorize]
    [HttpPost("conversations/load")]
    public async Task<IActionResult> LoadConversations([FromBody]ProjectID projectId)
    {
        var uidClaim = User.FindFirst("uid")?.Value;
        if (uidClaim == null) return Unauthorized();

        var result=await chatService.LoadConversationsAsync(projectId);
        if(!result.Ok) return BadRequest();
       // Console.WriteLine(result.Data == null ? "NULL" : result.Data.ToString());
        return Ok(result.Data);

    }


}
public record ConversationData(int projectId, string title);