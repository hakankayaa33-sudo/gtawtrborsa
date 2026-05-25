using Microsoft.EntityFrameworkCore;
using GoPostalApi.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Entity Framework Core - SQL Server Bağlantısı
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// CORS Politikası Ekleme (Vue.js frontend'in API'den veri çekebilmesi için izni açıyoruz)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseCors("AllowAll"); // Middleware'i tetikliyoruz
app.UseAuthorization();
app.MapControllers();
app.Run("http://localhost:5000");