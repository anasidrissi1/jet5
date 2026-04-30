import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ActionsRapides.css';

const ActionsRapides = () => {
  const navigate = useNavigate();

  const actions = [
    {
      icon: '➕',
      label: 'Nouvelle Location',
      color: '#3498db',
      route: '/reservations/add'
    },
    {
      icon: '🔍',
      label: 'Chercher Client',
      color: '#9b59b6',
      route: '/clients'
    },
    {
      icon: '🚗',
      label: 'Voir Disponibilités',
      color: '#27ae60',
      route: '/cars'
    }
  ];

  return (
    <div className="widget-actions-rapides">
      <div className="widget-header-simple">
        <h3>⚡ Actions Rapides</h3>
      </div>
      <div className="actions-grid">
        {actions.map((action, index) => (
          <button
            key={index}
            className="action-btn"
            style={{ borderColor: action.color }}
            onClick={() => navigate(action.route)}
          >
            <div className="action-icon" style={{ backgroundColor: action.color }}>
              {action.icon}
            </div>
            <span className="action-label">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ActionsRapides;
