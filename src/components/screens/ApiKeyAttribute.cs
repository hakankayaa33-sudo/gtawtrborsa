using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace GoPostalApi.Attributes
{
    [AttributeUsage(validOn: AttributeTargets.Class | AttributeTargets.Method)]
    public class ApiKeyAttribute : Attribute, IAsyncActionFilter
    {
        private const string APIKEYNAME = "X-API-KEY";
        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            if (!context.HttpContext.Request.Headers.TryGetValue(APIKEYNAME, out var extractedApiKey))
            {
                context.Result = new ContentResult() { StatusCode = 401, Content = "API Anahtarı bulunamadı." };
                return;
            }

            var appSettings = context.HttpContext.RequestServices.GetRequiredService<IConfiguration>();
            var apiKey = appSettings?.GetValue<string>("ApiKey");

            if (apiKey == null || !apiKey.Equals(extractedApiKey.ToString()))
            {
                context.Result = new ContentResult() { StatusCode = 403, Content = "Geçersiz API Anahtarı." };
                return;
            }
            await next();
        }
    }
}