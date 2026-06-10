'use client';
import React from 'react';

export default function Navbar({ currentUser, activeScreen, onNavigate, onLogout, toggleTheme }) {
  return (
    <div className="top-nav" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', background: 'rgba(13,20,30,0.8)', backdropFilter: 'blur(10px)' }}>
      <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: 32, height: 32, background: 'var(--gp-red)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>
        </div>
        <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>GoPostal<span style={{ color: 'var(--gp-red)' }}>.</span></span>
      </div>

      {currentUser && (
        <span className="user-info-text">Müşteri: @{currentUser}</span>
      )}
      <button className="nav-btn" onClick={toggleTheme}>TEMA</button>
      
      {currentUser && (
        <>
          <button 
            className={`nav-btn ${activeScreen === 'shipments' ? 'active' : ''}`}
            onClick={() => onNavigate('shipments')}
          >
            GÖNDERİLERİM
          </button>
          {/* Diğer butonlar benzer şekilde eklenir */}
        </>
      )}
      
      <button className="nav-btn" onClick={() => onNavigate('dashboard')}>
        TAKİP MERKEZİ
      </button>
      
      {!currentUser ? (
        <button className="nav-btn">ÜYE GİRİŞİ / KAYIT</button>
      ) : (
        <button className="nav-btn" onClick={onLogout}>ÇIKIŞ YAP</button>
      )}
    </div>
  );
}