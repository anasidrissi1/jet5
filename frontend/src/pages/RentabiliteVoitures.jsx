import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import exportExcel from '../utils/exportExcel';
import '../styles/rentabilite.css';

const formatCurrency = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? `${numeric.toLocaleString('fr-MA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} MAD`
    : '0 MAD';
};

const normalizeText = (value) => (value ?? '').toString().toLowerCase();

const getSortableValue = (voiture, key) => {
  const raw = voiture?.[key];
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : 0;
};

function RentabiliteVoitures() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periode, setPeriode] = useState('12'); // 6 ou 12 mois
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('total_revenus'); // total_revenus, taux_occupation, etc.
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedVoiture, setSelectedVoiture] = useState(null); // Pour gérer le modal

  useEffect(() => {
    fetchData();
  }, [periode]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/cars/rentabilite/?mois=${periode}`);
      setData(response.data);
    } catch (err) {
      console.error('Erreur chargement rentabilité:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!data || !data.voitures) return;
    
    const exportData = data.voitures.map(v => ({
      'Marque': v.marque,
      'Modèle': v.modele,
      'Immatriculation': v.immatriculation,
      'Revenus Totaux (MAD)': v.total_revenus,
      'Nombre de Locations': v.total_locations,
      'Jours Loués': v.total_jours_loues,
      'Taux d\'Occupation (%)': v.taux_occupation,
      'Revenu Moyen/Jour (MAD)': v.revenu_moyen_par_jour,
      'Prix Journalier (MAD)': v.prix_journalier,
      'Statut': v.statut
    }));
    
    exportExcel(exportData, 'Rentabilite_Voitures');
  };

  const filteredVoitures = data?.voitures?.filter(v => {
    const query = normalizeText(searchQuery);
    if (!query) return true;
    return (
      normalizeText(v.marque).includes(query) ||
      normalizeText(v.modele).includes(query) ||
      normalizeText(v.immatriculation).includes(query)
    );
  }) || [];

  const sortedVoitures = [...filteredVoitures].sort((a, b) => {
    const aVal = getSortableValue(a, sortBy);
    const bVal = getSortableValue(b, sortBy);
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });

  if (loading) {
    return (
      <div className="rentabilite-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Chargement des données de rentabilité...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rentabilite-page">
        <div className="error-state">
          <p>❌ Erreur: {error}</p>
          <button onClick={fetchData} className="btn-retry">Réessayer</button>
        </div>
      </div>
    );
  }

  const stats = data?.statistiques || {};

  return (
    <div className="rentabilite-page">
      {/* Header */}
      <div className="rentabilite-header">
        <div>
          <h1>💰 Rentabilité par Voiture</h1>
          <p className="subtitle">Analyse détaillée des revenus de chaque véhicule</p>
        </div>
        <div className="header-actions">
          <select 
            value={periode} 
            onChange={(e) => setPeriode(e.target.value)}
            className="periode-select"
          >
            <option value="6">6 derniers mois</option>
            <option value="12">12 derniers mois</option>
          </select>
          <button onClick={handleExport} className="btn-export">
            📊 Exporter Excel
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpis-grid">
        <div className="kpi-card">
          <div className="kpi-content">
            <p className="kpi-label">Revenus Totaux</p>
            <h2 className="kpi-value">{formatCurrency(stats.total_revenus_global)}</h2>
          </div>
        </div> 
        
        <div className="kpi-card">
          <div className="kpi-content">
            <p className="kpi-label">Voiture la Plus Rentable</p>
            <h2 className="kpi-value">
              {stats.voiture_plus_rentable ? 
                `${stats.voiture_plus_rentable.marque} ${stats.voiture_plus_rentable.modele}` : 
                'N/A'}
            </h2>
            <p className="kpi-sub">{formatCurrency(stats.voiture_plus_rentable?.revenus)}</p>
          </div>
        </div> 
        
        <div className="kpi-card">
          <div className="kpi-content">
            <p className="kpi-label">Moyenne par Voiture</p>
            <h2 className="kpi-value">{formatCurrency(stats.moyenne_revenus_par_voiture)}</h2>
          </div>
        </div> 
        
        <div className="kpi-card">
          <div className="kpi-content">
            <p className="kpi-label">Taux d'Occupation Moyen</p>
            <h2 className="kpi-value">{(Number(stats.taux_occupation_moyen) || 0).toFixed(1)}%</h2>
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="filters-bar">
        <input
          type="text"
          placeholder="🔍 Rechercher une voiture..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <div className="sort-controls">
          <label>Trier par:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="total_revenus">Revenus Totaux</option>
            <option value="taux_occupation">Taux d'Occupation</option>
            <option value="total_locations">Nombre de Locations</option>
            <option value="revenu_moyen_par_jour">Revenu Moyen/Jour</option>
          </select>
          <button 
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="btn-sort"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Tableau détaillé */}
      <div className="rentabilite-table-container">
        <table className="rentabilite-table">
          <thead>
            <tr>
              <th>Voiture</th>
              <th>Revenus Totaux</th>
              <th>Locations</th>
              <th>Jours Loués</th>
              <th>Taux Occupation</th>
              <th>Revenu Moy/Jour</th>
              <th>Détails Mensuels</th>
            </tr>
          </thead>
          <tbody>
            {sortedVoitures.map((voiture) => (
              <tr key={voiture.id}>
                <td>
                  <div className="voiture-info">
                    <div className="voiture-icon">🚗</div>
                    <div>
                      <div className="voiture-name">{voiture.marque} {voiture.modele}</div>
                      <div className="voiture-immat">{voiture.immatriculation}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="revenue-amount">{voiture.total_revenus.toLocaleString()} MAD</span>
                </td>
                <td>{voiture.total_locations}</td>
                <td>{voiture.total_jours_loues} jours</td>
                <td>
                  <div className="occupation-bar">
                    <div 
                      className="occupation-fill" 
                      style={{width: `${voiture.taux_occupation}%`}}
                    ></div>
                    <span className="occupation-text">{voiture.taux_occupation}%</span>
                  </div>
                </td>
                <td>{voiture.revenu_moyen_par_jour.toLocaleString()} MAD</td>
                <td>
                  <button 
                    className="btn-details"
                    onClick={() => setSelectedVoiture(voiture)}
                  >
                    📊 Voir Détails
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal pour détails mensuels - UN SEUL modal contrôlé par state */}
      {selectedVoiture && (
        <div className="modal-overlay" style={{display: 'flex'}}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>📊 Détails Mensuels - {selectedVoiture.marque} {selectedVoiture.modele}</h2>
              <button 
                className="modal-close"
                onClick={() => setSelectedVoiture(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="monthly-details">
                <table className="monthly-table">
                  <thead>
                    <tr>
                      <th>Mois</th>
                      <th>Revenus</th>
                      <th>Jours Loués</th>
                      <th>Locations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedVoiture.revenus_par_mois.map((mois, idx) => (
                      <tr key={idx}>
                        <td>{mois.mois}</td>
                        <td className="revenue-cell">{mois.revenus.toLocaleString()} MAD</td>
                        <td>{mois.jours_loues} jours</td>
                        <td>{mois.nb_locations}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td><strong>TOTAL</strong></td>
                      <td><strong>{selectedVoiture.total_revenus.toLocaleString()} MAD</strong></td>
                      <td><strong>{selectedVoiture.total_jours_loues} jours</strong></td>
                      <td><strong>{selectedVoiture.total_locations}</strong></td>
                    </tr>
                  </tfoot>
                </table>
                
                {/* Graphique simple */}
                <div className="monthly-chart">
                  <h3>Évolution des Revenus</h3>
                  <div className="chart-bars">
                    {selectedVoiture.revenus_par_mois.map((mois, idx) => {
                      const maxRevenu = Math.max(...selectedVoiture.revenus_par_mois.map(m => m.revenus));
                      const height = maxRevenu > 0 ? (mois.revenus / maxRevenu * 100) : 0;
                      return (
                        <div key={idx} className="chart-bar-container">
                          <div 
                            className="chart-bar" 
                            style={{height: `${height}%`}}
                            title={`${mois.mois}: ${mois.revenus} MAD`}
                          ></div>
                          <span className="chart-label">{mois.mois.split(' ')[0]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RentabiliteVoitures;
