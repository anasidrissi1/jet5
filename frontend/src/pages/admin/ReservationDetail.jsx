import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reservationsService, paymentsService } from '../../services/api';
import Loader from '../../components/Loader';
import '../../styles/reservation-detail.css';

const FieldRow = ({ label, children, highlight }) => (
  <div className="reservation-detail-row">
    <div className="reservation-detail-label">{label}</div>
    <div className={`reservation-detail-value ${highlight ? 'highlight-' + highlight : ''}`}>
      {children || '—'}
    </div>
  </div>
);

const formatDate = (value) => {
  if (!value) return '—';
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
  } catch {
    return value;
  }
};

const formatDateTime = (value) => {
  if (!value) return '—';
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(',', ' à');
  } catch {
    return value;
  }
};

const formatMoney = (value) => {
  if (value == null || value === '') return '—';
  const num = Number(value);
  if (isNaN(num)) return value;
  return `${num.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`;
};

const parsePAAudit = (commentaire) => {
  const result = { initial: null, events: [] };
  if (!commentaire) return result;

  const lines = String(commentaire).split('\n');
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('[PA_INIT]')) {
      const jsonPart = trimmed.replace('[PA_INIT]', '').trim();
      try {
        result.initial = JSON.parse(jsonPart);
      } catch {
        // Ignore malformed payloads
      }
    }

    if (trimmed.startsWith('[PA_AUDIT]')) {
      const jsonPart = trimmed.replace('[PA_AUDIT]', '').trim();
      try {
        result.events.push(JSON.parse(jsonPart));
      } catch {
        // Ignore malformed payloads
      }
    }
  });

  result.events.sort((a, b) => {
    const aTime = new Date(a.timestamp || 0).getTime();
    const bTime = new Date(b.timestamp || 0).getTime();
    return bTime - aTime;
  });

  return result;
};

const CONTRACT_TAG = '__CONTRACT_JSON__:';

const extractNotes = (commentaire) => {
  if (!commentaire) return '';

  const lines = String(commentaire)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('[PA_INIT]') && !line.startsWith('[PA_AUDIT]'));

  const visibleLines = [];

  lines.forEach((line) => {
    if (line.startsWith(CONTRACT_TAG)) {
      try {
        const payload = JSON.parse(line.slice(CONTRACT_TAG.length));
        const userNote = String(payload?.notes || '').trim();
        if (userNote) visibleLines.push(userNote);
      } catch {
        // Ignore malformed contract payloads in detail notes.
      }
      return;
    }
    visibleLines.push(line);
  });

  return visibleLines.join('\n');
};

const STATUT_LABELS = {
  planifiee: { label: 'Planifiée', color: 'purple' },
  en_cours: { label: 'En cours', color: 'blue' },
  termine: { label: 'Terminée', color: 'green' },
  terminee: { label: 'Terminée', color: 'green' },
  annulee: { label: 'Annulée', color: 'red' },
};

const PAYMENT_LABELS = {
  CASH: 'Espèces',
  CARD: 'Carte bancaire',
  CHEQUE: 'Chèque',
  TPE: 'TPE',
  TRANSFER: 'Virement',
  OTHER: 'Autre',
};

const ReservationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reservation, setReservation] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Charger la réservation
        const resReservation = await reservationsService.get(id);
        setReservation(resReservation.data);

        // Charger les paiements associés
        try {
          const resPayments = await paymentsService.list({ reservation: id });
          const payments = Array.isArray(resPayments.data) ? resPayments.data : resPayments.data?.results || [];
          if (payments.length > 0) {
            setPaymentDetails(payments[0]);
            // Charger l'historique des paiements
            try {
              const historyRes = await paymentsService.history(payments[0].id);
              setPaymentHistory(Array.isArray(historyRes.data) ? historyRes.data : historyRes.data?.results || []);
            } catch {
              setPaymentHistory([]);
            }
          }
        } catch {
          setPaymentDetails(null);
        }

        setError(null);
      } catch (err) {
        console.error('Erreur chargement réservation', err);
        setError('Impossible de charger la réservation.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  if (loading) return <div className="cars-page"><Loader /></div>;

  if (error) {
    return (
      <div className="cars-page reservation-detail-page">
        <div className="reservation-detail-card">
          <h2>Réservation</h2>
          <p className="error-text">{error}</p>
          <div style={{ marginTop: 12 }}>
            <button type="button" className="btn" onClick={() => navigate('/admin/reservations')}>← Retour</button>
          </div>
        </div>
      </div>
    );
  }

  const r = reservation || {};
  const clientNom = r.client_nom || r.client_name || (r.client?.nom ? `${r.client.nom} ${r.client.prenom || ''}` : null);
  const clientTel = r.client_telephone || r.client?.telephone || null;
  const clientEmail = r.client_email || r.client?.email || null;
  const clientCin = r.client_cin || r.client?.cin || null;
  const clientPermis = r.client_permis || r.client?.permis_conduire || null;
  const clientAdresse = r.client_adresse || r.client?.adresse || null;
  
  const voitureDisplay = r.voiture_display || r.voiture_info || (r.voiture ? `${r.voiture.marque} ${r.voiture.modele}` : null);
  const immatriculation = r.voiture_immatriculation || r.voiture?.immatriculation || null;
  const voitureCouleur = r.voiture_couleur || r.voiture?.couleur || null;
  
  const conducteurSecondaireNom = r.conducteur_secondaire_nom || null;
  const conducteurSecondaireTel = r.conducteur_secondaire_telephone || null;
  
  const statutInfo = STATUT_LABELS[r.statut] || { label: r.statut || '—', color: 'gray' };
  const methodePaiement = PAYMENT_LABELS[r.methode_paiement] || r.methode_paiement || '—';
  
  const nombreJours = r.nombre_jours || 0;
  const prolongations = r.jours_prolongation || 0;
  const totalJours = nombreJours + prolongations;
  const prixJournalier = r.prix_journalier || 0;

  // Calcul du montant total réel (cohérent avec le backend)
  let computedMontant = parseFloat(r.montant_total) || 0;
  const tarifSpec = parseFloat(r.tarif_special);
  if (Number.isFinite(tarifSpec) && tarifSpec > 0 && totalJours > 0) {
    const months = Math.max(1, Math.ceil(totalJours / 30));
    computedMontant = tarifSpec * months;
  } else if (!computedMontant && totalJours > 0 && prixJournalier) {
    computedMontant = totalJours * prixJournalier;
  }

  const montantTotal = paymentDetails?.amount ?? computedMontant ?? 0;
  const montantPaye = paymentDetails?.paid_amount ?? r.avance ?? 0;
  const resteAPayer = Number(montantTotal) - Number(montantPaye);
  const paAudit = parsePAAudit(r.commentaire);
  const freeNotes = extractNotes(r.commentaire);

  return (
    <div className="cars-page reservation-detail-page">
      <div className="reservation-detail-card">
        <div className="reservation-detail-header">
          <h2>Détails de la réservation #{r.id}</h2>
          <div className="reservation-detail-actions">
            <button type="button" className="btn" onClick={() => navigate('/admin/reservations')}>
              Retour
            </button>
            <button type="button" className="btn btn-primary" onClick={() => navigate(`/admin/reservations/edit/${r.id}`)}>
              Modifier
            </button>
          </div>
        </div>

        <div className="reservation-detail-grid">
          {/* Colonne gauche - Infos réservation */}
          <div className="reservation-detail-section">
            <h3 className="section-title">Réservation</h3>
            <FieldRow label="ID">{r.id}</FieldRow>
            <FieldRow label="Statut">
              <span className={`status-badge status-${statutInfo.color}`}>{statutInfo.label}</span>
            </FieldRow>
            <FieldRow label="Date début">{formatDate(r.date_debut)}</FieldRow>
            <FieldRow label="Date fin">{formatDate(r.date_fin)}</FieldRow>
            <FieldRow label="Durée prévue">{nombreJours} jour{nombreJours > 1 ? 's' : ''}</FieldRow>
            {prolongations > 0 && (
              <FieldRow label="Prolongations" highlight="warning">{prolongations} jour{prolongations > 1 ? 's' : ''}</FieldRow>
            )}
            <FieldRow label="Durée totale" highlight="info">{totalJours} jour{totalJours > 1 ? 's' : ''}</FieldRow>
            {paAudit.initial && (
              <>
                <FieldRow label="Date fin initiale">{formatDate(paAudit.initial.date_fin)}</FieldRow>
                <FieldRow label="Durée initiale">{paAudit.initial.nombre_jours || 0} jour{Number(paAudit.initial.nombre_jours || 0) > 1 ? 's' : ''}</FieldRow>
                <FieldRow label="Avance initiale">{formatMoney(paAudit.initial.avance)}</FieldRow>
              </>
            )}
          </div>

          {/* Colonne droite - Client & Véhicule */}
          <div className="reservation-detail-section">
            <h3 className="section-title">Client & Véhicule</h3>
            <FieldRow label="Client">{clientNom}</FieldRow>
            <FieldRow label="Téléphone">{clientTel}</FieldRow>
            <FieldRow label="Véhicule">{voitureDisplay}</FieldRow>
            <FieldRow label="Immatriculation">{immatriculation}</FieldRow>
            {r.franchise > 0 && (
              <FieldRow label="Franchise">{formatMoney(r.franchise)}</FieldRow>
            )}
            <FieldRow label="Méthode paiement">{methodePaiement}</FieldRow>
          </div>

          {/* Section paiements - pleine largeur */}
          <div className="reservation-detail-section full-width">
            <h3 className="section-title">Paiements</h3>
            <div className="payment-summary-grid">
              <div className="payment-summary-item main">
                <span className="payment-summary-label">Montant total</span>
                <span className="payment-summary-value">{formatMoney(montantTotal)}</span>
              </div>
              <div className="payment-summary-item success">
                <span className="payment-summary-label">Montant payé</span>
                <span className="payment-summary-value">{formatMoney(montantPaye)}</span>
              </div>
              <div className={`payment-summary-item ${resteAPayer > 0 ? 'warning' : 'success'}`}>
                <span className="payment-summary-label">Reste à payer</span>
                <span className="payment-summary-value">{formatMoney(resteAPayer)}</span>
              </div>
            </div>
          </div>

          {/* Historique des paiements */}
          {paymentHistory.length > 0 && (
            <div className="reservation-detail-section full-width">
              <h3 className="section-title">Historique des versements</h3>
              <div className="payment-history-list">
                {paymentHistory.map((entry, index) => (
                  <div key={entry.id || index} className="payment-history-item">
                    <div className="payment-history-icon">•</div>
                    <div className="payment-history-content">
                      <div className="payment-history-header">
                        <span className="payment-history-title">{entry.notes || 'Paiement reçu'}</span>
                        <span className="payment-history-date">{formatDateTime(entry.created_at)}</span>
                      </div>
                      <div className="payment-history-details">
                        <span className="payment-history-amount">+{formatMoney(entry.amount)}</span>
                        <span className="payment-history-method">via {PAYMENT_LABELS[entry.method] || entry.method}</span>
                        {entry.forgiven_amount && Number(entry.forgiven_amount) > 0 && (
                          <span className="payment-history-remise">Remise: {formatMoney(entry.forgiven_amount)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historique P/A */}
          {paAudit.events.length > 0 && (
            <div className="reservation-detail-section full-width">
              <h3 className="section-title">Historique Prolongation / Avance</h3>
              <div className="payment-history-list">
                {paAudit.events.map((entry, index) => (
                  <div key={`${entry.timestamp || 'pa'}-${index}`} className="payment-history-item pa-history-item">
                    <div className="payment-history-icon">P/A</div>
                    <div className="payment-history-content">
                      <div className="payment-history-header">
                        <span className="payment-history-title">
                          {Number(entry.days_added || 0) > 0 && `+${entry.days_added} jour${Number(entry.days_added) > 1 ? 's' : ''}`}
                          {Number(entry.days_added || 0) > 0 && Number(entry.advance_added || 0) > 0 && ' | '}
                          {Number(entry.advance_added || 0) > 0 && `+${formatMoney(entry.advance_added)} avance`}
                          {Number(entry.days_added || 0) <= 0 && Number(entry.advance_added || 0) <= 0 && 'Mise à jour P/A'}
                        </span>
                        <span className="payment-history-date">{formatDateTime(entry.timestamp)}</span>
                      </div>
                      <div className="payment-history-details">
                        {entry.old_end_date && entry.new_end_date && (
                          <span className="payment-history-method">Période: {formatDate(entry.old_end_date)} → {formatDate(entry.new_end_date)}</span>
                        )}
                        {entry.payment_method && (
                          <span className="payment-history-method">Méthode: {PAYMENT_LABELS[entry.payment_method] || entry.payment_method}</span>
                        )}
                        {entry.advance_total_after != null && (
                          <span className="payment-history-remise">Avance totale: {formatMoney(entry.advance_total_after)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {freeNotes && (
            <div className="reservation-message-panel">
              <strong>Notes</strong>
              <div>{freeNotes}</div>
            </div>
          )}

          {/* Métadonnées */}
          <div className="reservation-detail-section full-width metadata">
            <FieldRow label="Créée le">{formatDateTime(r.date_creation || r.created_at)}</FieldRow>
            {r.date_dernier_changement && (
              <FieldRow label="Modifiée le">{formatDateTime(r.date_dernier_changement)}</FieldRow>
            )}
            {r.modifie_par && (
              <FieldRow label="Modifié par">{r.modifie_par}</FieldRow>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationDetail;
