import React, { useEffect, useState } from "react";
import apiClient from "../api/apiClient";
import "../styles/reservations-modal.css";

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const formatMoney = (value) => {
  const numeric = toNumber(value);
  if (numeric == null) {
    return "—";
  }
  return `${numeric.toLocaleString("fr-MA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} MAD`;
};

const formatDays = (value) => {
  if (value == null) {
    return "—";
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return `${value}`;
  }
  const abs = Math.max(0, numeric);
  return `${abs} jour${abs > 1 ? "s" : ""}`;
};

const PAYMENT_LABELS = {
  CASH: "Espèces",
  CARD: "Carte",
  CHEQUE: "Chèque",
  TPE: "TPE",
  TRANSFER: "Virement",
  OTHER: "Autre",
};

const formatClientDisplay = (clientValue) => {
  if (!clientValue) {
    return "—";
  }

  if (typeof clientValue === "string") {
    return clientValue;
  }

  const fullName = `${clientValue.nom || ""} ${clientValue.prenom || ""}`.trim();
  if (fullName) {
    return fullName;
  }

  return clientValue.email || clientValue.telephone || "—";
};

const formatCarDisplay = (carValue) => {
  if (!carValue) {
    return { name: "—", immatriculation: "" };
  }

  if (typeof carValue === "string") {
    return { name: carValue, immatriculation: "" };
  }

  const name = carValue.display || `${carValue.marque || ""} ${carValue.modele || ""}`.trim() || "—";
  return {
    name,
    immatriculation: carValue.immatriculation || "",
  };
};

function ReservationTimelineModal({ reservation, client, car, onClose }) {
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  useEffect(() => {
    let ignore = false;

    const fetchPaymentDetails = async () => {
      if (!reservation?.id) {
        setPaymentDetails(null);
        return;
      }
      setLoadingPayment(true);
      setPaymentError(null);
      try {
        const { data } = await apiClient.get(`/payments/`, {
          params: { reservation: reservation.id },
        });
        const list = Array.isArray(data) ? data : data?.results ?? data?.items ?? [];
        const payment = list.length > 0 ? list[0] : null;
        if (!ignore) {
          setPaymentDetails(payment);
        }
      } catch (error) {
        if (!ignore) {
          console.error("Erreur chargement paiement:", error);
          setPaymentError(error);
        }
      } finally {
        if (!ignore) {
          setLoadingPayment(false);
        }
      }
    };

    fetchPaymentDetails();
    return () => {
      ignore = true;
    };
  }, [reservation?.id]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  if (!reservation) {
    return null;
  }

  const plannedDays = toNumber(reservation.nombre_jours);
  const extensionDays = toNumber(reservation.jours_prolongation) || 0;
  const totalDays = plannedDays != null ? plannedDays + extensionDays : null;
  const totalAmount = paymentDetails?.amount != null
    ? toNumber(paymentDetails.amount)
    : toNumber(reservation.montant_total);
  const avance = paymentDetails?.paid_amount != null
    ? toNumber(paymentDetails.paid_amount)
    : toNumber(reservation.avance);
  const franchise = toNumber(reservation.franchise);
  const balanceDue = totalAmount != null && avance != null ? Math.max(totalAmount - avance, 0) : null;
  const paymentMethodCode = paymentDetails?.method || reservation.methode_paiement;
  const paymentLabel = paymentMethodCode
    ? PAYMENT_LABELS[paymentMethodCode] || paymentMethodCode
    : "—";
  const clientDisplay = formatClientDisplay(client);
  const carDisplay = formatCarDisplay(car);

  return (
    <div className="reservation-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="reservation-modal-card" onClick={(event) => event.stopPropagation()}>
        <header className="reservation-modal-header">
          <div>
            <h2>📘 Détails de la réservation #{reservation.id}</h2>
            <p>Consultez les informations clés de cette réservation.</p>
          </div>
          <button type="button" className="reservation-modal-close" onClick={onClose}>
            ✕
          </button>
        </header>

        <section className="reservation-modal-section">
          <h3>Résumé</h3>
          
          {/* Première ligne: Client, Voiture, Statut */}
          <div className="reservation-summary-row">
            <div className="reservation-summary-card compact">
              <span className="summary-label">👤 Client</span>
              <span className="summary-value">{clientDisplay}</span>
            </div>
            <div className="reservation-summary-card compact">
              <span className="summary-label">🚗 Voiture</span>
              <span className="summary-value">{carDisplay.name}</span>
              {carDisplay.immatriculation && (
                <span className="summary-hint">{carDisplay.immatriculation}</span>
              )}
            </div>
            <div className="reservation-summary-card compact">
              <span className="summary-label">📋 Statut</span>
              <span className={`summary-badge status-${reservation.statut || 'inconnu'}`}>
                {reservation.statut || "—"}
              </span>
            </div>
          </div>

          {/* Deuxième ligne: Période & Durée, Paiements */}
          <div className="reservation-summary-row" style={{ marginTop: '16px' }}>
            <div className="reservation-summary-card wide">
              <span className="summary-label">📅 Période & Durée</span>
              <div className="summary-period-info">
                <div className="period-dates">
                  <span className="date-item">
                    <span className="date-label">Début</span>
                    <span className="date-value">{reservation.date_debut || "—"}</span>
                  </span>
                  <span className="date-arrow">→</span>
                  <span className="date-item">
                    <span className="date-label">Fin</span>
                    <span className="date-value">{reservation.date_fin || "—"}</span>
                  </span>
                </div>
                <div className="duration-stats">
                  <div className="duration-item">
                    <span className="duration-value">{formatDays(plannedDays)}</span>
                    <span className="duration-label">Prévue</span>
                  </div>
                  <div className="duration-item">
                    <span className="duration-value">{formatDays(extensionDays)}</span>
                    <span className="duration-label">Prolongation</span>
                  </div>
                  <div className="duration-item total">
                    <span className="duration-value">{formatDays(totalDays ?? plannedDays)}</span>
                    <span className="duration-label">Total</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="reservation-summary-card wide">
              <span className="summary-label">💰 Paiements</span>
              <div className="payment-stats">
                <div className="payment-item main">
                  <span className="payment-label">Total</span>
                  <span className="payment-value">{formatMoney(totalAmount)}</span>
                </div>
                <div className="payment-item success">
                  <span className="payment-label">Payé</span>
                  <span className="payment-value">{formatMoney(avance)}</span>
                </div>
                <div className="payment-item warning">
                  <span className="payment-label">Reste</span>
                  <span className="payment-value">{formatMoney(balanceDue)}</span>
                </div>
              </div>
              <div className="payment-meta">
                <span className="meta-item">
                  <span className="meta-label">Méthode:</span> {paymentLabel}
                </span>
                {franchise != null && franchise > 0 && (
                  <span className="meta-item">
                    <span className="meta-label">Franchise:</span> {formatMoney(franchise)}
                  </span>
                )}
              </div>
              {loadingPayment && (
                <span className="summary-hint">⏳ Chargement...</span>
              )}
              {paymentError && (
                <span className="summary-hint error">⚠️ Détails de paiement indisponibles</span>
              )}
            </div>
          </div>
        </section>

        <footer className="reservation-modal-footer">
          <button type="button" className="reservation-modal-close-btn" onClick={onClose}>
            Fermer
          </button>
        </footer>
      </div>
    </div>
  );
}

export default ReservationTimelineModal;
