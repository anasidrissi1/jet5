import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { paymentsService, reservationsService } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import FormInput from '../../components/FormInput';
import SelectField from '../../components/SelectField';
function EditPayment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [reservation, setReservation] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [form, setForm] = useState({
    additional_amount: '',
    method: 'CARD'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const preventNumberScroll = (event) => {
    // Avoid wheel/trackpad from changing numeric-like inputs when focused
    event.preventDefault();
    event.stopPropagation();
  };

  useEffect(() => {
    const load = async () => {
      try {
        const paymentRes = await paymentsService.get(id);
        const paymentData = paymentRes.data;
        setPayment(paymentData);

        const reservationId = paymentData.reservation_id
          ?? paymentData.reservation
          ?? null;

        if (reservationId) {
          try {
            const reservationRes = await reservationsService.get(reservationId);
            setReservation(reservationRes.data);
          } catch (reservationErr) {
            console.error(reservationErr);
          }
        }

        const historyRes = await paymentsService.history(id);
        setPaymentHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
      } catch (err) {
        console.error(err);
        setError('Erreur lors du chargement des données.');
      }
    };
    load();
  }, [id]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const normalizedAmount = String(form.additional_amount).trim().replace(',', '.');
      const payload = {
        additional_amount: parseFloat(normalizedAmount),
        method: form.method
      };
      await paymentsService.addPayment(id, payload);
      navigate('/admin/payments');
    } catch (err) {
      console.error(err);
      setError(err.response?.data || err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount) => {
    if (amount === null || amount === undefined) return '0';
    return parseFloat(amount).toLocaleString();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return '-';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return '-';
    }
  };

  const currentPaidAmount = payment ? payment.paid_amount || 0 : 0;
  const totalAmount = payment ? payment.amount || 0 : 0;
  const normalizedAdditional = String(form.additional_amount || '').trim().replace(',', '.');
  const newTotalPaid = currentPaidAmount + (parseFloat(normalizedAdditional) || 0);
  const remainingAmount = totalAmount - newTotalPaid;

  const vehicleLabel = `${payment?.voiture_marque || reservation?.voiture_marque || ''} ${payment?.voiture_modele || reservation?.voiture_modele || ''}`.trim()
    || reservation?.voiture_display
    || payment?.voiture_display
    || 'N/A';
  const vehiclePlate = payment?.voiture_immatriculation || reservation?.voiture_immatriculation || '';
  const startDate = reservation?.date_debut || payment?.reservation_date_debut;
  const endDate = reservation?.date_fin || payment?.reservation_date_fin;

  return (
    <div className="cars-page">
      <PageHeader
        title="✏️ Modifier le paiement"
        backUrl="/admin/payments"
      />

      {payment && (
        <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
          <h3>Informations de la réservation</h3>
          <div className="responsive-grid-220" style={{ gap: '16px' }}>
            <div>
              <strong>Client:</strong> {payment.client_name || 'N/A'}
            </div>
            <div>
              <strong>Véhicule:</strong>{' '}
              {vehicleLabel}
              {vehiclePlate ? ` — ${vehiclePlate}` : ''}
            </div>
            <div>
              <strong>Date de début:</strong> {formatDate(startDate)}
            </div>
            <div>
              <strong>Date de fin:</strong> {formatDate(endDate)}
            </div>
            <div>
              <strong>Montant total:</strong> {formatAmount(totalAmount)} MAD
            </div>
            <div>
              <strong>Déjà payé:</strong> {formatAmount(currentPaidAmount)} MAD
            </div>
            <div>
              <strong>Reste actuel:</strong> {formatAmount(totalAmount - currentPaidAmount)} MAD
            </div>
          </div>
        </div>
      )}

      <form className="card" onSubmit={handleSubmit} style={{ padding: 16 }}>
        <h3>Ajouter un paiement</h3>

        <FormInput
          type="text"
          label="Montant à ajouter"
          inputMode="decimal"
          pattern="[0-9]*[.,]?[0-9]*"
          name="additional_amount"
          value={form.additional_amount}
          onChange={handleChange}
          onWheel={preventNumberScroll}
          onWheelCapture={preventNumberScroll}
          placeholder="Montant à ajouter à l'avance"
          required
        />
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

        {form.additional_amount && (
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '4px' }}>
            <h4>Récapitulatif du paiement</h4>
            <div className="responsive-grid-220" style={{ gap: '8px' }}>
              <div><strong>Montant actuel payé:</strong> {formatAmount(currentPaidAmount)} MAD</div>
              <div><strong>Montant ajouté:</strong> {formatAmount(form.additional_amount)} MAD</div>
              <div><strong>Nouveau total payé:</strong> {formatAmount(newTotalPaid)} MAD</div>
              <div><strong>Nouveau reste:</strong> {formatAmount(Math.max(0, remainingAmount))} MAD</div>
            </div>
          </div>
        )}

        {error && <div className="cars-error">{JSON.stringify(error)}</div>}

        <div style={{ marginTop: 12 }}>
          <button className="export-button" type="submit" disabled={loading || !form.additional_amount}>
            {loading ? 'Enregistrement...' : 'Ajouter le paiement'}
          </button>
          <button type="button" style={{ marginLeft: 8 }} onClick={() => navigate('/admin/payments')}>
            Annuler
          </button>
        </div>
      </form>

      {/* Payment History */}
      <div className="card" style={{ marginTop: '20px', padding: '16px' }}>
        <h3>Historique des paiements</h3>
        {paymentHistory.length === 0 ? (
          <p>Aucun historique de paiement</p>
        ) : (
          <div className="history-table">
            <table className="cars-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Montant</th>
                  <th>Méthode</th>
                  <th>Effectué par</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map(history => (
                  <tr key={history.id}>
                    <td>{formatDateTime(history.created_at)}</td>
                    <td className="font-medium">{formatAmount(history.amount)} MAD</td>
                    <td>{history.method === 'CARD' ? '💳 Carte' :
                         history.method === 'CASH' ? '💵 Espèces' :
                         history.method === 'TRANSFER' ? '🏦 Virement' :
                         history.method === 'OTHER' ? '🔄 Autre' : history.method}</td>
                    <td>{history.created_by_name || 'Système'}</td>
                    <td>{history.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default EditPayment;
