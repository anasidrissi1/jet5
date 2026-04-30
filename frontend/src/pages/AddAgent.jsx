import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import FormInput from '../components/FormInput';
import CheckboxField from '../components/CheckboxField';
import { useEntityForm } from '../hooks/useEntityForm';
import '../styles/pages.css';
import '../styles/cars.css';

function AddAgent(){
  const navigate = useNavigate();
  const initialValues = { nom: '', telephone_whatsapp: '', actif: true };
  const { form, setForm, loading, error, handleSubmit } = useEntityForm({
    fetchUrl: null,
    saveUrl: '/accounts/agents/',
    initialValues
  });

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      await handleSubmit();
      navigate('/admin/agents');
    } catch (_) {
      // error handled by hook
    }
  };

  return (
    <div className="cars-page">
      <PageHeader
        title="👤 Ajouter un agent"
        subtitle="Enregistrez un contact qui pourra recevoir les notifications."
        backUrl="/admin/agents"
      />

      <form className="simple-form-card" onSubmit={handleFormSubmit}>
          <FormInput
            label="Nom complet"
            name="nom"
            value={form.nom}
            onChange={handleChange}
            required
            placeholder="Ex: Ali Fallaoui"
          />

          <FormInput
            type="tel"
            label="Numéro de téléphone"
            name="telephone_whatsapp"
            value={form.telephone_whatsapp}
            onChange={handleChange}
            required
            placeholder="Ex: 0661472406 ou +212661472406"
          />
          <small className="form-hint">
            Format accepté: 06XXXXXXXX ou +212XXXXXXXXX
          </small>

          <CheckboxField
            name="actif"
            checked={form.actif}
            onChange={handleChange}
            label="Agent actif (recevra les notifications)"
          />

          {error && (
            <div className="simple-form-error">
              {typeof error === 'object' ? JSON.stringify(error) : error}
            </div>
          )}

          <div className="simple-form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/admin/agents')}
              disabled={loading}
            >
              Annuler
            </button>
            <button
              className="add-button"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Enregistrement...' : 'Ajouter'}
            </button>
          </div>
        </form>
    </div>
  );
}

export default AddAgent;
