'use client';

export default function Sidebar({ activeScreen, onNavigate }) {
  const menuItems = [
    { id: 'dashboard', label: 'Kargo Takip', icon: '📦' },
    { id: 'shipments', label: 'Gönderilerim', icon: '🚚' },
    { id: 'addresses', label: 'Adres Defteri', icon: '🏠' },
    { id: 'support', label: 'Destek Talebi', icon: '🎧' },
  ];

  return (
    <aside className="sidebar" style={{ width: '100%', backgroundColor: '#f8f9fa', borderBottom: '1px solid #ddd', padding: '10px' }}>
      <nav>
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', overflowX: 'auto', gap: '5px' }}>
          {menuItems.map((item) => (
            <li 
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{ 
                padding: '8px 15px', 
                cursor: 'pointer',
                backgroundColor: activeScreen === item.id ? '#e9ecef' : 'transparent',
                borderRadius: '8px',
                fontWeight: activeScreen === item.id ? 'bold' : 'normal',
                whiteSpace: 'nowrap'
              }}
            >
              <span style={{ marginRight: '10px' }}>{item.icon}</span>
              {item.label}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}