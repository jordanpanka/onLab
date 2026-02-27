
using System.Security.Cryptography;
using ef;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
public class ServiceResult
{
    public bool Ok {get; set;}
    public string? Error {get; set;}

    public static ServiceResult Success()
    =>new ServiceResult{Ok=true};

    public static ServiceResult Fail(string error)
    =>new ServiceResult{Ok=false, Error=error};
}
public class AuthService
{
    private readonly CodeDbContext db;
    public AuthService(CodeDbContext cdb)
    {
        db = cdb;
    }
    public async Task<ServiceResult>RegisterAsync(RegisterData data)
    {
        var email = data.email.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(data.password) || data.password.Length < 6)
            return ServiceResult.Fail("A jelszó nem felel meg a követelményeknek");

        var exist = await db.Users.AnyAsync(x => x.Email == email);
        if (exist) 
            return ServiceResult.Fail("Már létezik ez az email cím");

        var (salt, hash) = HashPassword(data.password);
        var user = new DbUser{ Email = email, PasswordHash = hash, Passwordsalt = salt, CreatedTime = DateTime.UtcNow };

        db.Users.Add(user);
        await db.SaveChangesAsync();
        return ServiceResult.Success();
    }
    public (byte[] hash, byte[] salt) HashPassword(string pass)
    {
        var salt=RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(
            pass,
            salt,
            100_000,
            HashAlgorithmName.SHA256,
            32);

        return(salt,hash);
        
    }
}