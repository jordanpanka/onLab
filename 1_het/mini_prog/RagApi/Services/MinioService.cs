using Minio;
using Minio.DataModel.Args;

public class MinioService
{
    private readonly IMinioClient _minio;
    private const string Bucket = "ragappdata";

    public MinioService(IMinioClient minio)
    {
        _minio = minio;
    }

    public async Task UploadAsync(int userId,List<IFormFile> files, Ids data)
    {
        foreach(var f in files)
        {
            // egyedi név
            var fileName = $"{Guid.NewGuid()}_{f.FileName}";

            var objectName =
                $"users/{userId}/investigations/{data.invId}/projects/{data.projectId}/original/{fileName}";

            using var stream = f.OpenReadStream();

            await _minio.PutObjectAsync(
                new PutObjectArgs()
                    .WithBucket(Bucket)
                    .WithObject(objectName)
                    .WithStreamData(stream)
                    .WithObjectSize(f.Length)
                    .WithContentType(f.ContentType)
            );
        }
        
    }
}