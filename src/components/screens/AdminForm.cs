using System;
using System.Data;
using System.Data.SQLite;
using System.Windows.Forms;

public partial class AdminForm : Form
{
    public AdminForm()
    {
        InitializeComponent();
        LoadCustomers();
        LoadCargos();
    }

    // Müşterileri ComboBox'a yükler
    private void LoadCustomers()
    {
        using (var conn = new SQLiteConnection(DatabaseHelper.ConnectionString))
        {
            conn.Open();
            string query = "SELECT Id, Ad || ' ' || Soyad AS TamAd FROM Kullanicilar WHERE Rol = 'Musteri'";
            using (var adapter = new SQLiteDataAdapter(query, conn))
            {
                DataTable dt = new DataTable();
                adapter.Fill(dt);
                cmbMusteriler.DisplayMember = "TamAd";
                cmbMusteriler.ValueMember = "Id";
                cmbMusteriler.DataSource = dt;
            }
        }
    }

    // Modern DGV içine tüm kargoları yükler
    private void LoadCargos()
    {
        using (var conn = new SQLiteConnection(DatabaseHelper.ConnectionString))
        {
            conn.Open();
            string query = @"SELECT k.TakipNo, k.KargoAdi, u.Ad || ' ' || u.Soyad AS Musteri, k.Durum 
                             FROM Kargolar k 
                             JOIN Kullanicilar u ON k.KullaniciId = u.Id";
            using (var adapter = new SQLiteDataAdapter(query, conn))
            {
                DataTable dt = new DataTable();
                adapter.Fill(dt);
                dgvKargolar.DataSource = dt;
            }
        }
    }

    private void btnMusteriEkle_Click(object sender, EventArgs e)
    {
        using (var conn = new SQLiteConnection(DatabaseHelper.ConnectionString))
        {
            conn.Open();
            string query = "INSERT INTO Kullanicilar (Ad, Soyad, Rol) VALUES (@ad, @soyad, 'Musteri')";
            using (var cmd = new SQLiteCommand(query, conn))
            {
                cmd.Parameters.AddWithValue("@ad", txtMusteriAd.Text);
                cmd.Parameters.AddWithValue("@soyad", txtMusteriSoyad.Text);
                cmd.ExecuteNonQuery();
            }
        }
        MessageBox.Show("Müşteri zarif bir şekilde sisteme eklendi.", "Başarılı", MessageBoxButtons.OK, MessageBoxIcon.Information);
        LoadCustomers(); // Combobox'ı güncelle
        txtMusteriAd.Clear(); txtMusteriSoyad.Clear();
    }

    private void btnKargoEkle_Click(object sender, EventArgs e)
    {
        if (cmbMusteriler.SelectedValue == null) return;

        using (var conn = new SQLiteConnection(DatabaseHelper.ConnectionString))
        {
            conn.Open();
            string query = "INSERT INTO Kargolar (KullaniciId, KargoAdi, TakipNo, Durum) VALUES (@kid, @kargo, @takip, @durum)";
            using (var cmd = new SQLiteCommand(query, conn))
            {
                cmd.Parameters.AddWithValue("@kid", cmbMusteriler.SelectedValue);
                cmd.Parameters.AddWithValue("@kargo", txtKargoAdi.Text);
                cmd.Parameters.AddWithValue("@takip", txtTakipNo.Text);
                cmd.Parameters.AddWithValue("@durum", cmbDurum.Text);
                cmd.ExecuteNonQuery();
            }
        }
        LoadCargos(); // Tabloyu anında güncelle
        txtKargoAdi.Clear(); txtTakipNo.Clear();
    }

    private void AdminForm_FormClosed(object sender, FormClosedEventArgs e) => Application.Exit();
}