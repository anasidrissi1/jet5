import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../api/apiClient';
import '../styles/pages.css';
import '../styles/cars.css';
import PageHeader from '../components/PageHeader';
import FormInput from '../components/FormInput';
import SelectField from '../components/SelectField';
import { useEntityForm } from '../hooks/useEntityForm';
import { useNotification } from '../contexts/NotificationContext';

const normalizeCarStatus = (value) => {
  const status = (value || '').toString().trim().toLowerCase();

  if (['libre', 'disponible', 'available', 'free'].includes(status)) {
    return 'libre';
  }

  if ([
    'louee', 'loue', 'indisponible', 'unavailable',
    'reserve', 'reservee', 'occupe', 'occupee'
  ].includes(status)) {
    return 'louee';
  }

  if (['entretien', 'maintenance'].includes(status)) {
    return 'entretien';
  }

  if (['hors_service', 'hors service', 'out_of_service', 'hs'].includes(status)) {
    return 'hors_service';
  }

  return 'libre';
};

const normalizePublicFlag = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const normalized = String(value || '').toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

function AddCar(){
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { addNotification } = useNotification();

  const fetchUrl = isEdit ? `/cars/voitures/${id}/` : null;
  const saveUrl = '/cars/voitures/';
  const INITIAL = {
    marque:'', modele:'', immatriculation:'', couleur:'',
    kilometrage:'', statut:'libre', prix_journalier:'',
    carburant:'', transmission:'', categorie:'', annee:'',
    description:'', nombre_places:'', equipements:'',
    is_public: true,
    is_popular: false,
    image_principale: null,
    gallery_images: [],
  };

  const [popularSelectedCount, setPopularSelectedCount] = useState(0);

  const { form, setForm, loading, error, setError, setLoading } = useEntityForm({
    fetchUrl,
    saveUrl,
    initialValues: INITIAL
  });

  useEffect(() => {
    if (!isEdit) return;

    const nextStatus = normalizeCarStatus(form?.statut);
    const nextPublicFlag = normalizePublicFlag(form?.is_public);
    const nextPopularFlag = normalizePublicFlag(form?.is_popular);

    if (form?.statut !== nextStatus || form?.is_public !== nextPublicFlag || form?.is_popular !== nextPopularFlag) {
      setForm((prev) => ({
        ...prev,
        statut: nextStatus,
        is_public: nextPublicFlag,
        is_popular: nextPopularFlag,
      }));
    }
  }, [isEdit, form?.statut, form?.is_public, form?.is_popular, setForm]);

  useEffect(() => {
    let cancelled = false;

    const fetchPopularCount = async () => {
      try {
        const response = await apiClient.get('/cars/voitures/');
        const list = Array.isArray(response?.data?.results)
          ? response.data.results
          : Array.isArray(response?.data)
            ? response.data
            : [];

        const count = list.filter((car) => {
          const isPopular = normalizePublicFlag(car?.is_popular);
          if (!isPopular) return false;
          if (!id) return true;
          return String(car?.id) !== String(id);
        }).length;

        if (!cancelled) {
          setPopularSelectedCount(count);
        }
      } catch (countError) {
        console.error('Erreur chargement compteur voitures populaires', countError);
      }
    };

    fetchPopularCount();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleChange = (e) => setForm({...form, [e.target.name]: e.target.value});

  const handleVisibilityChange = (isPublic) => {
    setForm({
      ...form,
      is_public: isPublic,
      is_popular: isPublic ? form.is_popular : false,
    });
  };

  const handlePopularChange = (isPopular) => {
    if (isPopular && !form.is_popular && popularSelectedCount >= 3) {
      addNotification('Maximum 3 voitures populaires atteint. Desactivez une autre voiture d\'abord.', 'error');
      return;
    }

    setForm({
      ...form,
      is_popular: isPopular,
      is_public: isPopular ? true : form.is_public,
    });
  };

  const popularSlotsRemaining = useMemo(() => {
    return Math.max(0, 3 - popularSelectedCount - (form.is_popular ? 1 : 0));
  }, [popularSelectedCount, form.is_popular]);

  const focusField = (fieldName) => {
    const field = document.querySelector(`[name="${fieldName}"]`);
    if (field) {
      field.focus();
      field.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const validateForm = () => {
    const requiredFields = [
      { name: 'marque', label: 'la marque' },
      { name: 'modele', label: 'le modele' },
      { name: 'immatriculation', label: "l'immatriculation" },
      { name: 'prix_journalier', label: 'le prix journalier' },
    ];

    const missingField = requiredFields.find(({ name }) => {
      const value = form[name];
      return value === undefined || value === null || String(value).trim() === '';
    });

    if (missingField) {
      addNotification(`Veuillez renseigner ${missingField.label}.`, 'error');
      focusField(missingField.name);
      return false;
    }

    return true;
  };


  const handleFormSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        ...form,
        statut: normalizeCarStatus(form.statut),
        is_public: normalizePublicFlag(form.is_public),
        is_popular: normalizePublicFlag(form.is_popular),
      };

      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
          return;
        }
        if (key === 'images') {
          return;
        }
        if (key === 'image_principale') {
          if (value instanceof File) {
            formData.append(key, value);
          }
          return;
        }
        if (key === 'gallery_images') {
          if (Array.isArray(value)) {
            value.forEach((file) => {
              if (file instanceof File) {
                formData.append('gallery_images', file);
              }
            });
          }
          return;
        }
        formData.append(key, value);
      });

      const response = isEdit
        ? await apiClient.put(fetchUrl, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        : await apiClient.post(saveUrl, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });

      const data = response.data;
      const successMessage = isEdit 
        ? `Véhicule ${data.marque} ${data.modele} modifié avec succès`
        : `Véhicule ${data.marque} ${data.modele} ajouté avec succès`;
      addNotification(successMessage, 'success', { duration: 4000 });
      navigate('/admin/cars');
    } catch (err) {
      const errorMessage = err.response?.data?.message ||
        err.response?.data?.error ||
        err.response?.data ||
        'Erreur lors de l’enregistrement du véhicule';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cars-page">
      <PageHeader
        title={isEdit ? 'Modifier la voiture' : 'Ajouter une voiture'}
        subtitle={isEdit ? 'Mettez à jour les informations du véhicule' : 'Ajoutez un nouveau véhicule à la flotte'}
        backUrl="/admin/cars"
      />

      <form onSubmit={handleFormSubmit} className="car-form-modern" noValidate>
        <div className="car-form-layout">
          {/* Colonne de gauche - Formulaire */}
          <div className="car-form-main">
            <div className="car-form-card">
              <div className="car-form-card-header">
                <h3 className="car-card-title">Identification du véhicule</h3>
              </div>
              <div className="car-form-card-body">
                <div className="car-form-row">
                  <FormInput
                    label="Marque"
                    name="marque"
                    value={form.marque}
                    onChange={handleChange}
                    required
                    placeholder="Ex: Toyota, Renault, Kia..."
                  />
                  <FormInput
                    label="Modèle"
                    name="modele"
                    value={form.modele}
                    onChange={handleChange}
                    required
                    placeholder="Ex: Corolla, Clio, Picanto..."
                  />
                </div>
                <FormInput
                  label="Immatriculation"
                  name="immatriculation"
                  value={form.immatriculation}
                  onChange={handleChange}
                  required
                  placeholder="Ex: 12345-أ-67"
                  style={{ textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}
                  hint="Format marocain (chiffres-lettre-chiffres)"
                />
              </div>
            </div>

            <div className="car-form-card">
              <div className="car-form-card-header">
                <h3 className="car-card-title">Caractéristiques</h3>
              </div>
              <div className="car-form-card-body">
                <div className="car-form-row">
                  <SelectField
                    label="Catégorie"
                    name="categorie"
                    value={form.categorie}
                    onChange={handleChange}
                    className="form-input"
                    options={[
                      { value: '', label: '-- Sélectionner --' },
                      { value: 'economique', label: 'Économique' },
                      { value: 'berline', label: 'Berline' },
                      { value: 'suv', label: 'SUV' },
                      { value: 'luxe', label: 'Luxe' },
                      { value: 'utilitaire', label: 'Utilitaire' },
                      { value: 'familiale', label: 'Familiale' },
                    ]}
                  />
                  <FormInput
                    label="Couleur"
                    name="couleur"
                    value={form.couleur}
                    onChange={handleChange}
                    placeholder="Ex: Blanc, Noir, Bleu..."
                  />
                </div>
                <div className="car-form-row">
                  <SelectField
                    label="Carburant"
                    name="carburant"
                    value={form.carburant}
                    onChange={handleChange}
                    className="form-input"
                    options={[
                      { value: '', label: '-- Sélectionner --' },
                      { value: 'essence', label: 'Essence' },
                      { value: 'diesel', label: 'Diesel' },
                      { value: 'hybride', label: 'Hybride' },
                      { value: 'electrique', label: 'Électrique' },
                      { value: 'gpl', label: 'GPL' },
                    ]}
                  />
                  <SelectField
                    label="Transmission"
                    name="transmission"
                    value={form.transmission}
                    onChange={handleChange}
                    className="form-input"
                    options={[
                      { value: '', label: '-- Sélectionner --' },
                      { value: 'manuelle', label: 'Manuelle' },
                      { value: 'automatique', label: 'Automatique' },
                    ]}
                  />
                </div>
                <div className="car-form-row">
                  <FormInput
                    type="number"
                    label="Année"
                    name="annee"
                    value={form.annee}
                    onChange={handleChange}
                    placeholder="Ex: 2023"
                  />
                  <FormInput
                    type="number"
                    label="Kilométrage (km)"
                    name="kilometrage"
                    value={form.kilometrage}
                    onChange={handleChange}
                    placeholder="Ex: 50000"
                  />
                </div>
                <SelectField
                  label="Statut du véhicule"
                  name="statut"
                  value={form.statut}
                  onChange={handleChange}
                  className="form-input"
                  placeholder={null}
                  options={[
                    { value: 'libre', label: 'Disponible' },
                    { value: 'louee', label: 'Indisponible' },
                    { value: 'entretien', label: 'En entretien' },
                    { value: 'hors_service', label: 'Hors service' }
                  ]}
                  hint="Le statut peut être modifié ultérieurement"
                />
                <div style={{ marginTop: '0.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.95rem' }}>
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Décrivez le véhicule : confort, équipements, points forts..."
                    className="form-input"
                    rows={4}
                    style={{ resize: 'vertical', width: '100%' }}
                  />
                  <small style={{ display: 'block', marginTop: '0.35rem', opacity: 0.7 }}>
                    Cette description sera affichée sur la fiche publique du véhicule.
                  </small>
                </div>
                <div className="car-form-row" style={{ marginTop: '0.5rem' }}>
                  <FormInput
                    type="number"
                    label="Nombre de places"
                    name="nombre_places"
                    value={form.nombre_places}
                    onChange={handleChange}
                    placeholder="Ex: 5"
                  />
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.95rem' }}>
                    Équipements
                  </label>
                  <textarea
                    name="equipements"
                    value={form.equipements}
                    onChange={handleChange}
                    placeholder="GPS intégré, Caméra 360°, Climatisation, Sièges chauffants..."
                    className="form-input"
                    rows={3}
                    style={{ resize: 'vertical', width: '100%' }}
                  />
                  <small style={{ display: 'block', marginTop: '0.35rem', opacity: 0.7 }}>
                    Séparez les équipements par des virgules. Ils seront affichés sur la fiche publique.
                  </small>
                </div>
              </div>
            </div>

            <div className="car-form-card">
              <div className="car-form-card-header">
                <h3 className="car-card-title">Tarification & visibilité</h3>
              </div>
              <div className="car-form-card-body">
                <FormInput
                  type="number"
                  step="0.01"
                  label="Prix journalier (MAD)"
                  name="prix_journalier"
                  value={form.prix_journalier}
                  onChange={handleChange}
                  required
                  placeholder="Ex: 350.00"
                  hint="Tarif par jour de location"
                />
                <div className="car-visibility-card">
                  <div className="car-visibility-header">
                    <div>
                      <span className="car-visibility-label">Visibilite publique / vitrine</span>
                      <p className="car-visibility-help">
                        Active la voiture pour l'afficher dans le site public et la section vitrine, ou desactive-la pour la masquer.
                      </p>
                    </div>
                    <span className={`car-visibility-state ${form.is_public ? 'is-public' : 'is-private'}`}>
                      {form.is_public ? 'En vitrine' : 'Masquee'}
                    </span>
                  </div>
                  <div className="car-visibility-toggle" role="group" aria-label="Visibilite du vehicule sur le site public">
                    <button
                      type="button"
                      className={`car-visibility-option ${form.is_public ? 'active' : ''}`}
                      onClick={() => handleVisibilityChange(true)}
                    >
                      Afficher
                    </button>
                    <button
                      type="button"
                      className={`car-visibility-option ${!form.is_public ? 'active inactive' : ''}`}
                      onClick={() => handleVisibilityChange(false)}
                    >
                      Masquer
                    </button>
                  </div>
                </div>

                <div className="car-visibility-card" style={{ marginTop: '1rem' }}>
                  <div className="car-visibility-header">
                    <div>
                      <span className="car-visibility-label">Voiture populaire (Accueil)</span>
                      <p className="car-visibility-help">
                        Selectionnez cette voiture pour la section publique "Voitures populaires". Limite globale: 3 voitures.
                      </p>
                    </div>
                    <span className={`car-visibility-state ${form.is_popular ? 'is-public' : 'is-private'}`}>
                      {form.is_popular ? 'Selectionnee' : 'Non selectionnee'}
                    </span>
                  </div>

                  <p className="car-visibility-help" style={{ marginTop: 0 }}>
                    {form.is_popular
                      ? `Cette voiture prend 1 place populaire (${Math.max(0, 2 - popularSelectedCount)} place(s) restante(s)).`
                      : `${popularSlotsRemaining} place(s) populaire(s) restante(s).`}
                  </p>

                  <div className="car-visibility-toggle" role="group" aria-label="Selection voiture populaire">
                    <button
                      type="button"
                      className={`car-visibility-option ${form.is_popular ? 'active' : ''}`}
                      onClick={() => handlePopularChange(true)}
                      disabled={!form.is_popular && popularSelectedCount >= 3}
                    >
                      Selectionner
                    </button>
                    <button
                      type="button"
                      className={`car-visibility-option ${!form.is_popular ? 'active inactive' : ''}`}
                      onClick={() => handlePopularChange(false)}
                    >
                      Retirer
                    </button>
                  </div>
                </div>
                <div className="car-form-row" style={{ marginTop: '1rem' }}>
                  <label style={{ width: '100%' }}>
                    <span style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Image principale
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setForm({
                          ...form,
                          image_principale: e.target.files?.[0] || null,
                        })
                      }
                      className="form-input"
                    />
                    <small style={{ display: 'block', marginTop: '0.45rem', opacity: 0.8 }}>
                      Ce bouton permet d’ajouter l’image affichée sur le site public.
                    </small>
                    {form.image_principale instanceof File && (
                      <p style={{ marginTop: '0.5rem' }}>Image sélectionnée : {form.image_principale.name}</p>
                    )}
                    {typeof form.image_principale === 'string' && form.image_principale && (
                      <p style={{ marginTop: '0.5rem' }}>Image actuelle chargée.</p>
                    )}
                  </label>
                </div>
                <div className="car-form-row" style={{ marginTop: '1rem' }}>
                  <label style={{ width: '100%' }}>
                    <span style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Galerie d’images
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) =>
                        setForm({
                          ...form,
                          gallery_images: Array.from(e.target.files || []),
                        })
                      }
                      className="form-input"
                    />
                    <small style={{ display: 'block', marginTop: '0.45rem', opacity: 0.8 }}>
                      Tu peux sélectionner plusieurs images pour la fiche publique du véhicule.
                    </small>
                    {Array.isArray(form.gallery_images) && form.gallery_images.length > 0 && (
                      <p style={{ marginTop: '0.5rem' }}>
                        {form.gallery_images.length} image(s) sélectionnée(s)
                      </p>
                    )}
                  </label>
                </div>
              </div>
            </div>

            {error && (
              <div className="car-error-alert">
                <span className="error-icon">!</span>
                <span className="error-message">{typeof error === 'object' ? JSON.stringify(error) : error}</span>
              </div>
            )}
          </div>

          {/* Colonne de droite - Aperçu */}
          <div className="car-form-sidebar">
            <div className="car-preview-card">
              <div className="car-preview-header">
                <h3 className="car-preview-title">Aperçu du véhicule</h3>
              </div>
              <div className="car-preview-body">
                <div className="car-summary-card">
                  <div className="car-summary-item">
                    <div className="car-summary-icon" aria-hidden="true"></div>
                    <div className="car-summary-content">
                      <span className="car-summary-label">Véhicule</span>
                      <span className="car-summary-value">
                        {form.marque} {form.modele || '...'}
                      </span>
                    </div>
                  </div>

                  <div className="car-summary-item car-summary-highlight">
                    <div className="car-summary-icon" aria-hidden="true"></div>
                    <div className="car-summary-content">
                      <span className="car-summary-label">Immatriculation</span>
                      <span className="car-summary-value car-summary-immatriculation">
                        {form.immatriculation || 'Non renseignée'}
                      </span>
                    </div>
                  </div>

                  <div className="car-summary-item">
                    <div className="car-summary-icon" aria-hidden="true"></div>
                    <div className="car-summary-content">
                      <span className="car-summary-label">Couleur</span>
                      <span className="car-summary-value">{form.couleur || 'Non renseignée'}</span>
                    </div>
                  </div>

                  <div className="car-summary-item">
                    <div className="car-summary-icon" aria-hidden="true"></div>
                    <div className="car-summary-content">
                      <span className="car-summary-label">Catégorie</span>
                      <span className="car-summary-value">{form.categorie || 'Non renseignée'}</span>
                    </div>
                  </div>

                  <div className="car-summary-item">
                    <div className="car-summary-icon" aria-hidden="true"></div>
                    <div className="car-summary-content">
                      <span className="car-summary-label">Carburant</span>
                      <span className="car-summary-value">{form.carburant || 'Non renseigné'}</span>
                    </div>
                  </div>

                  <div className="car-summary-item">
                    <div className="car-summary-icon" aria-hidden="true"></div>
                    <div className="car-summary-content">
                      <span className="car-summary-label">Transmission</span>
                      <span className="car-summary-value">{form.transmission || 'Non renseignée'}</span>
                    </div>
                  </div>

                  <div className="car-summary-item">
                    <div className="car-summary-icon" aria-hidden="true"></div>
                    <div className="car-summary-content">
                      <span className="car-summary-label">Kilométrage</span>
                      <span className="car-summary-value">
                        {form.kilometrage ? `${parseInt(form.kilometrage).toLocaleString('fr-FR')} km` : 'Non renseigné'}
                      </span>
                    </div>
                  </div>

                  <div className="car-summary-item">
                    <div className="car-summary-icon" aria-hidden="true"></div>
                    <div className="car-summary-content">
                      <span className="car-summary-label">Statut</span>
                      <span className={`car-summary-badge status-${form.statut || 'unknown'}`}>
                        {form.statut === 'libre' && 'Disponible'}
                        {form.statut === 'louee' && 'Indisponible'}
                        {form.statut === 'entretien' && 'Entretien'}
                        {form.statut === 'hors_service' && 'Hors service'}
                        {!form.statut && 'Non défini'}
                      </span>
                    </div>
                  </div>

                  <div className="car-summary-item car-summary-price">
                    <div className="car-summary-icon" aria-hidden="true"></div>
                    <div className="car-summary-content">
                      <span className="car-summary-label">Prix journalier</span>
                      <span className="car-summary-value price">
                        {form.prix_journalier ? `${parseFloat(form.prix_journalier).toFixed(2)} MAD` : 'Non renseigné'}
                      </span>
                    </div>
                  </div>

                  <div className="car-summary-item">
                    <div className="car-summary-icon" aria-hidden="true"></div>
                    <div className="car-summary-content">
                      <span className="car-summary-label">Visibilite publique</span>
                      <span className={`car-summary-badge ${form.is_public ? 'status-libre' : 'status-hors_service'}`}>
                        {form.is_public ? 'Visible sur le site client' : 'Masquee cote client'}
                      </span>
                    </div>
                  </div>

                  {(typeof form.image_principale === 'string' && form.image_principale) && (
                    <div className="car-summary-item" style={{ display: 'block' }}>
                      <div className="car-summary-content" style={{ width: '100%' }}>
                        <span className="car-summary-label">Image actuelle</span>
                        <img
                          src={form.image_principale}
                          alt={`${form.marque || 'Voiture'} ${form.modele || ''}`.trim()}
                          style={{ width: '100%', marginTop: '0.75rem', borderRadius: '16px', objectFit: 'cover', maxHeight: '220px' }}
                        />
                      </div>
                    </div>
                  )}

                  {Array.isArray(form.images) && form.images.length > 0 && (
                    <div className="car-summary-item" style={{ display: 'block' }}>
                      <div className="car-summary-content" style={{ width: '100%' }}>
                        <span className="car-summary-label">Galerie actuelle</span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
                          {form.images.map((item) => (
                            <img
                              key={item.id}
                              src={item.image}
                              alt="Galerie véhicule"
                              style={{ width: '100%', borderRadius: '12px', objectFit: 'cover', maxHeight: '120px' }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="car-form-actions">
          <button
            type="submit"
            disabled={loading}
            className="btn-submit-car btn-primary"
          >
            {loading ? (
              <>
                <span className="spinner-small"></span>
                <span>{isEdit ? 'Modification en cours...' : 'Ajout en cours...'}</span>
              </>
            ) : (
              <span>{isEdit ? 'Enregistrer les modifications' : 'Ajouter la voiture'}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddCar;
