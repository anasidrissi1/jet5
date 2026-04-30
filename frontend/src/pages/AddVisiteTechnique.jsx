import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useNotification } from '../contexts/NotificationContext';
import PageHeader from '../components/PageHeader';
import FormInput from '../components/FormInput';
import MultiSelect from '../components/forms/MultiSelect';
import VehicleSelectionBar from '../components/forms/VehicleSelectionBar';
import '../styles/autorisations.css';

const AddVisiteTechnique = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addNotification } = useNotification();
  
  const visiteToEdit = location.state?.visiteToEdit;
  const isEditMode = !!visiteToEdit;
  
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVoitures, setSelectedVoitures] = useState(isEditMode ? [visiteToEdit.voiture.toString()] : []);
  const [formData, setFormData] = useState({
    date_visite: isEditMode ? visiteToEdit.date_visite : new Date().toISOString().split('T')[0],
    date_expiration: isEditMode ? visiteToEdit.date_expiration : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    montant: isEditMode ? (visiteToEdit.montant || '') : ''
  });

  useEffect(() => {
    fetchCars();
  }, []);

  const fetchCars = async () => {
    try {
      const response = await apiClient.get('/cars/voitures/');
      const carsData = Array.isArray(response.data) ? response.data : response.data?.results || [];
      setCars(carsData);
    } catch (error) {
      console.error('Erreur lors du chargement des voitures:', error);
      addNotification('Erreur lors du chargement des voitures', 'error');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-calculer la date d'expiration (1 an après la visite)
    if (name === 'date_visite' && value) {
      const dateVisite = new Date(value);
      const dateExpiration = new Date(dateVisite);
      dateExpiration.setFullYear(dateExpiration.getFullYear() + 1);
      
      setFormData(prev => ({
        ...prev,
        date_expiration: dateExpiration.toISOString().split('T')[0]
      }));
    }
  };

  const validateForm = () => {
    if (selectedVoitures.length === 0) {
      addNotification('Veuillez sélectionner au moins une voiture', 'error');
      return false;
    }
    if (!formData.date_visite) {
      addNotification('Veuillez saisir la date de visite', 'error');
      return false;
    }
    if (!formData.date_expiration) {
      addNotification('Veuillez saisir la date d\'expiration', 'error');
      return false;
    }
    
    const dateVisite = new Date(formData.date_visite);
    const dateExpiration = new Date(formData.date_expiration);
    
    if (dateExpiration <= dateVisite) {
      addNotification('La date d\'expiration doit être postérieure à la date de visite', 'error');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedVoitures.length === 0 || !formData.date_visite || !formData.date_expiration) {
      addNotification('Veuillez sélectionner au moins une voiture et remplir toutes les dates', 'error');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      if (isEditMode) {
        // Mode édition - PUT pour mettre à jour la visite existante
        await apiClient.put(`/cars/visites/${visiteToEdit.id}/`, {
          voiture: parseInt(selectedVoitures[0]),
          date_visite: formData.date_visite,
          date_expiration: formData.date_expiration,
          montant: formData.montant || null
        });
        
        addNotification('Visite technique modifiée avec succès', 'success');
        navigate('/admin/visites-techniques');
      } else {
        // Mode création - POST pour créer une visite pour chaque voiture sélectionnée
        const promises = selectedVoitures.map(voitureId => 
          apiClient.post('/cars/visites/', {
            voiture: parseInt(voitureId),
            date_visite: formData.date_visite,
            date_expiration: formData.date_expiration,
            montant: formData.montant || null
          })
        );

        await Promise.all(promises);
        
        const message = selectedVoitures.length === 1 
          ? 'Visite technique ajoutée avec succès'
          : `${selectedVoitures.length} visites techniques ajoutées avec succès`;
        
        addNotification(message, 'success');
        navigate('/admin/visites-techniques');
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Erreur lors de l\'ajout de la visite technique';
      addNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cars-page">
      <PageHeader
        title={isEditMode ? '✏️ Modifier Visite Technique' : '🔧 Nouvelle Visite Technique'}
        subtitle="Enregistrer une nouvelle visite technique"
        backUrl="/admin/visites-techniques"
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
                  <div className="form-group">
                    <label className="form-label">
                      Voitures <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
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

                {/* Colonne droite - Informations */}
                <div className="step-content" style={{ margin: '0' }}>
                  <h3 className="step-title" style={{ fontSize: '16px', marginBottom: '12px' }}>
                    📅 Informations de la visite
                  </h3>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <FormInput
                      type="date"
                      label={<>Date de Visite <span style={{ color: 'var(--color-danger)' }}>*</span></>}
                      name="date_visite"
                      value={formData.date_visite}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                      disabled={loading}
                      style={{ padding: '8px' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <FormInput
                      type="date"
                      label={<>Date d'Expiration <span style={{ color: 'var(--color-danger)' }}>*</span></>}
                      name="date_expiration"
                      value={formData.date_expiration}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                      disabled={loading}
                      style={{ padding: '8px' }}
                    />
                    <small className="form-hint" style={{ fontSize: '11px', marginTop: '4px' }}>
                      💡 Généralement 1 an après la date de visite
                    </small>
                  </div>
                  <div className="form-group">
                    <FormInput
                      type="number"
                      step="0.01"
                      label="Montant (MAD)"
                      name="montant"
                      value={formData.montant}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Ex: 500.00"
                      disabled={loading}
                      style={{ padding: '8px' }}
                    />
                    <small className="form-hint" style={{ fontSize: '11px', marginTop: '4px' }}>
                      💵 Montant de la visite technique en dirhams
                    </small>
                  </div>
                </div>
              </div>

              {/* Résumé de la visite technique */}
              {selectedVoitures.length > 0 && formData.date_visite && (
                <div className="resume-card" style={{ marginTop: '0', padding: '16px' }}>
                  <h4 className="resume-title" style={{ fontSize: '15px', marginBottom: '12px' }}>
                    📋 Résumé de la Visite Technique
                  </h4>
                  <div className="resume-grid" style={{ gap: '12px' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span className="resume-label" style={{ fontSize: '12px' }}>Voitures sélectionnées:</span>
                      <div style={{ display: 'grid', gap: '6px', marginTop: '6px' }}>
                        {selectedVoitures.map(voitureId => {
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
                        })}
                      </div>
                    </div>
                    <div>
                      <span className="resume-label" style={{ fontSize: '12px' }}>Date de visite:</span>
                      <br />
                      <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
                        {formData.date_visite ? new Date(formData.date_visite).toLocaleDateString('fr-FR', { 
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }) : '-'}
                      </strong>
                    </div>
                    <div>
                      <span className="resume-label" style={{ fontSize: '12px' }}>Date d'expiration:</span>
                      <br />
                      <strong className="resume-montant" style={{ fontSize: '13px' }}>
                        {formData.date_expiration ? new Date(formData.date_expiration).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }) : '-'}
                      </strong>
                    </div>
                    <div>
                      <span className="resume-label" style={{ fontSize: '12px' }}>Montant:</span>
                      <br />
                      <strong className="resume-montant" style={{ fontSize: '13px' }}>
                        {formData.montant ? `${parseFloat(formData.montant).toFixed(2)} MAD` : '-'}
                      </strong>
                    </div>
                    {formData.date_visite && formData.date_expiration && (
                      <div>
                        <span className="resume-label" style={{ fontSize: '12px' }}>Durée de validité:</span>
                        <br />
                        <strong style={{ color: 'var(--color-info)', fontSize: '13px' }}>
                          {Math.round((new Date(formData.date_expiration) - new Date(formData.date_visite)) / (1000 * 60 * 60 * 24))} jours
                        </strong>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Navigation */}
            <div className="modal-footer form-footer-responsive">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate('/admin/visites-techniques')}
                disabled={loading}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn-success"
                disabled={loading || selectedVoitures.length === 0 || !formData.date_visite}
              >
                {loading ? '⏳ Ajout en cours...' : `✅ Ajouter ${selectedVoitures.length > 0 ? selectedVoitures.length : ''} Visite${selectedVoitures.length > 1 ? 's' : ''}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddVisiteTechnique;