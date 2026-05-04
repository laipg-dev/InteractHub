using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using InteractHub.Core.Interfaces;
using InteractHub.Core.Options;
using Microsoft.Extensions.Options;

public class AzureBlobService : IAzureBlobService
{
    private readonly AzureBlobOptions _options;

    public AzureBlobService(IOptions<AzureBlobOptions> options)
    {
        _options = options.Value;
    }

    public async Task<string> UploadFileAsync(
        Stream fileStream,
        string fileName,
        string contentType,
        string category,
        string userId)
    {
        if (string.IsNullOrWhiteSpace(category))
            throw new ArgumentException("Category không được để trống.");

        var allowedContainers = new[] { "avatars", "posts", "stories" };

        var containerName = category.ToLower();

        if (!allowedContainers.Contains(containerName))
            throw new ArgumentException("Container không hợp lệ.");

        var containerClient = new BlobContainerClient(
            _options.ConnectionString,
            containerName
        );

        await containerClient.CreateIfNotExistsAsync();

        var extension = Path.GetExtension(fileName);
        var blobName = $"{userId}/{Guid.NewGuid()}{extension}";

        var blobClient = containerClient.GetBlobClient(blobName);

        var headers = new BlobHttpHeaders
        {
            ContentType = contentType
        };

        await blobClient.UploadAsync(fileStream, new BlobUploadOptions
        {
            HttpHeaders = headers
        });

        return blobClient.Uri.ToString();
    }
}