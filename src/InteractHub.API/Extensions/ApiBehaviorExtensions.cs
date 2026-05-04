using Microsoft.AspNetCore.Mvc;

namespace InteractHub.API.Extensions;

public static class ApiBehaviorExtensions
{
    public static IMvcBuilder ConfigureCustomApiBehavior(this IMvcBuilder builder)
    {
        builder.ConfigureApiBehaviorOptions(options =>
        {
            options.InvalidModelStateResponseFactory = context =>
            {
                var errors = context.ModelState
                    .Where(kvp => kvp.Value?.Errors.Count > 0)
                    .ToDictionary(
                        kvp => kvp.Key,
                        kvp => kvp.Value!.Errors.Select(e => e.ErrorMessage).ToArray());

                var responseObj = new
                {
                    Message = "Validation failed",
                    Errors = errors
                };

                return new BadRequestObjectResult(responseObj);
            };
        });

        return builder;
    }
}
