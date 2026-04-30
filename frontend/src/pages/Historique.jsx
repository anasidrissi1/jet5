import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useNotification } from '../contexts/NotificationContext';
import exportExcel from '../utils/exportExcel';
import Loader from '../components/Loader';
import '../styles/reservations-professional.css';

function Historique() {
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  
  const [reservations, setReservations] = useState([]);
  const [clients, setClients] = useState([]);
  const [cars, setCars] = useState([]);
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
      const [rRes, cRes, vRes] = await Promise.all([
        apiClient.get('/reservations/historique/'),
        apiClient.get('/clients/'),
        apiClient.get('/cars/voitures/')
      ]);

      setReservations(Array.isArray(rRes.data) ? rRes.data : rRes.data?.results ?? []);
      setClients(Array.isArray(cRes.data) ? cRes.data : cRes.data?.results ?? []);
      setCars(Array.isArray(vRes.data) ? vRes.data : vRes.data?.results ?? []);
    } catch (err) {
      console.error('Erreur chargement:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Erreur réseau';
      setError(errorMsg);
      addNotification(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const clientMap = useMemo(() => 
    Object.fromEntries(clients.map(c => [c.id, c])), 
    [clients]
  );
  
  const carMap = useMemo(() => 
    Object.fromEntries(cars.map(c => [c.id, c])), 
    [cars]
  );

  const getClientName = (clientId) => {
    const client = clientMap[clientId];
    if (!client) return `Client #${clientId}`;
    return `${client.nom || ''} ${client.prenom || ''}`.trim() || `Client #${clientId}`;
  };

  const getCarInfo = (carId) => {
    const car = carMap[carId];
    if (!car) return { display: `Voiture #${carId}`, immatriculation: '-' };
    return {
      display: `${car.marque || ''} ${car.modele || ''}`.trim() || `Voiture #${carId}`,
      immatriculation: car.immatriculation || '-'
    };
  };

  const calculateDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const filteredReservations = useMemo(() => {
    let filtered = reservations;

    const q = search.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(r => {
        const client = clientMap[r.client];
        const clientName = client ? `${client.nom || ''} ${client.prenom || ''}`.trim().toLowerCase() : '';
        const car = carMap[r.voiture];
        const carDisplay = car ? `${car.marque || ''} ${car.modele || ''}`.trim().toLowerCase() : '';
        const immat = car ? (car.immatriculation || '').toLowerCase() : '';
        
        return (
          clientName.includes(q) ||
          carDisplay.includes(q) ||
          immat.includes(q) ||
          (r.id?.toString() || '').includes(q)
        );
      });
    }

    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
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
  }, [reservations, search, sortConfig, clientMap, carMap]);

  const displayedReservations = filteredReservations;

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
    if (!filteredReservations || filteredReservations.length === 0) {
      addNotification('Aucune donnée à exporter', 'warning');
      return;
    }

    const rows = filteredReservations.map(r => ({
      ID: r.id,
      Client: getClientName(r.client),
      Voiture: getCarInfo(r.voiture).display,
      Immatriculation: getCarInfo(r.voiture).immatriculation,
      'Date début': r.date_debut || '-',
      'Date fin': r.date_fin || '-',
      'Nombre jours': r.nombre_jours || calculateDays(r.date_debut, r.date_fin),
      'Montant total (MAD)': r.montant_total || '-',
      'Franchise (MAD)': r.franchise || '-'
    }));

    try {
      await exportExcel('historique_reservations.xlsx', rows, 'Historique');
      addNotification('Export réussi', 'success');
    } catch (err) {
      console.error('Erreur export:', err);
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
          <button className="btn-export" onClick={handleExport}>
            📊 Exporter
          </button>
          <button className="btn-add" onClick={() => navigate('/admin/reservations')}>
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
            <button className="search-clear" onClick={() => setSearch('')}>
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
            <h3>Aucune réservation dans l'historique</h3>
            <p>Les réservations terminées et payées apparaîtront ici</p>
          </div>
        ) : (
          <>
            <div className="table-info">
              <span>Affichage de {displayedReservations.length} réservation{displayedReservations.length > 1 ? 's' : ''}</span>
            </div>

            <div
              className="reservations-table-container"
              style={{ maxHeight: '60vh', overflowY: 'auto' }}
            >
              <table className="reservations-table-pro">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('id')} className="sortable">
                      ID {getSortIcon('id')}
                    </th>
                    <th onClick={() => handleSort('client')} className="sortable">
                      Client {getSortIcon('client')}
                    </th>
                    <th onClick={() => handleSort('voiture')} className="sortable">
                      Voiture {getSortIcon('voiture')}
                    </th>
                    <th onClick={() => handleSort('date_debut')} className="sortable">
                      Période {getSortIcon('date_debut')}
                    </th>
                    <th onClick={() => handleSort('montant_total')} className="sortable">
                      Montant Total {getSortIcon('montant_total')}
                    </th>
                    <th onClick={() => handleSort('franchise')} className="sortable">
                      Franchise {getSortIcon('franchise')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayedReservations.map((reservation) => {
                    const carInfo = getCarInfo(reservation.voiture);
                    const days = reservation.nombre_jours || calculateDays(reservation.date_debut, reservation.date_fin);
                    
                    return (
                      <tr key={reservation.id}>
                        <td className="id-col">#{reservation.id}</td>
                        <td className="client-col">
                          <div className="client-info">
                            <span className="client-icon">👤</span>
                            <div className="client-details">
                              <div className="client-primary">{getClientName(reservation.client)}</div>
                              {reservation.conducteur_secondaire && (
                                <div className="client-secondary">
                                  <span className="secondary-icon">👥</span>
                                  {getClientName(reservation.conducteur_secondaire)}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="car-col">
                          <div className="car-info">
                            <div className="car-name">{carInfo.display}</div>
                            <div className="car-plate">🚘 {carInfo.immatriculation}</div>
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
