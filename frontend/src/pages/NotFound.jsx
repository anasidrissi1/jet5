import React from 'react';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '6rem', margin: 0, color: '#ccc' }}>404</h1>
        <p style={{ fontSize: '1.2rem', color: '#888' }}>Page introuvable</p>
        <a href="/" style={{ color: '#D4A900', textDecoration: 'none' }}>Retour à l'accueil</a>
      </div>
    </div>
  );
}
