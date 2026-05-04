import { Link, useLocation } from "react-router-dom";
import { Check } from "lucide-react";
import "@/styles/public-booking-confirmation.css";

export default function PublicBookingConfirmation() {
  const location = useLocation();
  const reservationId = location?.state?.reservationId;
  const ref = reservationId ? `JET5-${reservationId}` : "JET5-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  return (
    <section className="jet-confirmation">
      <div className="jet-container">
        <div className="jet-confirmation-card">
          <div className="jet-check"><Check size={44} /></div>
          <h1>Réservation confirmée</h1>
          <p>
            Merci pour votre confiance. Un email de confirmation vient de vous être envoyé
            avec l'ensemble des détails de votre location.
          </p>
          <div className="jet-ref">RÉF · {ref}</div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/" className="jet-btn jet-btn-outline">Retour à l'accueil</Link>
            <Link to="/cars" className="jet-btn jet-btn-primary">Voir les véhicules</Link>
          </div>
        </div>
      </div>
    </section>
  );
}