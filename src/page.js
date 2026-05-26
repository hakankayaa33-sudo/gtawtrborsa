'use client';
import { useState } from 'react';
import Navbar from '../src/components/Navbar';
import Sidebar from '../src/components/Sidebar';
import Footer from '../src/components/Footer';
import ShipmentCard from '../src/components/StockCard';

export default function Home() {
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const [currentUser] = useState('Daniel');
  const [searchResult, setSearchResult] = useState(null);
  const [trackQuery, setTrackQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const handleLogout = () => console.log("Çıkış yapıldı");

  const shipments = [
    { 
      id: 1, 
      trackingNo: 'GP-1001', 
      status: 'out_for_delivery', 
      receiver: 'Michael De Santa', 
      sender: 'Teknosa A.Ş.',
      origin: 'Vinewood', 
      destination: 'Paleto Bay',
      estimatedDelivery: '26 Mayıs 2026',
      weight: '2.4 kg',
      events: [
        { status: 'out_for_delivery', location: 'Paleto Bay Şubesi', desc: 'Kurye teslimat için yola çıktı.', time: '2023-10-27 09:00' },
        { status: 'transit', location: 'LS Ana Depo', desc: 'Kargo ana depodan ayrıldı.', time: '2023-10-26 14:30' }
      ]
    }
  ];

  const handleNavigation = (screen) => {
    setActiveScreen(screen);
    setSearchResult(null);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (isSearching) return;
    if (!trackQuery) return;
    setIsSearching(true);
    setTimeout(() => {
      const result = shipments.find(s => s.trackingNo.toUpperCase() === trackQuery.toUpperCase());
      setSearchResult(result || 'error');
      setIsSearching(false);
    }, 700);
  };

  return (
    <div className="main-layout" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: 'var(--bg)' }}>
      <Navbar 
        currentUser={currentUser} 
        activeScreen={activeScreen} 
        onNavigate={handleNavigation} 
        onLogout={handleLogout}
        toggleTheme={toggleTheme}
      />
      
      <main className="main-content" style={{ flex: 1 }}>
        {!searchResult && activeScreen === 'dashboard' && (
          <section style={{ padding: '2rem 1.5rem' }}>
            <div className="badge">
              <span className="badge-dot"></span>
              Gerçek Zamanlı Takip
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>
              Kargonuzu <span style={{ color: 'var(--gp-red)' }}>takip edin</span>
            </h1>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
              <input 
                type="text" 
                className="search-input" 
                placeholder="Takip No (örn: GP-1001)" 
                value={trackQuery}
                onChange={(e) => setTrackQuery(e.target.value)}
              />
              <button type="submit" className="btn-gp-search" disabled={isSearching}>
                {isSearching ? 'Sorgulanıyor...' : 'Sorgula'}
              </button>
            </form>
          </section>
        )}
        {searchResult && searchResult !== 'error' && (
          <div style={{ padding: '20px' }}>
            <ShipmentCard shipment={searchResult} />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}