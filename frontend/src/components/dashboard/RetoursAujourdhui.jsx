import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import './RetoursAujourdhui.css';

const RetoursAujourdhui = () => {
  const [retours, setRetours] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadRetours();
  }, []);

  const loadRetours = async () => {
    try {
      const response = await apiClient.get('/dashboard/retours-aujourdhui/');
      setRetours(response.data.retours || []);
    } catch (error) {
      console.error('Erreur chargement retours:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarquerRendu = async (id) => {
    // Cette fonctionnalité peut être ajoutée plus tard
    alert(`Marquer la réservation #${id} comme rendue`);
  };

  const handleVoirDetails = (id) => {
    navigate(`/admin/reservations/edit/${id}`);
  };

  if (loading) {
    return (
      <div className="widget-retours">
        <div className="widget-header">
          <h3>🚗 Retours Aujourd'hui</h3>
          <span className="badge badge-loading">Chargement...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="widget-retours">
      <div className="widget-header">
        <h3>🚗 Retours Aujourd'hui</h3>
        <span className={`badge ${retours.length > 0 ? 'badge-urgent' : 'badge-success'}`}>
          {retours.length} {retours.length > 1 ? 'voitures' : 'voiture'}
        </span>
      </div>

      <div className="widget-body">
        {retours.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <p>Aucun retour prévu aujourd'hui</p>
          </div>
        ) : (
          <div className="retours-list">
            {retours.map((retour) => (
              <div key={retour.id} className="retour-item">
                <div className="retour-icon">🚗</div>
                <div className="retour-info">
                  <div className="retour-voiture">{retour.voiture}</div>
                  <div className="retour-immat">{retour.immatriculation}</div>
                  <div className="retour-client">
                    <span className="client-icon">👤</span>
                    {retour.client_nom}
                  </div>
                  <div className="retour-heure">
                    <span className="heure-icon">⏰</span>
                    {retour.heure_retour || 'Heure non définie'}
                  </div>
                </div>
                <div className="retour-actions">
                  <button
                    className="btn-icon btn-success"
                    onClick={() => handleMarquerRendu(retour.id)}
                    title="Marquer comme rendu"
                  >
                    ✓
                  </button>
                  <button
                    className="btn-icon btn-primary"
                    onClick={() => handleVoirDetails(retour.id)}
                    title="Voir détails"
                  >
                    👁️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {retours.length > 0 && (
        <div className="widget-footer">
          <button 
            className="btn-text"
            onClick={() => navigate('/admin/notifications')}
          >
            Voir toutes les notifications →
          </button>
        </div>
      )}
    </div>
  );
};

export default RetoursAujourdhui;
