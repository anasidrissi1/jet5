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

function Entretiens() {
  const navigate = useNavigate();
  const [entretiens, setEntretiens] = useState([]);
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [processingDelete, setProcessingDelete] = useState(false);
  const { addNotification } = useNotification();

  const typeEntretienChoices = [
    { value: 'vidange', label: 'Vidange', icon: '🛢️' },
    { value: 'pneus', label: 'Changement de pneus', icon: '🛞' },
    { value: 'freins', label: 'Révision des freins', icon: '🛑' },
    { value: 'batterie', label: 'Batterie', icon: '🔋' },
    { value: 'autre', label: 'Révision Générale', icon: '🔧' }
  ];

  // Fetch cars and entretiens
  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const carsRes = await apiClient.get('/cars/voitures/');
        const carsPayload = carsRes.data;
        const carsList = Array.isArray(carsPayload) ? carsPayload : carsPayload?.results ?? carsPayload?.items ?? [];

        const entretienRes = await apiClient.get('/cars/entretiens/');
        const entretienPayload = entretienRes.data;
        const entretienList = Array.isArray(entretienPayload) ? entretienPayload : entretienPayload?.results ?? entretienPayload?.items ?? [];

        if (mounted) {
          setCars(carsList || []);
          setEntretiens(entretienList || []);
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

  // Refresh data after adding/editing
  const refreshData = async () => {
    try {
      const entretienRes = await apiClient.get('/cars/entretiens/');
      const entretienPayload = entretienRes.data;
      const entretienList = Array.isArray(entretienPayload) ? entretienPayload : entretienPayload?.results ?? entretienPayload?.items ?? [];
      setEntretiens(entretienList || []);
    } catch (err) {
      console.error('Erreur lors du rafraîchissement :', err);
    }
  };

  // Get car details - use voiture_details from API or fallback to cars list
  const getCarDetails = (entretien) => {
    return entretien.voiture_details || cars.find(car => car.id === entretien.voiture) || null;
  };

  useEffect(() => () => {
    if (typeof document !== "undefined") {
      document.body.style.overflow = "";
    }
  }, []);



  // Filter and search
  const filtered = useMemo(() => {
    let filteredList = entretiens.map(entretien => ({
      ...entretien,
      car: getCarDetails(entretien)
    }));

    if (filter !== 'all') {
      filteredList = filteredList.filter(entretien => entretien.type_entretien === filter);
    }

    const q = query.trim().toLowerCase();
    if (q) {
      filteredList = filteredList.filter(entretien => {
        const car = entretien.car;
        const typeLabel = typeEntretienChoices.find(t => t.value === entretien.type_entretien)?.label || '';
        return (
          (car?.immatriculation || '').toLowerCase().includes(q) ||
          (car?.marque || '').toLowerCase().includes(q) ||
          (car?.modele || '').toLowerCase().includes(q) ||
          typeLabel.toLowerCase().includes(q)
        );
      });
    }

    return filteredList;
  }, [entretiens, cars, query, filter]);

  // Scroll infini : pas de pagination, tout s'affiche
  const paginatedData = filtered;

  // Calculate statistics based on actual data
  const stats = useMemo(() => {
    const coutTotal = entretiens.reduce((sum, entretien) => {
      return sum + (parseFloat(entretien.cout) || 0);
    }, 0);

    const aVenir = 0;

    const parType = typeEntretienChoices.map(type => ({
      type: type.label,
      count: entretiens.filter(e => e.type_entretien === type.value).length
    }));

    return {
      coutTotal,
      totalEntretiens: entretiens.length,
      aVenir,
      parType
    };
  }, [entretiens]);

  const handleAddNew = () => {
    navigate('/admin/entretiens/add');
  };

  const handleEdit = (entretien) => {
    navigate(`/admin/entretiens/edit/${entretien.id}`);
  };

  const buildDeletePayload = (entretien) => {
    if (!entretien) {
      return null;
    }
    const car = getCarDetails(entretien);
    return {
      id: entretien.id,
      type: entretien.type_entretien,
      date: entretien.date_entretien,
      cout: entretien.cout,
      car,
    };
  };

  const requestDelete = (entretien) => {
    const payload = buildDeletePayload(entretien);
    if (!payload) {
      addNotification("Impossible d'initialiser la suppression", "error");
      return;
    }
    setPendingDelete(payload);
    if (typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
    }
  };

  const closeDeleteModal = () => {
    if (processingDelete) {
      return;
    }
    setPendingDelete(null);
    if (typeof document !== "undefined") {
      document.body.style.overflow = "";
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    setProcessingDelete(true);
    try {
      await apiClient.delete(`/cars/entretiens/${pendingDelete.id}/`);

      const res = await apiClient.get('/cars/entretiens/');
      const payload = res.data;
      const list = Array.isArray(payload) ? payload : payload?.results ?? payload?.items ?? [];
      setEntretiens(list || []);

      addNotification('Entretien supprimé avec succès', 'success');
    } catch (err) {
      console.error('Erreur lors de la suppression :', err);
      addNotification(
        err.response?.data?.detail || 'Erreur lors de la suppression',
        'error'
      );
    } finally {
      setProcessingDelete(false);
      setPendingDelete(null);
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
      }
    }
  };

  const handleExport = async () => {
    if (!filtered || filtered.length === 0) {
      addNotification('Aucune donnée à exporter', 'warning');
      return;
    }
    
    const rows = filtered.map(entretien => {
      const car = entretien.car;
      const typeLabel = typeEntretienChoices.find(t => t.value === entretien.type_entretien)?.label || entretien.type_entretien;
      return {
        ID: entretien.id,
        Immatriculation: car?.immatriculation || '-',
        Marque: car?.marque || '-',
        Modele: car?.modele || '-',
        Type_Entretien: typeLabel,
        Date_Entretien: entretien.date_entretien || '-',
        Cout: entretien.cout || '-',
        Prochain_Entretien: entretien.prochain_entretien || '-'
      };
    });
    
    try {
      await exportExcel('entretiens.xlsx', rows, 'Entretiens');
      addNotification('Export réussi', 'success');
    } catch (err) {
      console.error('Erreur export:', err);
      addNotification('Erreur lors de l\'export', 'error');
    }
  };

  if (loading) {
    return (
      <div className="cars-page">
        <Loader />
      </div>
    );
  }

  return (
    <div className="cars-page">
      {/* Modern Header */}
      <div style={{
        background: 'linear-gradient(135deg, #f5c400 0%, #d4a900 100%)',
        padding: '32px',
        borderRadius: '12px',
        marginBottom: '24px',
        color: '#111827',
        boxShadow: '0 8px 24px rgba(212, 169, 0, 0.28)'
      }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', fontWeight: '800' }}>🔧 Gestion des Entretiens</h1>
        <p style={{ margin: 0, fontSize: '16px', opacity: 0.95 }}>Suivi et planification des maintenances véhicules</p>
      </div>

      {/* Search and Filters */}
      <div style={{
        background: 'var(--bg-card)',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{ flex: '1 1 300px' }}>
          <input
            style={{
              padding: '12px 16px',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '15px',
              width: '100%',
              transition: 'border-color 0.2s'
            }}
            placeholder="🔍 Rechercher par immatriculation, marque, type..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{
            padding: '12px 16px',
            border: '2px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '15px',
            minWidth: '180px',
            cursor: 'pointer'
          }}
        >
          <option value="all">📋 Tous les types</option>
          <option value="vidange">🛢️ Vidange</option>
          <option value="pneus">🛞 Pneus</option>
          <option value="freins">🛑 Freins</option>
          <option value="batterie">🔋 Batterie</option>
          <option value="autre">🔧 Révision Générale</option>
        </select>
        <button 
          onClick={handleAddNew}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #f5c400 0%, #d4a900 100%)',
            color: '#111827',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(212, 169, 0, 0.32)',
            transition: 'transform 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          ➕ Nouvel Entretien
        </button>
        <button 
          onClick={handleExport}
          style={{
            padding: '12px 24px',
            background: 'var(--bg-card)',
            color: '#059669',
            border: '2px solid #059669',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = '#059669';
            e.currentTarget.style.color = 'white';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = 'var(--bg-card)';
            e.currentTarget.style.color = '#059669';
          }}
        >
          📊 Exporter Excel
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="kpis-grid">
        <div className="kpi-card">
          <div className="kpi-content">
            <p className="kpi-label">Coût total</p>
            <h2 className="kpi-value">
              {stats.coutTotal.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
            </h2>
            <p className="kpi-sub">{stats.totalEntretiens} entretien(s)</p>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-content">
            <p className="kpi-label">Entretiens effectués</p>
            <h2 className="kpi-value">{stats.totalEntretiens}</h2>
            <p className="kpi-sub">Total des interventions</p>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-content">
            <p className="kpi-label">Type le plus fréquent</p>
            <h2 className="kpi-value">
              {stats.parType.length > 0 
                ? stats.parType.reduce((max, type) => type.count > max.count ? type : max, stats.parType[0]).type
                : '-'}
            </h2>
            <p className="kpi-sub">
              {stats.parType.length > 0 
                ? `${stats.parType.reduce((max, type) => type.count > max.count ? type : max, stats.parType[0]).count} fois`
                : 'Aucun entretien'}
            </p>
          </div>
        </div>
      </div>

      <div className="cars-body">
        {error ? (
          <div className="cars-error">Erreur: {error}</div>
        ) : filtered.length === 0 ? (
          <div className="cars-empty">Aucun entretien trouvé.</div>
        ) : (
          <>
            <div style={{
              background: 'var(--bg-card)',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              overflow: 'hidden',
              maxHeight: '60vh',
              overflowY: 'auto'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                tableLayout: 'fixed',
                background: 'var(--bg-card)'
              }}>
                <thead>
                  <tr style={{
                    background: 'linear-gradient(135deg, #f5c400 0%, #d4a900 100%)',
                    color: '#111827'
                  }}>
                    <th style={{padding: '16px', textAlign: 'left', fontWeight: '700', fontSize: '14px', width: '120px'}}>Marque</th>
                    <th style={{padding: '16px', textAlign: 'left', fontWeight: '700', fontSize: '14px', width: '120px'}}>Modèle</th>
                    <th style={{padding: '16px', textAlign: 'left', fontWeight: '700', fontSize: '14px', width: '140px'}}>Immatriculation</th>
                    <th style={{padding: '16px', textAlign: 'left', fontWeight: '700', fontSize: '14px', width: '160px'}}>Type d'entretien</th>
                    <th style={{padding: '16px', textAlign: 'left', fontWeight: '700', fontSize: '14px', width: '120px'}}>Date</th>
                    <th style={{padding: '16px', textAlign: 'right', fontWeight: '700', fontSize: '14px', width: '100px'}}>Coût</th>
                    <th style={{padding: '16px', textAlign: 'center', fontWeight: '700', fontSize: '14px', width: '200px'}}>Actions</th>
                  </tr>
                </thead>
                <tbody style={{ background: 'var(--bg-card)' }}>
                  {paginatedData.map(entretien => {
                    const car = entretien.car;
                    const typeData = typeEntretienChoices.find(t => t.value === entretien.type_entretien);
                    const typeLabel = typeData?.label || entretien.type_entretien;
                    // Afficher uniquement le label du type sélectionné
                    return (
                      <tr key={entretien.id}
                        style={{
                          borderBottom: '1px solid rgba(148, 163, 184, 0.18)',
                          transition: 'background 0.12s ease',
                          cursor: 'pointer',
                          background: 'var(--bg-card)',
                          color: 'var(--text-primary)'
                        }}
                        onClick={() => navigate(`/admin/entretiens/view/${entretien.id}`)}
                        onMouseOver={e => { e.currentTarget.style.background = 'rgba(245, 196, 0, 0.1)'; }}
                        onMouseOut={e => { e.currentTarget.style.background = 'var(--bg-card)'; }}
                      >
                        <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500' }}>{car?.marque || '-'}</td>
                        <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500' }}>{car?.modele || '-'}</td>
                        <td style={{ padding: '16px' }}>
                          <strong style={{ color: '#f5c400', fontSize: '15px', fontWeight: '700', letterSpacing: '0.5px' }}>{car?.immatriculation || '-'}</strong>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{
                            background: 'linear-gradient(135deg, #f5c400 0%, #d4a900 100%)',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#111827',
                            border: '1px solid #d4a900',
                            display: 'inline-block',
                            minWidth: '120px',
                            textAlign: 'center'
                          }}>{typeLabel}</span>
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500' }}>{entretien.date_entretien || '-'}</td>
                        <td style={{ padding: '16px', textAlign: 'right', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                          <span style={{ fontSize: '15px', fontWeight: '700', color: '#16a34a', background: 'rgba(22, 163, 74, 0.1)', padding: '6px 18px', borderRadius: '6px', border: '1px solid rgba(22, 163, 74, 0.35)', display: 'inline-block', minWidth: '90px', textAlign: 'center', lineHeight: '1.5', marginRight: '16px' }}>
                            {entretien.cout ? `${parseFloat(entretien.cout).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD` : '-'}
                          </span>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              title="Modifier"
                              onClick={(e) => { e.stopPropagation(); handleEdit(entretien); }}
                              style={{ padding: '10px', background: 'linear-gradient(135deg, #334155 0%, #1f2937 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '18px', fontWeight: '700', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.25)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.35)'; }}
                              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.25)'; }}
                            >
                              <span role="img" aria-label="modifier">✏️</span>
                            </button>
                            <button
                              title="Supprimer"
                              onClick={(e) => { e.stopPropagation(); requestDelete(entretien); }}
                              style={{ padding: '10px', background: 'linear-gradient(135deg, #f5c400 0%, #d4a900 100%)', color: '#111827', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '18px', fontWeight: '700', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(212, 169, 0, 0.3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(212, 169, 0, 0.4)'; }}
                              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(212, 169, 0, 0.3)'; }}
                            >
                              <span role="img" aria-label="supprimer">🗑️</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Pagination supprimée, scroll infini */}
            {pendingDelete && (
              <div
                className="assurance-modal-overlay"
                role="alertdialog"
                aria-modal="true"
                onClick={closeDeleteModal}
              >
                <div
                  className="assurance-confirm-card"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="assurance-confirm-icon">🛠️</div>
                  <h3 className="assurance-confirm-title">Supprimer cet entretien ?</h3>
                  <p className="assurance-confirm-text">
                    Cette action retirera l'entretien {pendingDelete.date ? `du ${pendingDelete.date}` : "sélectionné"}
                    {pendingDelete.car?.immatriculation ? (
                      <>
                        {" "}pour le véhicule <strong>{pendingDelete.car.immatriculation}</strong>
                      </>
                    ) : null}
                    . Cette opération est définitive.
                  </p>
                  {pendingDelete.cout && !Number.isNaN(Number.parseFloat(pendingDelete.cout)) && (
                    <div className="assurance-confirm-text" style={{ opacity: 0.85 }}>
                      Coût enregistré : <strong>{Number.parseFloat(pendingDelete.cout).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD</strong>
                    </div>
                  )}
                  <div className="assurance-confirm-actions">
                    <button
                      type="button"
                      className="assurance-confirm-btn cancel"
                      onClick={closeDeleteModal}
                      disabled={processingDelete}
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      className="assurance-confirm-btn danger"
                      onClick={confirmDelete}
                      disabled={processingDelete}
                    >
                      {processingDelete ? 'Suppression...' : 'Supprimer'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Entretiens;
