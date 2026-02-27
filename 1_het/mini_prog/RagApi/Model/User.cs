public class User
{
    public int ID {get; set;}
    public string Email {get; set;}
    public byte[] PasswordHash {get; set;}
    public byte[] Passwordsalt {get; set;}
    public DateTime CreatedTime {get; set;}
}