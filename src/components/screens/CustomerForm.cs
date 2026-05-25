using System;
using System.Data;
using System.Data.SQLite;
using System.Windows.Forms;

public partial class CustomerForm : Form
{
    private int musteriId;

    // Form açılırken Login'den ID ve Adı alıyoruz.
    public CustomerForm(int id, string ad)
    {
        InitializeComponent();
        musteriId = id;
        lblHosgeldin.Text = $"Hoşgeldiniz, {ad}. Güncel kargo durumunuzu aşağıdan takip edebilirsiniz.";
        dgvMusteriKargo.Visible = false; // Başlangıçta gizli
    }

    // Şık "Kargolarım" butonuna tıklanınca çalışır
    private void btnKargolarim_Click(object sender, EventArgs e)
    {
        using (var conn = new SQLiteConnection(DatabaseHelper.ConnectionString))
        {
            conn.Open();
            string query = "SELECT KargoAdi, TakipNo, Durum FROM Kargolar WHERE KullaniciId = @kid";
            using (var adapter = new SQLiteDataAdapter(query, conn))
            {
                // Parametreyi adaptöre manuel ekleme
                adapter.SelectCommand.Parameters.AddWithValue("@kid", musteriId);
                DataTable dt = new DataTable();
                adapter.Fill(dt);
                
                dgvMusteriKargo.DataSource = dt;
                dgvMusteriKargo.Visible = true; // Animasyonlu bir his vermek için sonradan gösteriyoruz.
            }
        }
    }

    private void CustomerForm_FormClosed(object sender, FormClosedEventArgs e) => Application.Exit();
}