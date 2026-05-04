public interface IAzureBlobService
{
    Task<string> UploadFileAsync(Stream fileStream, string fileName, string contentType, string category, string userId);
}