import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { notificationsService } from '../../services/api';
import Loader from '../../components/Loader';
import './styles.css';

const FieldRow = ({ label, children }) => (
  <div className="notification-detail-row">
    <div className="notification-detail-label">{label}</div>
    <div className="notification-detail-value">{children || '—'}</div>
  </div>
);

// Render a field only when it has a meaningful value (to avoid showing irrelevant empty rows)
const RenderField = ({ label, value, format, hideIfEmpty = true }) => {
  const hasValue = value !== null && value !== undefined && value !== '' && value !== '—';
  if (hideIfEmpty && !hasValue) return null;
  const display = format ? format(value) : value;
  return <FieldRow label={label}>{display}</FieldRow>;
};

const NotificationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await notificationsService.get(id);
        setNotification(res.data);
        setError(null);
      } catch (err) {
        console.error('Erreur chargement notification', err);
        setError('Impossible de charger la notification.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleMarkAsRead = async () => {
    if (!notification || notification.est_lue) return;
    setIsProcessing(true);
    try {
      await notificationsService.markRead(id);
      setNotification((prev) => ({ ...prev, est_lue: true }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Supprimer cette notification ?')) return;
    setIsProcessing(true);
    try {
      await notificationsService.delete(id);
      navigate('/admin/notifications');
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="cars-page"><Loader /></div>;

  if (error) {
    return (
      <div className="cars-page notification-detail-page">
        <div className="notification-detail-card">
          <h2>Notification</h2>
          <p className="error-text">{error}</p>
          <div style={{ marginTop: 12 }}>
            <button type="button" className="btn" onClick={() => navigate('/admin/notifications')}>Retour</button>
          </div>
        </div>
      </div>
    );
  }

  const n = notification || {};

  return (
    <div className="cars-page notification-detail-page">
      <div className="notification-detail-card">
        <div className="notification-detail-header">
          <h2>Détails de la notification</h2>
          <div className="notification-detail-actions">
            {!notification?.est_lue && (
              <button type="button" className="btn" onClick={handleMarkAsRead} disabled={isProcessing}>
                Marquer lu
              </button>
            )}
            <button type="button" className="btn" onClick={() => navigate('/admin/notifications')}>
              ← Retour
            </button>
            <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={isProcessing}>
              {isProcessing ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </div>

        <div className="notification-detail-grid">
          <div>
            <RenderField label="ID" value={n.id} />
            <RenderField label="Type" value={n.typeMeta?.text || n.type} />
            <RenderField label="Urgence" value={n.urgencyMeta?.label} />
            <RenderField label="Lu" value={n.est_lue ? 'Oui' : 'Non'} hideIfEmpty={false} />
            <RenderField label="Échéance" value={n.dueDateLabel} />
            <RenderField label="Créée le" value={n.createdAtLabel} />
          </div>

          <div>
            <RenderField
              label="Véhicule"
              value={n.car ? `${n.car.immatriculation || ''}${n.car.marque ? ' • ' + (n.car.marque || '') : ''} ${n.car.modele || ''}`.trim() : ''}
            />
            <RenderField
              label="Client"
              value={n.client ? `${n.client.nom || ''} ${n.client.prenom || ''}`.trim() : (n.client_nom || '')}
            />
            <RenderField label="Téléphone" value={n.client?.telephone || n.client_telephone} />
            <RenderField label="Email" value={n.client?.email} />
            <RenderField label="Montant total" value={n.montant_total ? `${n.montant_total} DH` : ''} />
            <RenderField label="Montant payé" value={n.montant_paye ? `${n.montant_paye} DH` : ''} />
            <RenderField label="Reste à payer" value={n.reste_a_payer ? `${n.reste_a_payer} DH` : ''} />
          </div>

          <div className="notification-message-panel">
            <strong style={{ display: 'block', marginBottom: 8 }}>Message</strong>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{n.message || '—'}</div>
          </div>

          {n.payload && (
            <div className="notification-detail-full">
              <h3 style={{ marginBottom: 8 }}>Payload</h3>
              <pre className="notification-payload">{JSON.stringify(n.payload, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationDetail;
