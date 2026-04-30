import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import PageHeader from '../components/PageHeader';
import FormInput from '../components/FormInput';
import { useEntityForm } from '../hooks/useEntityForm';
import '../styles/pages.css';

function AddPayment(){
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const initialValues = { reservation:'', amount:'', method:'CARD', status:'PENDING' };
  const { form, setForm, loading, error, handleSubmit } = useEntityForm({
    fetchUrl: null,
    saveUrl: '/payments/payments/',
    initialValues
  });

  const preventNumberScroll = (event) => {
    // Avoid wheel/trackpad from changing numeric-like inputs when focused
    event.preventDefault();
    event.stopPropagation();
  };

  useEffect(()=>{
    const load = async ()=>{
      try{
        const res = await apiClient.get('/reservations/');
        const payload = res.data;
        const list = Array.isArray(payload) ? payload : payload.results ?? payload.items ?? [];
        setReservations(list || []);
      }catch(err){ console.error(err); }
    };
    load();
  },[]);

  const handleChange = (e) => setForm({...form, [e.target.name]: e.target.value});

  const handleFormSubmit = async (e) =>{
    e.preventDefault();
    try{
      await handleSubmit();
      navigate('/admin/payments');
    }catch(_){
      // hook handles error
    }
  };

  return (
    <div className="cars-page">
      <PageHeader
        title="💳 Ajouter un paiement"
        subtitle="Renseignez la réservation, le montant et la méthode de règlement."
        backUrl="/admin/payments"
      />

      <form className="simple-form-card" onSubmit={handleFormSubmit}>
          <SelectField
            label="Réservation"
            name="reservation"
            value={form.reservation}
            onChange={handleChange}
            required
            options={reservations}
            renderOption={(r) => (
              <option key={r.id} value={r.id}>
                #{r.id} — {r.voiture ? r.voiture : 'voiture'} — {r.client ? r.client : 'client'}
              </option>
            )}
          />

          <FormInput
            type="text"
            label="Montant (MAD)"
            inputMode="decimal"
            pattern="[0-9]*[.,]?[0-9]*"
            name="amount"
            value={form.amount}
            onChange={handleChange}
            onWheel={preventNumberScroll}
            onWheelCapture={preventNumberScroll}
            required
            placeholder="Ex: 500.00"
          />
          <small className="form-hint">Utilisez un point pour les décimales.</small>

          <SelectField
            label="Méthode de paiement"
            name="method"
            value={form.method}
            onChange={handleChange}
            placeholder={null}
            options={[
              { value: 'CARD', label: '💳 Carte' },
              { value: 'CASH', label: '💵 Espèces' },
              { value: 'CHEQUE', label: '📝 Chèque' },
              { value: 'TPE', label: '💳 TPE' },
              { value: 'TRANSFER', label: '🏦 Virement' },
              { value: 'OTHER', label: '🔄 Autre' }
            ]}
          />

          <SelectField
            label="Statut"
            name="status"
            value={form.status}
            onChange={handleChange}
            placeholder={null}
            options={[
              { value: 'PENDING', label: 'En attente' },
              { value: 'PAID', label: 'Payé' },
              { value: 'CANCELLED', label: 'Annulé' }
            ]}
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
              onClick={() => navigate('/admin/payments')}
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

export default AddPayment;
