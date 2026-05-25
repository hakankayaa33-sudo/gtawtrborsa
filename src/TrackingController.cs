using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GoPostalMVC.Models;
using System.Threading.Tasks;
using System.Linq;

namespace GoPostalMVC.Controllers
{
    public class TrackingController : Controller
    {
        private readonly AppDbContext _context;

        public TrackingController(AppDbContext context)
        {
            _context = context;
        }

        // Sadece arama kutusunu gösteren Ana Sayfa (View)
        [HttpGet]
        public IActionResult Index()
        {
            return View();
        }

        // AJAX/Fetch API ile tetiklenen JSON dönen Endpoint
        [HttpGet]
        public async Task<IActionResult> GetShipmentStatus(string trackingNumber)
        {
            if (string.IsNullOrWhiteSpace(trackingNumber))
            {
                return Json(new { success = false, message = "Lütfen geçerli bir takip numarası girin." });
            }

            // Veritabanından Gönderiyi ve ona bağlı Takip Hareketlerini (en yeniden eskiye) çekiyoruz
            var shipment = await _context.Shipments
                .Include(s => s.TrackingEvents)
                .FirstOrDefaultAsync(s => s.TrackingNumber.ToLower() == trackingNumber.ToLower());

            if (shipment == null)
            {
                return Json(new { success = false, message = "Gönderi bulunamadı, lütfen GoPostal takip numaranızı kontrol edin." });
            }

            // JSON Reference Loop hatasını önlemek ve veriyi temiz döndürmek için DTO/Anonim tip kullanıyoruz
            var resultData = new {
                shipment.TrackingNumber,
                shipment.SenderName,
                shipment.ReceiverName,
                shipment.Origin,
                shipment.Destination,
                shipment.Weight,
                Events = shipment.TrackingEvents.OrderByDescending(e => e.Timestamp).Select(e => new {
                    e.Status,
                    e.Location,
                    e.Timestamp,
                    e.Description
                })
            };

            return Json(new { success = true, data = resultData });
        }
    }
}