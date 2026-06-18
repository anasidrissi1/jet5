import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { carsService, visitesTechniquesService } from "../../services/api";
import { useNotification } from "../../contexts/NotificationContext";
import Loader from "../../components/Loader";
import exportExcel from "../../utils/exportExcel";
import "../../styles/autorisations.css";
function VisitesTechniques() {
  const [visites, setVisites] = useState([]);
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [modalMode] = useState('add');
  const [selectedVisite] = useState(null);
  const [formData, setFormData] = useState({
    voiture: "",
    date_visite: "",
    date_expiration: ""
  });
  const [pendingDelete, setPendingDelete] = useState(null);
  const [processingDelete, setProcessingDelete] = useState(false);
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
      }
    };
  }, []);

  // Fetch cars and visites
  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const carsRes = await carsService.list();
        const carsPayload = carsRes.data;
        const carsList = Array.isArray(carsPayload) ? carsPayload : carsPayload?.results ?? carsPayload?.items ?? [];
        
        const visitesRes = await visitesTechniquesService.list();
        const visitesPayload = visitesRes.data;
        const visitesList = Array.isArray(visitesPayload) ? visitesPayload : visitesPayload?.results ?? visitesPayload?.items ?? [];
        
        if (mounted) {
          setCars(carsList || []);
          setVisites(visitesList || []);
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

  // Get car details - use voiture_details from API or fallback to cars list
  const getCarDetails = useCallback((visite) => {
    return visite.voiture_details || cars.find(car => car.id === visite.voiture) || null;
  }, [cars]);

  // Calculate status with days remaining (7 days threshold)
  const getStatus = (dateExpiration) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(dateExpiration);
    exp.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { 
        status: 'expiré', 
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
    let filteredList = visites.map(visite => ({
      ...visite,
      car: getCarDetails(visite)
    }));

    if (filter !== 'all') {
      filteredList = filteredList.filter(visite => {
        const stat = getStatus(visite.date_expiration).status;
        if (filter === 'valide') return stat === 'valide';
        if (filter === 'expire_bientot') return stat === 'expire bientôt';
        if (filter === 'expire') return stat === 'expiré';
        return true;
      });
    }

    const q = query.trim().toLowerCase();
    if (q) {
      filteredList = filteredList.filter(visite => {
        const car = visite.car;
        return (
          (car?.immatriculation || '').toLowerCase().includes(q) ||
          (car?.marque || '').toLowerCase().includes(q) ||
          (car?.modele || '').toLowerCase().includes(q)
        );
      });
    }

    return filteredList;
  }, [visites, query, filter, getCarDetails]);

  // Calculate statistics based on actual data
  const stats = useMemo(() => {
    const valides = visites.filter(visite => getStatus(visite.date_expiration).status === 'valide').length;
    const expireBientot = visites.filter(visite => getStatus(visite.date_expiration).status === 'expire bientôt').length;
    const expirees = visites.filter(visite => getStatus(visite.date_expiration).status === 'expiré').length;

    return {
      total: visites.length,
      valides,
      expireBientot,
      expirees
    };
  }, [visites]);

  const handleAddNew = () => {
    navigate('/admin/visites-techniques/add');
  };

  const handleEdit = (visite) => {
    navigate('/admin/visites-techniques/add', { state: { visiteToEdit: visite } });
  };

  const buildDeletePayload = (visite) => {
    if (!visite) {
      return null;
    }
    const car = getCarDetails(visite);
    return {
      id: visite.id,
      car,
      date_visite: visite.date_visite,
      date_expiration: visite.date_expiration
    };
  };

  const requestDelete = (visite) => {
    const payload = buildDeletePayload(visite);
    if (!payload) {
      addNotification("Impossible d'initialiser la suppression", 'error');
      return;
    }
    setPendingDelete(payload);
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  };

  const closeDeleteModal = () => {
    if (processingDelete) {
      return;
    }
    setPendingDelete(null);
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    setProcessingDelete(true);
    try {
      await visitesTechniquesService.delete(pendingDelete.id);
      setVisites((prev) => prev.filter((item) => item.id !== pendingDelete.id));
      addNotification('Visite technique supprimée', 'success');
    } catch (err) {
      console.error('Erreur suppression visite technique:', err);
      addNotification("Suppression impossible", 'error');
    } finally {
      setProcessingDelete(false);
      setPendingDelete(null);
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.voiture || !formData.date_visite || !formData.date_expiration) {
      addNotification('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }

    try {
      const dataToSend = {
        voiture: parseInt(formData.voiture),
        date_visite: formData.date_visite,
        date_expiration: formData.date_expiration
      };

      await visitesTechniquesService.create(dataToSend);

      // Refresh data
      const res = await visitesTechniquesService.list();
      const payload = res.data;
      const list = Array.isArray(payload) ? payload : payload?.results ?? payload?.items ?? [];
      setVisites(list || []);
      
      setShowModal(false);
      addNotification(
        modalMode === 'add' 
          ? 'Visite technique ajoutée avec succès' 
          : 'Visite technique renouvelée avec succès',
        'success'
      );
    } catch (err) {
      console.error('Erreur lors de l\'enregistrement :', err);
      addNotification(
        err.response?.data?.detail || err.response?.data?.error || 'Erreur lors de l\'enregistrement',
        'error'
      );
    }
  };

  const handleExport = async () => {
    if (!filtered || filtered.length === 0) {
      addNotification('Aucune donnée à exporter', 'warning');
      return;
    }
    
    const rows = filtered.map(visite => {
      const car = visite.car;
      const stat = getStatus(visite.date_expiration);
      return {
        ID: visite.id,
        Immatriculation: car?.immatriculation || '-',
        Marque: car?.marque || '-',
        Modele: car?.modele || '-',
        Date_Visite: visite.date_visite || '-',
        Date_Expiration: visite.date_expiration || '-',
        Statut: stat.status,
        Jours_Restants: stat.days
      };
    });
    
    try {
      await exportExcel('visites_techniques.xlsx', rows, 'Visites Techniques');
      addNotification('Export réussi', 'success');
    } catch (err) {
      console.error('Erreur export:', err);
      addNotification('Erreur lors de l\'export', 'error');
    }
  };

  const availableCars = useMemo(() => {
    const carsWithValidVisite = visites
      .filter(visite => {
        const stat = getStatus(visite.date_expiration);
        return stat.status === 'valide';
      })
      .map(visite => visite.voiture);
    
    return cars.filter(car => !carsWithValidVisite.includes(car.id));
  }, [cars, visites]);

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
          <h1 className="cars-title">🔍 Visites Techniques</h1>
          <p className="cars-sub">Gestion des visites techniques des véhicules</p>
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
            <option value="expire_bientot">⚠️ Expire bientôt</option>
            <option value="expire">❌ Expirées</option>
          </select>
          <button className="add-button" onClick={handleAddNew}>
            Ajouter
          </button>
          <button className="export-button" onClick={handleExport} title="Exporter la liste">
            Exporter
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="kpis-grid">
        {/* Total */}
        <div className="kpi-card">
          <div className="kpi-content">
            <p className="kpi-label">Total Visites</p>
            <h2 className="kpi-value">{stats.total}</h2>
            <p className="kpi-sub">Visites enregistrées</p>
          </div>
        </div>

        {/* Valides */}
        <div className="kpi-card">
          <div className="kpi-content">
            <p className="kpi-label">Visites Valides</p>
            <h2 className="kpi-value">{stats.valides}</h2>
            <p className="kpi-sub">{stats.total > 0 ? ((stats.valides / stats.total) * 100).toFixed(1) : 0}% du total</p>
          </div>
        </div>

        {/* Expire Bientôt */}
        <div className="kpi-card">
          <div className="kpi-content">
            <p className="kpi-label">À Renouveler</p>
            <h2 className="kpi-value">{stats.expireBientot}</h2>
            <p className="kpi-sub">Expire dans ≤ 7 jours</p>
          </div>
        </div>

        {/* Expirées */}
        <div className="kpi-card">
          <div className="kpi-content">
            <p className="kpi-label">Visites Expirées</p>
            <h2 className="kpi-value">{stats.expirees}</h2>
            <p className="kpi-sub">Action requise</p>
          </div>
        </div>
      </div>

      <div className="cars-body">
        {error ? (
          <div className="cars-error">Erreur: {error}</div>
        ) : filtered.length === 0 ? (
          <div className="cars-empty">Aucune visite technique trouvée.</div>
        ) : (
          <>
            <div style={{
              background: 'var(--bg-card)',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-md)',
              overflow: 'hidden',
              maxHeight: '60vh',
              overflowY: 'auto',
              marginTop: '16px'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                tableLayout: 'fixed',
                background: 'var(--bg-card)'
              }}>
                <thead>
                  <tr style={{
                    background: 'linear-gradient(90deg, #dc2626 0%, #b91c1c 100%)',
                    color: 'white'
                  }}>
                    <th style={{padding: '16px', textAlign: 'left', fontWeight: '700', fontSize: '14px'}}>Immatriculation</th>
                    <th style={{padding: '16px', textAlign: 'left', fontWeight: '700', fontSize: '14px'}}>Marque / Modèle</th>
                    <th style={{padding: '16px', textAlign: 'left', fontWeight: '700', fontSize: '14px'}}>Date de visite</th>
                    <th style={{padding: '16px', textAlign: 'left', fontWeight: '700', fontSize: '14px'}}>Date d'expiration</th>
                    <th style={{padding: '16px', textAlign: 'right', fontWeight: '700', fontSize: '14px'}}>Montant</th>
                    <th style={{padding: '16px', textAlign: 'right', fontWeight: '700', fontSize: '14px'}}>Jours restants</th>
                    <th style={{padding: '16px', textAlign: 'center', fontWeight: '700', fontSize: '14px'}}>Statut</th>
                    <th style={{padding: '16px', textAlign: 'center', fontWeight: '700', fontSize: '14px'}}>Actions</th>
                  </tr>
                </thead>
                <tbody style={{ background: 'var(--bg-card)' }}>
                  {filtered.map(visite => {
                    const car = visite.car;
                    const stat = getStatus(visite.date_expiration);
                    return (
                      <tr key={visite.id}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          transition: 'all 0.2s',
                          cursor: 'pointer',
                          background: 'var(--bg-card)',
                          color: 'var(--text-primary)'
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.background = 'var(--bg-hover)';
                          e.currentTarget.style.transform = 'scale(1.01)';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.background = 'var(--bg-card)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500' }}><span style={{ fontSize: '13px', color: '#dc2626', background: 'rgba(220, 38, 38, 0.12)', border: '1px solid rgba(220, 38, 38, 0.35)', borderRadius: '6px', padding: '2px 8px', display: 'inline-block' }}>{car?.immatriculation || '-'}</span></td>
                        <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500' }}>{car?.marque || '-'} {car?.modele || ''}</td>
                        <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500' }}>{visite.date_visite || '-'}</td>
                        <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500' }}>{visite.date_expiration || '-'}</td>
                        <td style={{ padding: '16px', verticalAlign: 'middle', textAlign: 'right' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: '140px',
                              padding: '10px 20px',
                              borderRadius: '10px',
                              fontSize: '15px',
                              fontWeight: '700',
                              color: '#34d399',
                              background: 'rgba(16, 185, 129, 0.12)',
                              border: '1px solid rgba(16, 185, 129, 0.35)',
                              boxShadow: '0 10px 24px rgba(16, 185, 129, 0.15)',
                              letterSpacing: '0.02em'
                            }}
                          >
                            {visite.montant
                              ? `${Number(visite.montant).toLocaleString('fr-MA', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })} MAD`
                              : '-'}
                          </span>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right', fontSize: '14px', fontWeight: '500' }}>{stat.status === 'expiré' ? `Expiré depuis ${stat.days} jour(s)` : `${stat.days} jour(s)`}</td>
                        <td style={{ padding: '16px', textAlign: 'center' }}><span style={{ background: '#bbf7d0', color: '#059669', padding: '6px 18px', borderRadius: '20px', fontWeight: '700', fontSize: '14px', display: 'inline-block', minWidth: '90px', textAlign: 'center' }}>{stat.emoji} {stat.status}</span></td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '10px' }}>
                            <button
                              title="Modifier"
                              onClick={() => handleEdit(visite)}
                              style={{
                                padding: '10px',
                                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '18px',
                                fontWeight: '700',
                                transition: 'all 0.2s',
                                boxShadow: '0 2px 8px rgba(6, 182, 212, 0.3)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              ✏️
                            </button>
                            <button
                              title="Supprimer"
                              onClick={() => requestDelete(visite)}
                              style={{
                                padding: '10px',
                                background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '18px',
                                fontWeight: '700',
                                transition: 'all 0.2s',
                                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              🗑️
                            </button>
                          </div>
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

        {pendingDelete && (
          <div
            onClick={closeDeleteModal}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(2, 6, 23, 0.78)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9998,
              backdropFilter: 'blur(6px)',
              animation: 'fadeIn 0.25s ease'
            }}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              style={{
                width: 'min(420px, 90vw)',
                background: 'linear-gradient(160deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.9) 100%)',
                border: '1px solid rgba(148, 163, 184, 0.24)',
                borderRadius: '18px',
                padding: '32px',
                color: '#e2e8f0',
                boxShadow: '0 32px 90px rgba(2, 6, 23, 0.7)',
                animation: 'slideUp 0.28s ease'
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '18px',
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.18) 0%, rgba(248, 113, 113, 0.24) 100%)',
                  border: '1px solid rgba(248, 113, 113, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  color: '#fca5a5',
                  marginBottom: '24px'
                }}
              >
                🗑️
              </div>
              <h3 style={{ margin: '0 0 12px', fontSize: '22px', fontWeight: '700' }}>Supprimer cette visite technique ?</h3>
              <p style={{ margin: '0 0 20px', lineHeight: 1.6, color: '#cbd5f5' }}>
                La visite associée au véhicule{' '}
                <strong style={{ color: '#f87171' }}>{pendingDelete.car?.immatriculation || 'non renseigné'}</strong>{' '}
                sera supprimée définitivement.
                {pendingDelete.date_expiration ? (
                  <>
                    {' '}Expiration prévue le{' '}
                    <strong>{pendingDelete.date_expiration}</strong>.
                  </>
                ) : null}
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={processingDelete}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '10px',
                    border: '1px solid rgba(148, 163, 184, 0.35)',
                    background: 'rgba(15, 23, 42, 0.9)',
                    color: '#e2e8f0',
                    fontWeight: '600',
                    cursor: processingDelete ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={processingDelete}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                    color: '#fff',
                    fontWeight: '700',
                    cursor: processingDelete ? 'not-allowed' : 'pointer',
                    transition: 'opacity 0.2s',
                    opacity: processingDelete ? 0.7 : 1
                  }}
                >
                  {processingDelete ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Modal for Add/Renew */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>
                {modalMode === 'add' 
                  ? '➕ Nouvelle Visite Technique' 
                  : '🔄 Renouveler la Visite Technique'}
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
                        {selectedVisite?.car?.immatriculation} - {selectedVisite?.car?.marque} {selectedVisite?.car?.modele}
                      </option>
                    )}
                  </select>
                </div>

                <div className="responsive-grid-220" style={{ gap: '15px' }}>
                  <div className="form-group">
                    <label>Date de visite *</label>
                    <input
                      type="date"
                      value={formData.date_visite}
                      onChange={e => setFormData({...formData, date_visite: e.target.value})}
                      required
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #e6e9ef',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label>Date d'expiration *</label>
                    <input
                      type="date"
                      value={formData.date_expiration}
                      onChange={e => setFormData({...formData, date_expiration: e.target.value})}
                      required
                      min={formData.date_visite}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #e6e9ef',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>

                <div style={{ 
                  background: '#f3f4f6', 
                  padding: '12px', 
                  borderRadius: '6px', 
                  marginTop: '15px' 
                }}>
                  <small style={{ color: '#6b7280', fontSize: '12px' }}>
                    💡 <strong>Info:</strong> La visite technique est généralement valable 1 an. 
                    Vous recevrez une notification 7 jours avant l'expiration.
                  </small>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '10px 20px',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{
                    padding: '10px 20px',
                    background: '#0f766e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
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

export default VisitesTechniques;
