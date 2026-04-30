import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/apiClient";
import { useNotification } from "../contexts/NotificationContext";
import Loader from "../components/Loader";
import exportExcel from "../utils/exportExcel";
import "../styles/pages.css";
import "../styles/cars.css";
import "../styles/autorisations.css";
import "../styles/rentabilite.css";

function Autorisations() {
  const navigate = useNavigate();
  const [autorisations, setAutorisations] = useState([]);
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [selectedAuth, setSelectedAuth] = useState(null);
  const [formData, setFormData] = useState({
    voiture: "",
    date_delivrance: "",
    date_expiration: ""
  });
  const { addNotification } = useNotification();

  // Fetch cars and autorisations
  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch cars first
        const carsRes = await apiClient.get('/cars/voitures/');
        const carsPayload = carsRes.data;
        const carsList = Array.isArray(carsPayload) ? carsPayload : carsPayload?.results ?? carsPayload?.items ?? [];
        
        // Fetch autorisations
        const authRes = await apiClient.get('/cars/autorisations/');
        const authPayload = authRes.data;
        const authList = Array.isArray(authPayload) ? authPayload : authPayload?.results ?? authPayload?.items ?? [];
        
        if (mounted) {
          setCars(carsList || []);
          setAutorisations(authList || []);
        }
      } catch (err) {
        console.error('Erreur lors du chargement des données :', err);
        const errorMsg = err.response?.data?.detail || err.message || 'Erreur réseau';
        setError(errorMsg);
        addNotification(errorMsg, 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, [addNotification]);

  // Get car details by ID
  const getCarById = (carId) => {
    return cars.find(car => car.id === carId) || null;
  };

  // Calculate status with days remaining
  const getStatus = (dateExpiration) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(dateExpiration);
    exp.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { 
        status: 'expirée', 
        color: 'danger', 
        emoji: '❌',
        days: Math.abs(diffDays)
      };
    }
    if (diffDays <= 7) {
      return { 
        status: 'expire bientôt', 
        color: 'warning', 
        emoji: '⚠️',
        days: diffDays
      };
    }
    return { 
      status: 'valide', 
      color: 'success', 
      emoji: '✅',
      days: diffDays
    };
  };

  // Filter and search
  const filtered = useMemo(() => {
    let filteredList = autorisations.map(auth => ({
      ...auth,
      car: getCarById(auth.voiture)
    }));

    // Apply status filter
    if (filter !== 'all') {
      filteredList = filteredList.filter(auth => {
        const stat = getStatus(auth.date_expiration).status;
        if (filter === 'valide') return stat === 'valide';
        if (filter === 'expire_bientot') return stat === 'expire bientôt';
        if (filter === 'expiree') return stat === 'expirée';
        return true;
      });
    }

    // Apply search query
    const q = query.trim().toLowerCase();
    if (q) {
      filteredList = filteredList.filter(auth => {
        const car = auth.car;
        return (
          (car?.immatriculation || '').toLowerCase().includes(q) ||
          (car?.marque || '').toLowerCase().includes(q) ||
          (car?.modele || '').toLowerCase().includes(q)
        );
      });
    }

    return filteredList;
  }, [autorisations, cars, query, filter]);

  // Navigate to AddAutorisation page
  const handleAddNew = () => {
    navigate('/admin/autorisations/add');
  };

  // Open modal for renewing authorization
  const handleRenew = (auth) => {
    setModalMode("renew");
    setSelectedAuth(auth);
    setFormData({
      voiture: auth.voiture,
      date_delivrance: new Date().toISOString().split('T')[0],
      date_expiration: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.voiture || !formData.date_delivrance || !formData.date_expiration) {
      addNotification('Veuillez remplir tous les champs', 'error');
      return;
    }

    try {
      await apiClient.post('/cars/autorisations/', {
        voiture: parseInt(formData.voiture),
        date_delivrance: formData.date_delivrance,
        date_expiration: formData.date_expiration
      });

      // Refresh list
      const res = await apiClient.get('/cars/autorisations/');
      const payload = res.data;
      const list = Array.isArray(payload) ? payload : payload?.results ?? payload?.items ?? [];
      setAutorisations(list || []);
      
      setShowModal(false);
      addNotification(
        modalMode === 'add' 
          ? 'Autorisation ajoutée avec succès' 
          : 'Autorisation renouvelée avec succès',
        'success'
      );
    } catch (err) {
      console.error('Erreur lors de l\'enregistrement :', err);
      addNotification(
        err.response?.data?.detail || 'Erreur lors de l\'enregistrement',
        'error'
      );
    }
  };

  // Handle export
  const handleExport = async () => {
    if (!filtered || filtered.length === 0) {
      addNotification('Aucune donnée à exporter', 'warning');
      return;
    }
    
    const rows = filtered.map(auth => {
      const car = auth.car;
      const stat = getStatus(auth.date_expiration);
      return {
        ID: auth.id,
        Immatriculation: car?.immatriculation || '-',
        Marque: car?.marque || '-',
        Modele: car?.modele || '-',
        Date_Delivrance: auth.date_delivrance || '-',
        Date_Expiration: auth.date_expiration || '-',
        Statut: stat.status,
        Jours_Restants: stat.days
      };
    });
    
    try {
      await exportExcel('autorisations_circulation.xlsx', rows, 'Autorisations');
      addNotification('Export réussi', 'success');
    } catch (err) {
      console.error('Erreur export:', err);
      addNotification('Erreur lors de l\'export', 'error');
    }
  };

  // Get available cars (cars without valid authorization)
  const availableCars = useMemo(() => {
    const carsWithValidAuth = autorisations
      .filter(auth => {
        const stat = getStatus(auth.date_expiration);
        return stat.status === 'valide';
      })
      .map(auth => auth.voiture);
    
    return cars.filter(car => !carsWithValidAuth.includes(car.id));
  }, [cars, autorisations]);

  const formatDate = (value) => {
    if (!value) {
      return '-';
    }
    try {
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        return value;
      }
      return parsed.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (err) {
      return value;
    }
  };

  const stats = useMemo(() => {
    const summary = {
      total: autorisations.length,
      valid: 0,
      expiringSoon: 0,
      expired: 0,
      next: null
    };

    autorisations.forEach(auth => {
      const statusInfo = getStatus(auth.date_expiration);

      if (statusInfo.status === 'valide') {
        summary.valid += 1;
      } else if (statusInfo.status === 'expire bientôt') {
        summary.expiringSoon += 1;
      } else if (statusInfo.status === 'expirée') {
        summary.expired += 1;
      }

      if (statusInfo.status !== 'expirée') {
        if (!summary.next || statusInfo.days < summary.next.days) {
          summary.next = {
            days: statusInfo.days,
            status: statusInfo.status,
            emoji: statusInfo.emoji,
            date: auth.date_expiration,
            car: getCarById(auth.voiture)
          };
        }
      }
    });

    return summary;
  }, [autorisations, cars]);

  if (loading) {
    return (
      <div className="cars-page">
        <Loader />
      </div>
    );
  }

  return (
    <div className="cars-page">
      <div className="cars-header">
        <div>
          <h1 className="cars-title">📄 Autorisations de Circulation</h1>
          <p className="cars-sub">Gestion des autorisations légales de circulation des véhicules</p>
        </div>

        <div className="cars-actions">
          <input
            className="search-input"
            placeholder="Rechercher par immatriculation, marque, modèle..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <select 
            value={filter} 
            onChange={e => setFilter(e.target.value)} 
            className="filter-select"
          >
            <option value="all">Tous</option>
            <option value="valide">✅ Valides</option>
            <option value="expire_bientot">⚠️ À renouveler</option>
            <option value="expiree">❌ Expirées</option>
          </select>
          <button className="add-button" onClick={handleAddNew}>
            Nouvelle autorisation
          </button>
          <button className="export-button" onClick={handleExport} title="Exporter la liste">
            Exporter
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {!error && (
        <div className="kpis-grid">
          <div className="kpi-card">
            <div className="kpi-content">
              <p className="kpi-label">Total Autorisations</p>
              <h2 className="kpi-value">{stats.total}</h2>
              <p className="kpi-sub">{stats.valid} valides actuellement</p>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-content">
              <p className="kpi-label">Autorisations Valides</p>
              <h2 className="kpi-value">{stats.valid}</h2>
              <p className="kpi-sub">{stats.total ? ((stats.valid / stats.total) * 100).toFixed(1) : 0}% des dossiers</p>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-content">
              <p className="kpi-label">À Renouveler</p>
              <h2 className="kpi-value">{stats.expiringSoon}</h2>
              <p className="kpi-sub">Échéance ≤ 7 jours</p>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-content">
              <p className="kpi-label">Autorisations Expirées</p>
              <h2 className="kpi-value">{stats.expired}</h2>
              <p className="kpi-sub">Action requise</p>
            </div>
          </div>
        </div>
      )}

      <div className="cars-body">

        {error ? (
          <div className="cars-error">Erreur: {error}</div>
        ) : filtered.length === 0 ? (
          <div className="cars-empty">Aucune autorisation trouvée.</div>
        ) : (
          <>
            <div
              className="table-container-autorisation"
              style={{ maxHeight: '60vh', overflowY: 'auto' }}
            >
              <table className="table-autorisation">
                <thead>
                  <tr>
                    <th>Immatriculation</th>
                    <th>Marque / Modèle</th>
                    <th>Date d'émission</th>
                    <th>Date d'expiration</th>
                    <th>Jours restants</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(auth => {
                    const car = auth.car;
                    const stat = getStatus(auth.date_expiration);
                    return (
                      <tr key={auth.id}>
                        <td>
                          <span className="table-chip">{car?.immatriculation || '-'}</span>
                        </td>
                        <td>{car ? `${car.marque || '-'} ${car.modele || ''}` : '-'}</td>
                        <td>{formatDate(auth.date_delivrance)}</td>
                        <td>{formatDate(auth.date_expiration)}</td>
                        <td>
                          {stat.status === 'expirée'
                            ? <span className="text-danger">Expirée depuis {stat.days} jour(s)</span>
                            : `${stat.days} jour(s)`}
                        </td>
                        <td>
                          <span className={`badge status-${stat.color}`}>
                            {stat.emoji} {stat.status}
                          </span>
                        </td>
                        <td>
                          <button 
                            type="button"
                            className="btn-renew"
                            onClick={() => handleRenew(auth)}
                          >
                            🔄 Renouveler
                          </button>
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

      {/* Modal for Add/Renew */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {modalMode === 'add' 
                  ? '➕ Nouvelle Autorisation' 
                  : '🔄 Renouveler l\'Autorisation'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Voiture *</label>
                  <select
                    value={formData.voiture}
                    onChange={e => setFormData({...formData, voiture: e.target.value})}
                    required
                    disabled={modalMode === 'renew'}
                    className="form-select"
                  >
                    <option value="">Sélectionner une voiture</option>
                    {modalMode === 'add' ? (
                      availableCars.map(car => (
                        <option key={car.id} value={car.id}>
                          {car.immatriculation} - {car.marque} {car.modele}
                        </option>
                      ))
                    ) : (
                      <option value={formData.voiture}>
                        {selectedAuth?.car?.immatriculation} - {selectedAuth?.car?.marque} {selectedAuth?.car?.modele}
                      </option>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label>Date de délivrance *</label>
                  <input
                    type="date"
                    value={formData.date_delivrance}
                    onChange={e => setFormData({...formData, date_delivrance: e.target.value})}
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Date d'expiration *</label>
                  <input
                    type="date"
                    value={formData.date_expiration}
                    onChange={e => setFormData({...formData, date_expiration: e.target.value})}
                    required
                    min={formData.date_delivrance}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowModal(false)}
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                >
                  {modalMode === 'add' ? 'Ajouter' : 'Renouveler'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Autorisations;
