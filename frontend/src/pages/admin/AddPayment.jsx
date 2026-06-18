import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentsService, reservationsService } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import FormInput from '../../components/FormInput';
import SelectField from '../../components/SelectField';
import { fetchAllPages } from '../../utils/fetchAllPages';

function getClientLabel(reservation) {
  const fromParts = `${reservation.client_nom || ''} ${reservation.client_prenom || ''}`.trim();
  return fromParts || reservation.client_name || `Client #${reservation.client}`;
}

function getCarLabel(reservation) {
  const fromParts = `${reservation.voiture_marque || ''} ${reservation.voiture_modele || ''}`.trim();
  return fromParts || reservation.voiture_display || reservation.voiture_info || `Voiture #${reservation.voiture}`;
}

function normalizeDecimal(value) {
  return String(value).trim().replace(',', '.');
}

function AddPayment() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [form, setForm] = useState({ reservation: '', advance: '', method: 'CARD' });
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState(null);

  const preventNumberScroll = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  useEffect(() => {
    const load = async () => {
      setLoadingList(true);
      try {
        const [resList, payList] = await Promise.all([
          fetchAllPages(reservationsService.list),
          fetchAllPages(paymentsService.list),
        ]);
        const withAdvance = new Set(
          payList
            .filter((payment) => Number(payment.paid_amount) > 0)
            .map((payment) => payment.reservation_id),
        );
        setReservations(
          resList.filter(
            (reservation) => !reservation.is_deleted && !withAdvance.has(reservation.id),
          ),
        );
      } catch (err) {
        console.error(err);
        setError('Impossible de charger les réservations.');
      } finally {
        setLoadingList(false);
      }
    };
    load();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await paymentsService.create({
        reservation: Number(form.reservation),
        advance: normalizeDecimal(form.advance),
        method: form.method,
      });
      navigate('/admin/payments');
    } catch (err) {
      const data = err.response?.data;
      const message = data?.detail
        || data?.reservation?.[0]
        || data?.advance?.[0]
        || data?.non_field_errors?.[0]
        || (typeof data === 'string' ? data : null)
        || err.message
        || 'Erreur lors de la création du paiement';
      setError(typeof message === 'object' ? JSON.stringify(message) : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cars-page">
      <PageHeader
        title="💳 Ajouter un paiement"
        subtitle="Liez une réservation et enregistrez l'acompte versé."
        backUrl="/admin/payments"
      />

      <form className="simple-form-card" onSubmit={handleFormSubmit}>
        <SelectField
          label="Réservation"
          name="reservation"
          value={form.reservation}
          onChange={handleChange}
          required
          disabled={loadingList}
          options={reservations}
          renderOption={(reservation) => (
            <option key={reservation.id} value={reservation.id}>
              #{reservation.id} — {getClientLabel(reservation)} — {getCarLabel(reservation)}
              {reservation.date_debut && reservation.date_fin
                ? ` (${reservation.date_debut} → ${reservation.date_fin})`
                : ''}
            </option>
          )}
        />
        {loadingList && (
          <small className="form-hint">Chargement des réservations…</small>
        )}
        {!loadingList && reservations.length === 0 && (
          <small className="form-hint">Aucune réservation disponible sans acompte enregistré.</small>
        )}

        <FormInput
          type="text"
          label="Acompte versé (MAD)"
          inputMode="decimal"
          pattern="[0-9]*[.,]?[0-9]*"
          name="advance"
          value={form.advance}
          onChange={handleChange}
          onWheel={preventNumberScroll}
          onWheelCapture={preventNumberScroll}
          required
          placeholder="Ex: 500.00"
        />
        <small className="form-hint">Le montant total de la réservation est calculé automatiquement.</small>

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
            { value: 'OTHER', label: '🔄 Autre' },
          ]}
        />

        {error && (
          <div className="simple-form-error">
            {error}
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
          <button className="add-button" type="submit" disabled={loading || loadingList || !reservations.length}>
            {loading ? 'Enregistrement...' : 'Ajouter'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddPayment;
