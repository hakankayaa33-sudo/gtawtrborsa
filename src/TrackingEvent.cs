using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoPostalMVC.Models
{
    public class TrackingEvent
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int ShipmentId { get; set; }

        // Foreign Key Bağlantısı
        [ForeignKey("ShipmentId")]
        public Shipment Shipment { get; set; }

        [Required]
        public string Status { get; set; } // "Sipariş Alındı", "Yola Çıktı", "Dağıtıma Çıktı", "Teslim Edildi"

        public string Location { get; set; }

        public DateTime Timestamp { get; set; } = DateTime.Now;

        public string Description { get; set; }
    }
}