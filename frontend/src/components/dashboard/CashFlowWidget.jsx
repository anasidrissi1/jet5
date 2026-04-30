import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import './CashFlowWidget.css';

function CashFlowWidget() {
  const navigate = useNavigate();
  const [cashFlow, setCashFlow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periode, setPeriode] = useState('aujourdhui'); // aujourdhui, semaine, mois

  useEffect(() => {
    loadCashFlow();
  }, [periode]);

  const loadCashFlow = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/dashboard/cash-flow/?periode=${periode}`);
      setCashFlow(response.data);
    } catch (error) {
      console.error('Erreur chargement cash flow:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const getBalanceColor = (balance) => {
    if (balance > 0) return 'balance-positive';
    if (balance < 0) return 'balance-negative';
    return 'balance-neutral';
  };

  const getTendanceIcon = (tendance) => {
    if (tendance > 0) return '📈';
    if (tendance < 0) return '📉';
    return '➡️';
  };

  if (loading) {
    return (
      <div className="cashflow-widget">
        <div className="cashflow-header">
          <h3>💰 Cash Flow</h3>
        </div>
        <div className="cashflow-loading">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="cashflow-widget">
      <div className="cashflow-header">
        <h3>💰 Cash Flow</h3>
        <div className="cashflow-periode-tabs">
          <button 
            className={`periode-tab ${periode === 'aujourdhui' ? 'active' : ''}`}
            onClick={() => setPeriode('aujourdhui')}
          >
            Aujourd'hui
          </button>
          <button 
            className={`periode-tab ${periode === 'semaine' ? 'active' : ''}`}
            onClick={() => setPeriode('semaine')}
          >
            7 jours
          </button>
          <button 
            className={`periode-tab ${periode === 'mois' ? 'active' : ''}`}
            onClick={() => setPeriode('mois')}
          >
            30 jours
          </button>
        </div>
      </div>

      <div className="cashflow-content">
        {/* Balance principale */}
        <div className={`cashflow-balance ${getBalanceColor(cashFlow?.balance_net)}`}>
          <span className="balance-label">Balance Nette</span>
          <span className="balance-value">{formatCurrency(cashFlow?.balance_net)}</span>
          <div className="balance-tendance">
            <span className="tendance-icon">{getTendanceIcon(cashFlow?.tendance_vs_precedent)}</span>
            <span className="tendance-text">
              {Math.abs(cashFlow?.tendance_vs_precedent || 0)}% vs période précédente
            </span>
          </div>
        </div>

        {/* Entrées vs Sorties */}
        <div className="cashflow-grid">
          <div className="cashflow-card income">
            <div className="card-header">
              <span className="card-icon">💵</span>
              <span className="card-title">Entrées</span>
            </div>
            <div className="card-amount">{formatCurrency(cashFlow?.entrees_total)}</div>
            <div className="card-details">
              <div className="detail-item">
                <span className="detail-label">Paiements reçus</span>
                <span className="detail-value">{formatCurrency(cashFlow?.paiements_recus)}</span>
              </div>
            </div>
          </div>

          <div className="cashflow-card expenses">
            <div className="card-header">
              <span className="card-icon">💸</span>
              <span className="card-title">Sorties</span>
            </div>
            <div className="card-amount">{formatCurrency(cashFlow?.sorties_total)}</div>
            <div className="card-details">
              <div className="detail-item">
                <span className="detail-label">Remboursements</span>
                <span className="detail-value">{formatCurrency(cashFlow?.remboursements || 0)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">🔧 Entretiens</span>
                <span className="detail-value">{formatCurrency(cashFlow?.depenses_entretiens || 0)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">🛡️ Assurances</span>
                <span className="detail-value">{formatCurrency(cashFlow?.depenses_assurances || 0)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">🔍 Visites tech.</span>
                <span className="detail-value">{formatCurrency(cashFlow?.depenses_visites || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Paiements en attente */}
        {cashFlow?.paiements_en_attente?.length > 0 && (
          <div className="cashflow-pending">
            <div className="pending-header">
              <h4>⏳ Paiements en Attente</h4>
              <span className="pending-badge">{cashFlow.paiements_en_attente.length}</span>
            </div>
            <div className="pending-list">
              {cashFlow.paiements_en_attente.slice(0, 2).map((paiement, index) => (
                <div 
                  key={index} 
                  className={`pending-item ${paiement.jours_retard > 3 ? 'overdue' : ''}`}
                  onClick={() => navigate(`/admin/reservations/edit/${paiement.reservation_id}`)}
                >
                  <div className="pending-info">
                    <span className="pending-client">{paiement.client_nom}</span>
                    <span className="pending-date">
                      {paiement.jours_retard > 0 ? (
                        <span className="retard-badge">🔴 {paiement.jours_retard}j de retard</span>
                      ) : (
                        <span className="normal-badge">📅 Échéance: {paiement.date_echeance}</span>
                      )}
                    </span>
                  </div>
                  <div className="pending-amount">{formatCurrency(paiement.montant)}</div>
                </div>
              ))}
            </div>
            {cashFlow.paiements_en_attente.length > 2 && (
              <button 
                className="voir-tous-btn"
                onClick={() => navigate('/admin/payments')}
              >
                Voir tout ({cashFlow.paiements_en_attente.length})
              </button>
            )}
          </div>
        )}

        {/* Prévisions */}
        <div className="cashflow-forecast">
          <h4>📊 Prévisions 7 prochains jours</h4>
          <div className="forecast-grid">
            <div className="forecast-item">
              <span className="forecast-label">Revenus attendus</span>
              <span className="forecast-value positive">{formatCurrency(cashFlow?.previsions?.revenus_attendus)}</span>
            </div>
            <div className="forecast-item">
              <span className="forecast-label">Balance prévisionnelle</span>
              <span className={`forecast-value ${getBalanceColor(cashFlow?.previsions?.balance_prevue)}`}>
                {formatCurrency(cashFlow?.previsions?.balance_prevue)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="cashflow-actions">
          <button 
            className="action-btn primary"
            onClick={() => navigate('/admin/payments')}
          >
            💰 Enregistrer paiement
          </button>
          <button 
            className="action-btn secondary"
            onClick={() => navigate('/admin/reservations')}
          >
            📊 Voir toutes les transactions
          </button>
        </div>
      </div>
    </div>
  );
}

export default CashFlowWidget;
