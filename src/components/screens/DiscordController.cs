using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Text;

namespace DiscordApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DiscordController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;

        public DiscordController(IConfiguration configuration, HttpClient httpClient)
        {
            _configuration = configuration;
            _httpClient = httpClient;
        }

        [HttpPost("notify-admin")]
        public async Task<IActionResult> NotifyAdmin([FromBody] NotificationRequest request)
        {
            var webhookUrl = _configuration["Discord:WebhookUrl"];
            if (string.IsNullOrEmpty(webhookUrl)) return StatusCode(500, "Discord Webhook URL yapılandırılmamış.");

            var payload = new { content = $"📦 **YENİ KARGO ONAY TALEBİ**\n**Mesaj:** {request.Message}\n*Lütfen admin panelini kontrol edin.*" };
            var jsonPayload = JsonSerializer.Serialize(payload);
            var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(webhookUrl, content);
            if (response.IsSuccessStatusCode)
                return Ok(new { success = true, message = "Mesaj başarıyla iletildi." });

            return StatusCode((int)response.StatusCode, "Discord'a mesaj gönderilirken bir hata oluştu.");
        }
    }

    public class NotificationRequest
    {
        public string? Message { get; set; }
    }
}