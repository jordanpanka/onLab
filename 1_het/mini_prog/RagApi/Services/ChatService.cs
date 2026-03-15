using ef;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
public class ChatService
{
    private readonly CodeDbContext db;
    public ChatService(CodeDbContext cdb)
    {
        db=cdb;
    }
    public async  Task<ServiceResult> AddConversationAsync(ConversationData data){

        var exist= await db.Projects.AnyAsync(x=> x.ID==data.projectId);
        if(!exist) return ServiceResult.Fail("Project doesn't exist");

        var conversation=new DbConversation
        {
            Title=data.title,
            ProjectID=data.projectId,
            CreatedAtUtc=DateTime.UtcNow,
            UpdatedAtUtc=DateTime.UtcNow
        };
        db.Conversations.Add(conversation);
        await db.SaveChangesAsync();
        return ServiceResult.Success();
        //Id return????????????????????????????????,
        return ServiceResult.Success();

    }
    public async Task<ServiceResult> LoadConversationsAsync(ProjectID id)
    {
        var exist=await db.Projects.AnyAsync(x=> x.ID==id.id);
        if(!exist) return ServiceResult.Fail("Project doesn't exist");

        var conv= await db.Conversations
        .Where(c=>c.ProjectID==id.id)
        .Include(c=> c.Messages)
        .Select(x=>new Conversation
        {
            ID=x.ID,
            Title=x.Title,
            CreatedAtUtc=x.CreatedAtUtc,
            UpdatedAtUtc=x.UpdatedAtUtc,
            Messages = x.Messages
            .Select(m => new Message
            {
                ID = m.ID,
                Role = m.Role,
                Content = m.Content,
                CreatedAtUtc = m.CreatedAtUtc
            })
            .ToList()
        }).ToListAsync();

        return ServiceResult.Success(conv);
        /////nem jó az include még
        
    }


}