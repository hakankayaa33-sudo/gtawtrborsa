using GoPostalMVC.Models;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Servisleri ekliyoruz (In-Memory Veritabanı)
builder.Services.AddControllersWithViews();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseInMemoryDatabase("GoPostalDb"));

var app = builder.Build();

// Veritabanına Test Verileri (Seed Data) Ekliyoruz
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (!context.Kargolar.Any())
    {
        context.Kargolar.Add(new Kargo { TakipNo = "GP-1001", MusteriAd = "Trevor Philips", Icerik = "Özel Kutu", Durum = "Yolda" });
        context.Kargolar.Add(new Kargo { TakipNo = "GP-1002", MusteriAd = "Michael De Santa", Icerik = "Evrak Çantası", Durum = "İşlemde" });
        context.Kargolar.Add(new Kargo { TakipNo = "GP-1003", MusteriAd = "Franklin Clinton", Icerik = "Otomobil Parçası", Durum = "Teslim Edildi" });
        context.SaveChanges();
    }
}

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
}

app.UseStaticFiles();
app.UseRouting();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();