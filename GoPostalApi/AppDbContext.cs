using Microsoft.EntityFrameworkCore;
using GoPostalApi.Models;

namespace GoPostalApi.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Kargo> Kargolar { get; set; }
    }
}