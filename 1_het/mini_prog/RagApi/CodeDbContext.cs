using Microsoft.EntityFrameworkCore;
namespace ef;
public class CodeDbContext : DbContext
{
    public CodeDbContext(DbContextOptions<CodeDbContext> options)
        : base(options)
    {
    }
    public DbSet<DbUser> Users {get; set;}
    public DbSet<DbProject> Projects {get; set;}
}