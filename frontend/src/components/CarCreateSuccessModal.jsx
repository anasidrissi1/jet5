import React from "react";

const formatMoney = (value) => {
  if (value == null || value === "") {
    return "—";
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return `${numeric.toLocaleString("fr-MA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} MAD`;
  }
  return `${value} MAD`;
};

const formatMileage = (value) => {
  if (value == null || value === "") {
    return "—";
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return `${numeric.toLocaleString("fr-MA")} km`;
  }
  return String(value);
};

function CarCreateSuccessModal({ car, mode = "create", onClose, onNavigate }) {
  if (!car) {
    return null;
  }

  const title = mode === "edit" ? "Véhicule mis à jour" : "Véhicule ajouté";
  const subtitle = mode === "edit"
    ? "Les informations du véhicule ont été enregistrées avec succès."
    : "Le véhicule est maintenant disponible dans votre parc.";

  const handleOverlayClick = () => {
    if (typeof onClose === "function") {
      onClose();
    }
  };

  const stopPropagation = (event) => {
    event.stopPropagation();
  };

  return (
    <div className="assurance-modal-overlay car-success-overlay" onClick={handleOverlayClick} role="dialog" aria-modal="true">
      <div className="car-success-card" onClick={stopPropagation}>
        <div className="car-success-icon">✅</div>
        <h3 className="car-success-title">{title}</h3>
        <p className="car-success-subtitle">{subtitle}</p>

        <div className="car-success-summary">
          <div className="car-success-row">
            <span className="car-success-label">Véhicule</span>
            <span className="car-success-value">
              {`${car.marque || ""} ${car.modele || ""}`.trim() || car.immatriculation || "—"}
            </span>
          </div>
          {car.immatriculation && (
            <div className="car-success-row">
              <span className="car-success-label">Immatriculation</span>
              <span className="car-success-value highlight">{car.immatriculation}</span>
            </div>
          )}
          <div className="car-success-row">
            <span className="car-success-label">Couleur</span>
            <span className="car-success-value">{car.couleur || "—"}</span>
          </div>
          <div className="car-success-row">
            <span className="car-success-label">Kilométrage</span>
            <span className="car-success-value">{formatMileage(car.kilometrage)}</span>
          </div>
          <div className="car-success-row">
            <span className="car-success-label">Tarif journalier</span>
            <span className="car-success-value">{formatMoney(car.prix_journalier)}</span>
          </div>
        </div>

        <div className="car-success-actions">
          <button type="button" className="car-success-btn secondary" onClick={onClose}>
            Ajouter un autre véhicule
          </button>
          <button type="button" className="car-success-btn primary" onClick={onNavigate}>
            Aller à la liste
          </button>
        </div>
      </div>
    </div>
  );
}

export default CarCreateSuccessModal;
