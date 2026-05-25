using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoPostalMVC.Models
{
    public class Shipment
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string TrackingNumber { get; set; }

        [Required]
        public string SenderName { get; set; }

        [Required]
        public string ReceiverName { get; set; }

        [Required]
        public string Origin { get; set; }

        [Required]
        public string Destination { get; set; }

        public double Weight { get; set; }

        public string Status { get; set; } // Örn: "Hazırlanıyor", "Şubede", "Dağıtımda"

        public int? CourierId { get; set; }
        [ForeignKey("CourierId")]
        public Courier Courier { get; set; }

        // Bire-Çok İlişki: Bir gönderinin birden fazla takip hareketi olabilir.
        public ICollection<TrackingEvent> TrackingEvents { get; set; } = new List<TrackingEvent>();
    }
}