import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/apiClient";
import { useNotification } from "../contexts/NotificationContext";
import Loader from "../components/Loader";
import PageHeader from "../components/PageHeader";
import FormInput from "../components/FormInput";
import MultiSelect from "../components/forms/MultiSelect";
import VehicleSelectionBar from "../components/forms/VehicleSelectionBar";
import "../styles/pages.css";
import "../styles/cars.css";
import "../styles/autorisations.css";

function AddAutorisation() {
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVoitures, setSelectedVoitures] = useState([]);
  const [formData, setFormData] = useState({
    date_delivrance: new Date().toISOString().split('T')[0],
    date_expiration: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  // Fetch cars and existing autorisations to get available cars
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const carsRes = await apiClient.get('/cars/voitures/');
        const carsPayload = carsRes.data;
        const carsList = Array.isArray(carsPayload) ? carsPayload : carsPayload?.results ?? carsPayload?.items ?? [];
        
        const authRes = await apiClient.get('/cars/autorisations/');
        const authPayload = authRes.data;
        const authList = Array.isArray(authPayload) ? authPayload : authPayload?.results ?? authPayload?.items ?? [];
        
        // Filter cars that don't have valid authorization
        const carsWithValidAuth = authList
          .filter(auth => {
            const today = new Date();
            const exp = new Date(auth.date_expiration);
            return exp > today; // Valid authorization
          })
          .map(auth => auth.voiture);
        
        const availableCars = carsList.filter(car => !carsWithValidAuth.includes(car.id));
        setCars(availableCars || []);
      } catch (err) {
        console.error('Erreur lors du chargement des données :', err);
        addNotification(err.response?.data?.detail || 'Erreur lors du chargement', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [addNotification]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedVoitures.length === 0 || !formData.date_delivrance || !formData.date_expiration) {
      addNotification('Veuillez sélectionner au moins une voiture et remplir toutes les dates', 'error');
      return;
    }

    setLoading(true);
    try {
      // Créer une autorisation pour chaque voiture sélectionnée
      const promises = selectedVoitures.map(voitureId => 
        apiClient.post('/cars/autorisations/', {
          voiture: parseInt(voitureId),
          date_delivrance: formData.date_delivrance,
          date_expiration: formData.date_expiration
        })
      );

      await Promise.all(promises);
      
      const message = selectedVoitures.length === 1 
        ? 'Autorisation ajoutée avec succès'
        : `${selectedVoitures.length} autorisations ajoutées avec succès`;
      
      addNotification(message, 'success');
      navigate('/admin/autorisations');
    } catch (err) {
      console.error('Erreur lors de l\'enregistrement :', err);
      addNotification(
        err.response?.data?.detail || err.response?.data?.error || 'Erreur lors de l\'enregistrement',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="cars-page">
      <PageHeader
        title="📄 Nouvelle Autorisation"
        subtitle="Saisir les informations de la nouvelle autorisation de circulation"
        backUrl="/admin/autorisations"
      />

      <div className="cars-body" style={{ padding: '0 20px' }}>
        <div className="modal-content-large" style={{ margin: '0 auto', maxWidth: '1100px', padding: '20px' }}>
          <form onSubmit={handleSubmit}>
            <div className="modal-body" style={{ padding: '0' }}>
              {/* Disposition en 2 colonnes */}
              <div className="auto-form-grid">
                {/* Colonne gauche - Sélection */}
                <div className="step-content" style={{ margin: '0' }}>
                  <h3 className="step-title" style={{ fontSize: '16px', marginBottom: '12px' }}>
                    🚗 Sélection des véhicules
                  </h3>
                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label className="form-label" style={{ fontSize: '13px', marginBottom: '6px' }}>Voitures *</label>
                    <MultiSelect
                      options={cars}
                      selectedValues={selectedVoitures}
                      onChange={setSelectedVoitures}
                      placeholder="-- Sélectionner des voitures --"
                      labelKey={(car) => `${car.marque || ''} ${car.modele || ''}`.trim() || car.immatriculation}
                      secondaryLabelKey={(car) => `📋 ${car.immatriculation || 'Immatriculation inconnue'}`}
                      emptyState="🚗 Aucune voiture disponible"
                      disabled={loading}
                    />
                    <VehicleSelectionBar
                      vehicles={cars}
                      selectedIds={selectedVoitures}
                      onRemove={(id) => setSelectedVoitures((prev) => prev.filter((item) => item !== id))}
                      onClear={() => setSelectedVoitures([])}
                    />
                  </div>
                </div>

                {/* Colonne droite - Dates */}
                <div className="step-content" style={{ margin: '0' }}>
                  <h3 className="step-title" style={{ fontSize: '16px', marginBottom: '12px' }}>
                    📅 Dates de l'autorisation
                  </h3>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <FormInput
                      type="date"
                      label="Date de délivrance *"
                      name="date_delivrance"
                      value={formData.date_delivrance}
                      onChange={e => setFormData({...formData, date_delivrance: e.target.value})}
                      required
                      style={{ padding: '8px' }}
                    />
                  </div>
                  <div className="form-group">
                    <FormInput
                      type="date"
                      label="Date d'expiration *"
                      name="date_expiration"
                      value={formData.date_expiration}
                      onChange={e => setFormData({...formData, date_expiration: e.target.value})}
                      required
                      min={formData.date_delivrance}
                      style={{ padding: '8px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Résumé */}
              <div className="resume-card" style={{ marginTop: '0', padding: '16px' }}>
                <h4 className="resume-title" style={{ fontSize: '15px', marginBottom: '12px' }}>
                  📋 Résumé
                </h4>
                <div className="resume-grid" style={{ gap: '12px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span className="resume-label" style={{ fontSize: '12px' }}>Voitures sélectionnées ({selectedVoitures.length}):</span>
                    <div style={{ display: 'grid', gap: '6px', marginTop: '6px' }}>
                      {selectedVoitures.length === 0 ? (
                        <em style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Aucune voiture sélectionnée</em>
                      ) : (
                        selectedVoitures.map(voitureId => {
                          const car = cars.find(c => c.id.toString() === voitureId);
                          return car ? (
                            <div key={voitureId} style={{ 
                              padding: '6px 10px', 
                              background: 'var(--bg-secondary)', 
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '13px'
                            }}>
                              <span style={{ fontSize: '14px' }}>🚗</span>
                              <strong style={{ color: 'var(--text-primary)' }}>{car.marque} {car.modele}</strong>
                              <span style={{ color: 'var(--text-secondary)' }}>•</span>
                              <span style={{ color: 'var(--text-secondary)' }}>{car.immatriculation}</span>
                            </div>
                          ) : null;
                        })
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="resume-label" style={{ fontSize: '12px' }}>Durée de validité:</span>
                    <br />
                    <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
                      {formData.date_delivrance && formData.date_expiration ? 
                        Math.ceil((new Date(formData.date_expiration) - new Date(formData.date_delivrance)) / (1000 * 60 * 60 * 24)) + ' jours'
                        : '-'
                      }
                    </strong>
                  </div>
                  <div>
                    <span className="resume-label">Période:</span>
                    <br />
                    <strong>{formData.date_delivrance} → {formData.date_expiration}</strong>
                  </div>
                  <div>
                    <span className="resume-label">Statut:</span>
                    <br />
                    <strong className="resume-montant">
                      ✅ Nouvelle autorisation
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer form-footer-responsive">
              <button
                type="button"
                onClick={() => navigate('/admin/autorisations')}
                className="btn-secondary"
                disabled={loading}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn-success"
                disabled={loading || selectedVoitures.length === 0 || !formData.date_delivrance || !formData.date_expiration}
              >
                {loading ? '⏳ Ajout en cours...' : `✅ Ajouter ${selectedVoitures.length} Autorisation${selectedVoitures.length > 1 ? 's' : ''}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddAutorisation;