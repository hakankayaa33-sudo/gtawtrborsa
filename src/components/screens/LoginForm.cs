using System;
using System.Data.SQLite;
using System.Drawing;
using System.Windows.Forms;

public partial class LoginForm : Form
{
    public LoginForm()
    {
        InitializeComponent();
    }

    private void btnGiris_Click(object sender, EventArgs e)
    {
        string ad = txtAd.Text.Trim();
        string soyad = txtSoyad.Text.Trim();

        using (var conn = new SQLiteConnection(DatabaseHelper.ConnectionString))
        {
            conn.Open();
            string query = "SELECT Id, Rol FROM Kullanicilar WHERE Ad = @ad AND Soyad = @soyad";
            using (var cmd = new SQLiteCommand(query, conn))
            {
                cmd.Parameters.AddWithValue("@ad", ad);
                cmd.Parameters.AddWithValue("@soyad", soyad);
                
                using (var reader = cmd.ExecuteReader())
                {
                    if (reader.Read())
                    {
                        int id = Convert.ToInt32(reader["Id"]);
                        string rol = reader["Rol"].ToString();

                        if (rol == "Admin")
                        {
                            AdminForm adminForm = new AdminForm();
                            adminForm.Show();
                        }
                        else
                        {
                            CustomerForm customerForm = new CustomerForm(id, ad);
                            customerForm.Show();
                        }
                        this.Hide();
                    }
                    else
                    {
                        lblUyari.Text = "Kullanıcı bulunamadı!";
                        lblUyari.ForeColor = Color.IndianRed;
                    }
                }
            }
        }
    }
}