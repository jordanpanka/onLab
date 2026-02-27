using Microsoft.EntityFrameworkCore;
namespace ef;
public class CodeDbContext : DbContext
{
    public CodeDbContext(DbContextOptions<CodeDbContext> options)
        : base(options)
    {
    }
    public DbSet<DbUser> Users {get; set;}
}