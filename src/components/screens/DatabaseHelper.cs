using System.Data.SQLite;
using System.IO;

public class DatabaseHelper
{
    private static string dbName = "KargoTakip.db";
    public static string ConnectionString = $"Data Source={dbName};Version=3;";

    public static void InitializeDatabase()
    {
        if (!File.Exists(dbName))
        {
            SQLiteConnection.CreateFile(dbName);
            using (var conn = new SQLiteConnection(ConnectionString))
            {
                conn.Open();
                
                // Kullanıcılar Tablosu (Admin ve Müşteriler)
                string createUsers = @"
                    CREATE TABLE Kullanicilar (
                        Id INTEGER PRIMARY KEY AUTOINCREMENT,
                        Ad TEXT NOT NULL,
                        Soyad TEXT NOT NULL,
                        Rol TEXT NOT NULL
                    )";
                
                // Kargolar Tablosu
                string createCargos = @"
                    CREATE TABLE Kargolar (
                        Id INTEGER PRIMARY KEY AUTOINCREMENT,
                        KullaniciId INTEGER,
                        KargoAdi TEXT NOT NULL,
                        TakipNo TEXT NOT NULL,
                        Durum TEXT NOT NULL,
                        FOREIGN KEY(KullaniciId) REFERENCES Kullanicilar(Id)
                    )";

                new SQLiteCommand(createUsers, conn).ExecuteNonQuery();
                new SQLiteCommand(createCargos, conn).ExecuteNonQuery();

                // Varsayılan Admini Ekle
                string insertAdmin = "INSERT INTO Kullanicilar (Ad, Soyad, Rol) VALUES ('admin', 'admin', 'Admin')";
                new SQLiteCommand(insertAdmin, conn).ExecuteNonQuery();
            }
        }
    }
}