using System;
using System.ComponentModel.DataAnnotations;

namespace GoPostalMVC.Models
{
    public class Kargo
    {
        [Key]
        public int Id { get; set; }
        [Required]
        public string TakipNo { get; set; }
        [Required]
        public string MusteriAd { get; set; }
        public string Icerik { get; set; }
        public string Durum { get; set; } // Örn: İşlemde, Yolda, Teslim Edildi
        public DateTime OlusturulmaTarihi { get; set; } = DateTime.Now;
    }
}