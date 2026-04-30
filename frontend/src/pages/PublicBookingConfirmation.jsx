import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, CalendarDays, CarFront, CheckCircle2, PhoneCall } from "lucide-react";
import PublicLayout from "../components/layout/PublicLayout";
import "../styles/public-booking-confirmation.css";

const CONTACT_PHONE_DISPLAY = "06 25 99 07 09";
const CONTACT_PHONE_LINK = "+212625990709";
const CONTACT_EMAIL = "jet5.casa@gmail.com";
const WHATSAPP_LINK = `https://wa.me/${CONTACT_PHONE_LINK.replace("+", "")}`;

function PublicBookingConfirmation() {
  const location = useLocation();
  const summary = location.state && location.state.summary;

  return (
    <PublicLayout>
      <div className="public-booking-confirmation-page">
        <header className="public-booking-confirmation-header">
          <span className="public-booking-confirmation-header__eyebrow">Confirmation</span>
          <h1>Réservation confirmée</h1>
          <p>Votre demande de réservation a bien été enregistrée.</p>
        </header>

        <div className="public-booking-confirmation-card">
          <div className="public-booking-confirmation-hero">
            <div className="public-booking-confirmation-hero__icon">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <div className="public-booking-confirmation-badge">Demande envoyee a JET5</div>
              <h2>Nous avons bien recu votre demande</h2>
              <p>Un conseiller va verifier la disponibilite du vehicule et vous recontacter rapidement.</p>
            </div>
          </div>

          <div className="public-booking-confirmation-details">
            {summary?.carLabel && (
              <div className="public-booking-confirmation-detail">
                <span className="public-booking-confirmation-detail__icon">
                  <CarFront size={16} />
                </span>
                <div>
                  <span className="public-booking-confirmation-detail__label">Vehicule</span>
                  <strong>{summary.carLabel}</strong>
                </div>
              </div>
            )}

            {summary?.dates && (
              <div className="public-booking-confirmation-detail">
                <span className="public-booking-confirmation-detail__icon">
                  <CalendarDays size={16} />
                </span>
                <div>
                  <span className="public-booking-confirmation-detail__label">Periode</span>
                  <strong>{summary.dates}</strong>
                </div>
              </div>
            )}
          </div>

          <div className="public-booking-confirmation-note public-booking-confirmation-note--primary">
            <h2>Suite de votre demande</h2>
            <p>
              Notre agence va vous contacter rapidement pour confirmer la disponibilite,
              finaliser la reservation et vous communiquer les modalites de paiement.
            </p>
          </div>

          <div className="public-booking-confirmation-note public-booking-confirmation-note--secondary">
            <h2>Besoin d'une reponse plus rapide ?</h2>
            <p>
              Si vous souhaitez accelerer le traitement, vous pouvez contacter directement
              l'agence au <a href={`tel:${CONTACT_PHONE_LINK}`}>{CONTACT_PHONE_DISPLAY}</a> ou par email a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
            <div className="public-booking-confirmation-contact-list">
              <a className="public-booking-confirmation-contact" href={`tel:${CONTACT_PHONE_LINK}`}>
                <PhoneCall size={16} />
                <span>Appel direct</span>
              </a>
              <a className="public-booking-confirmation-contact" href={WHATSAPP_LINK} target="_blank" rel="noreferrer">
                <PhoneCall size={16} />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          <div className="public-booking-confirmation-actions">
            <Link to="/cars" className="public-booking-confirmation-action public-booking-confirmation-action--secondary">
              <span>Retour aux voitures</span>
              <ArrowRight size={16} />
            </Link>
            <Link to="/" className="public-booking-confirmation-action public-booking-confirmation-action--primary">
              <span>Retour a l'accueil</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export default PublicBookingConfirmation;
