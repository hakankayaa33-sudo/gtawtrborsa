export default function Footer() {
  return (
    <footer className="main-footer" style={{ 
      padding: '20px', 
      textAlign: 'center', 
      borderTop: '1px solid #ddd',
      fontSize: '0.8rem',
      color: '#888'
    }}>
      <p>&copy; {new Date().getFullYear()} GoPostal Lojistik - Voxverse Systems. Tüm hakları saklıdır.</p>
    </footer>
  );
}