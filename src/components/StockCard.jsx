'use client';

export default function ShipmentCard({ shipment, onClick }) {
  const { trackingNo, status, receiver, origin, destination } = shipment || {};

  return (
    <div className="shipment-card" onClick={onClick} style={{ 
      cursor: 'pointer', 
      border: '1px solid var(--border)', 
      borderRadius: '16px', 
      padding: '20px', 
      backgroundColor: 'var(--card)', 
      borderTop: '4px solid var(--gp-blue)' 
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: 'var(--gp-red)', fontFamily: 'monospace', fontSize: '1rem' }}>{trackingNo}</h3>
        <div className={`status-chip ${status}`} style={{
          backgroundColor: status === 'delivered' ? 'rgba(74,222,128,0.1)' : 'rgba(192,132,252,0.1)',
          color: status === 'delivered' ? '#4ade80' : '#c084fc',
          borderColor: status === 'delivered' ? 'rgba(74,222,128,0.3)' : 'rgba(192,132,252,0.3)'
        }}>
          {status === 'delivered' ? '✅ Teslim Edildi' : '🚛 Yolda'}
        </div>
      </div>
      <p style={{ color: 'var(--muted-fg)', fontSize: '0.85rem', margin: '12px 0 4px 0' }}>Alıcı: <span style={{ color: 'var(--fg)' }}>{receiver}</span></p>
      <h4 style={{ margin: '8px 0 0 0', fontSize: '1rem', fontWeight: 600 }}>{origin} ➔ {destination}</h4>
    </div>
  );
}