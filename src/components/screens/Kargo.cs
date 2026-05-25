using System;

namespace GoPostalApi.Models
{
    public class Kargo
    {
        public int Id { get; set; }
        public string? DiscordUser { get; set; }
        public string? KargoKod { get; set; }
        public string? Durum { get; set; }
        public DateTime? Tarih { get; set; }
    }
}