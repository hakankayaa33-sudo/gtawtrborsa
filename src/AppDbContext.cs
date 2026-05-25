using Microsoft.EntityFrameworkCore;

namespace GoPostalMVC.Models
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }
        
        public DbSet<Kargo> Kargolar { get; set; }
        public DbSet<Shipment> Shipments { get; set; }
        public DbSet<TrackingEvent> TrackingEvents { get; set; }
    }
}