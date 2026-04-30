import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/quickactions.css';

const QuickActions = () => {
  const navigate = useNavigate();
  return (
    <div className="quick-actions">
      <h2 className="quick-actions-title">Actions rapides</h2>
      <div className="quick-actions-grid">
        <button className="quick-action-button" onClick={() => navigate('/admin/cars/add')}>
          <span className="icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </span>
          <span className="label">Nouvelle voiture</span>
        </button>
        <button className="quick-action-button" onClick={() => navigate('/admin/clients/add')}>
          <span className="icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </span>
          <span className="label">Nouveau client</span>
        </button>
        <button className="quick-action-button" onClick={() => navigate('/admin/reservations/add')}>
          <span className="icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </span>
          <span className="label">Nouvelle réservation</span>
        </button>
        <button className="quick-action-button" onClick={() => navigate('/admin/payments/add')}>
          <span className="icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </span>
          <span className="label">Nouveau paiement</span>
        </button>
      </div>
    </div>
  );
};

export default QuickActions;