using GoPostalMVC.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System.Linq;

namespace GoPostalMVC.Controllers
{
    public class HomeController : Controller
    {
        private readonly AppDbContext _context;

        public HomeController(AppDbContext context)
        {
            _context = context;
        }

        // Ana Sayfa View'ını döndürür
        public IActionResult Index()
        {
            return View();
        }

        // AJAX ile çalışan arama metodu (API)
        [HttpPost]
        public async Task<IActionResult> TakipEt([FromBody] TakipIstegi istek)
        {
            if (string.IsNullOrWhiteSpace(istek.Sorgu))
                return Json(new { basarili = false, mesaj = "Lütfen bir sorgu değeri girin." });

            Kargo kargo = null;
            string lowerSorgu = istek.Sorgu.ToLower();

            if (istek.Tip == "takipNo")
            {
                kargo = await _context.Kargolar.FirstOrDefaultAsync(k => k.TakipNo.ToLower() == lowerSorgu);
            }
            else
            {
                // İsime göre arama (Aynı kişiye ait birden fazla varsa en sonuncuyu getir)
                kargo = await _context.Kargolar.OrderByDescending(k => k.Id).FirstOrDefaultAsync(k => k.MusteriAd.ToLower() == lowerSorgu);
            }

            if (kargo != null) return Json(new { basarili = true, data = kargo });
            return Json(new { basarili = false, mesaj = "Sistemimizde eşleşen bir gönderi bulunamadı." });
        }
    }

    public class TakipIstegi
    {
        public string Tip { get; set; }
        public string Sorgu { get; set; }
    }
}