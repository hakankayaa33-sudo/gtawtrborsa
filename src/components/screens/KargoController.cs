using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GoPostalApi.Data;
using GoPostalApi.Models;
using GoPostalApi.Attributes;

namespace GoPostalApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [ApiKey]
    public class KargoController : ControllerBase
    {
        private readonly AppDbContext _context;

        public KargoController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetKargolar()
        {
            var kargolar = await _context.Kargolar.OrderByDescending(k => k.Tarih).ToListAsync();
            return Ok(kargolar);
        }

        [HttpPost]
        public async Task<IActionResult> CreateKargo([FromBody] Kargo kargo)
        {
            kargo.Tarih = DateTime.UtcNow; // Tarihi sunucu zamanına göre otomatik damgala
            _context.Kargolar.Add(kargo);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Kargo veritabanına başarıyla kaydedildi.", data = kargo });
        }

        [HttpPut("{id}/durum")]
        public async Task<IActionResult> UpdateKargoDurum(int id, [FromBody] DurumUpdateDto request)
        {
            var kargo = await _context.Kargolar.FindAsync(id);
            if (kargo == null) return NotFound(new { success = false, message = "Kargo bulunamadı." });

            kargo.Durum = request.YeniDurum;
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Kargo durumu güncellendi.", data = kargo });
        }

        [HttpPut("kod/{kargoKod}/durum")]
        public async Task<IActionResult> UpdateKargoDurumByKod(string kargoKod, [FromBody] DurumUpdateDto request)
        {
            var kargo = await _context.Kargolar.FirstOrDefaultAsync(k => k.KargoKod == kargoKod);
            if (kargo == null) return NotFound(new { success = false, message = "Kargo bulunamadı." });

            kargo.Durum = request.YeniDurum;
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Kargo durumu güncellendi.", data = kargo });
        }
    }

    public class DurumUpdateDto
    {
        public string? YeniDurum { get; set; }
    }
}