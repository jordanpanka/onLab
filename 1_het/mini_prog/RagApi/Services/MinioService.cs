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

    public async Task UploadAsync(int userId,List<IFormFile> files,List<string> paths,int projectId, int invId)
    {
        for(int i = 0; i<files.Count; i++)
        {
            var f=files[i];
            var path=paths[i];

            var objectName =
                $"users/{userId}/investigations/{invId}/projects/{projectId}/original/{path}";

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