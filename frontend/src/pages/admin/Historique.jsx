import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { reservationsService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import exportExcel from '../../utils/exportExcel';
import Loader from '../../components/Loader';
import '../../styles/reservations-professional.css';

function getClientLabel(reservation) {
  const fromParts = `${reservation.client_nom || ''} ${reservation.client_prenom || ''}`.trim();
  return fromParts || reservation.client_name || `Client #${reservation.client}`;
}

function getCarLabel(reservation) {
  const fromParts = `${reservation.voiture_marque || ''} ${reservation.voiture_modele || ''}`.trim();
  return fromParts || reservation.voiture_display || reservation.voiture_info || `Voiture #${reservation.voiture}`;
}

function getCarPlate(reservation) {
  return reservation.voiture_immatriculation || '-';
}

function Historique() {
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await reservationsService.historique();
      const payload = response.data;
      setReservations(Array.isArray(payload) ? payload : payload?.results ?? []);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Erreur réseau';
      setError(errorMsg);
      addNotification(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
  };

  const filteredReservations = useMemo(() => {
    let filtered = reservations;
    const q = search.trim().toLowerCase();

    if (q) {
      filtered = filtered.filter((r) => {
        const clientName = getClientLabel(r).toLowerCase();
        const carName = getCarLabel(r).toLowerCase();
        const immat = getCarPlate(r).toLowerCase();

        return (
          clientName.includes(q) ||
          carName.includes(q) ||
          immat.includes(q) ||
          (r.id?.toString() || '').includes(q)
        );
      });
    }

    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (sortConfig.key === 'client') {
          aVal = getClientLabel(a);
          bVal = getClientLabel(b);
        }
        if (sortConfig.key === 'voiture') {
          aVal = getCarLabel(a);
          bVal = getCarLabel(b);
        }
        if (aVal == null) aVal = '';
        if (bVal == null) bVal = '';
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [reservations, search, sortConfig]);

  const stats = useMemo(() => {
    const total = reservations.length;
    const totalRevenue = reservations.reduce((sum, r) => sum + (parseFloat(r.montant_total) || 0), 0);
    return { total, totalRevenue };
  }, [reservations]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '⇅';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const handleExport = async () => {
    if (!filteredReservations.length) {
      addNotification('Aucune donnée à exporter', 'warning');
      return;
    }

    const rows = filteredReservations.map((r) => ({
      ID: r.id,
      Client: getClientLabel(r),
      Voiture: getCarLabel(r),
      Immatriculation: getCarPlate(r),
      'Date début': r.date_debut || '-',
      'Date fin': r.date_fin || '-',
      'Nombre jours': r.nombre_jours || calculateDays(r.date_debut, r.date_fin),
      'Montant total (MAD)': r.montant_total || '-',
      'Franchise (MAD)': r.franchise || '-',
    }));

    try {
      await exportExcel('historique_reservations.xlsx', rows, 'Historique');
      addNotification('Export réussi', 'success');
    } catch {
      addNotification('Erreur lors de l\'export', 'error');
    }
  };

  if (loading) {
    return (
      <div className="reservations-professional-page">
        <Loader />
      </div>
    );
  }

  return (
    <div className="reservations-professional-page">
      <div className="reservations-header">
        <div className="header-left">
          <h1 className="page-title">
            <span className="title-icon">📚</span>
            Historique des Réservations
          </h1>
          <p className="page-subtitle">
            {stats.total} réservation{stats.total > 1 ? 's' : ''} terminée{stats.total > 1 ? 's' : ''} •
            Revenus total: {stats.totalRevenue.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD
          </p>
        </div>

        <div className="header-actions">
          <button type="button" className="btn-export" onClick={handleExport}>
            📊 Exporter
          </button>
          <button type="button" className="btn-add" onClick={() => navigate('/admin/reservations')}>
            ← Retour aux Réservations
          </button>
        </div>
      </div>

      <div className="search-section">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input-pro"
            placeholder="Rechercher par client, voiture, immatriculation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="search-clear" onClick={() => setSearch('')}>
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="reservations-content">
        {error ? (
          <div className="error-state">
            <span className="error-icon">⚠️</span>
            <p>Erreur: {error}</p>
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📚</span>
            <h3>Aucune réservation dans l&apos;historique</h3>
            <p>Les réservations terminées et payées apparaîtront ici</p>
          </div>
        ) : (
          <>
            <div className="table-info">
              <span>
                Affichage de {filteredReservations.length} réservation
                {filteredReservations.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="reservations-table-container" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <table className="reservations-table-pro">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('id')} className="sortable">ID {getSortIcon('id')}</th>
                    <th onClick={() => handleSort('client')} className="sortable">Client {getSortIcon('client')}</th>
                    <th onClick={() => handleSort('voiture')} className="sortable">Voiture {getSortIcon('voiture')}</th>
                    <th onClick={() => handleSort('date_debut')} className="sortable">Période {getSortIcon('date_debut')}</th>
                    <th onClick={() => handleSort('montant_total')} className="sortable">Montant Total {getSortIcon('montant_total')}</th>
                    <th onClick={() => handleSort('franchise')} className="sortable">Franchise {getSortIcon('franchise')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReservations.map((reservation) => {
                    const days = reservation.nombre_jours || calculateDays(reservation.date_debut, reservation.date_fin);

                    return (
                      <tr key={reservation.id}>
                        <td className="id-col">#{reservation.id}</td>
                        <td className="client-col">
                          <div className="client-info">
                            <span className="client-icon">👤</span>
                            <div className="client-details">
                              <div className="client-primary">{getClientLabel(reservation)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="car-col">
                          <div className="car-info">
                            <div className="car-name">{getCarLabel(reservation)}</div>
                            <div className="car-plate">🚘 {getCarPlate(reservation)}</div>
                          </div>
                        </td>
                        <td className="period-col">
                          <div className="period-info">
                            <div className="dates">
                              {reservation.date_debut || '-'} → {reservation.date_fin || '-'}
                            </div>
                            <div className="days-badge">{days} jour{days > 1 ? 's' : ''}</div>
                          </div>
                        </td>
                        <td className="amount-col">
                          <span className="amount-value">
                            {reservation.montant_total
                              ? `${parseFloat(reservation.montant_total).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD`
                              : '-'}
                          </span>
                        </td>
                        <td className="franchise-col">
                          {reservation.franchise
                            ? `${parseFloat(reservation.franchise).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD`
                            : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Historique;
