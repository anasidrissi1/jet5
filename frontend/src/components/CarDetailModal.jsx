import React, { useEffect, useMemo } from "react";

const STATUS_MAP = {
  libre: { label: "Disponible", tone: "status-libre" },
  disponible: { label: "Disponible", tone: "status-libre" },
  available: { label: "Disponible", tone: "status-libre" },
  free: { label: "Disponible", tone: "status-libre" },
  louee: { label: "Louée", tone: "status-loue" },
  "louée": { label: "Louée", tone: "status-loue" },
  loue: { label: "Louée", tone: "status-loue" },
  reservee: { label: "Réservée", tone: "status-reserve" },
  "réservée": { label: "Réservée", tone: "status-reserve" },
  reserve: { label: "Réservée", tone: "status-reserve" },
  entretien: { label: "Entretien", tone: "status-maintenance" },
  maintenance: { label: "Maintenance", tone: "status-maintenance" },
  "hors_service": { label: "Hors service", tone: "status-off" },
  "hors service": { label: "Hors service", tone: "status-off" },
};

const formatMileage = (value) => {
  if (value == null || value === "") {
    return null;
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return `${numeric.toLocaleString("fr-MA")} km`;
  }
  return String(value);
};

const formatMoney = (value) => {
  if (value == null || value === "") {
    return null;
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return `${numeric.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`;
  }
  return `${value} MAD`;
};

const formatDate = (value) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const coalesce = (value) => (value == null || value === "" ? null : value);

const buildInfoItem = (label, value, formatter = (val) => val) => {
  const prepared = formatter(value);
  if (prepared == null || prepared === "" || prepared === "—") {
    return null;
  }
  return { label, value: prepared };
};

function CarDetailModal({ car, stats, reservations = [], onNavigateUnpaid, onClose, onEdit }) {
  const safeCar = car || {};

  const statusKey = (safeCar.statut || "").toLowerCase();
  const statusInfo = STATUS_MAP[statusKey] || { label: safeCar.statut || "Statut inconnu", tone: "status-default" };

  const meta = useMemo(() => {
    const quick = [
      buildInfoItem("Statut", statusInfo.label),
      buildInfoItem("Kilométrage", safeCar.kilometrage, formatMileage),
      buildInfoItem("Prix journalier", safeCar.prix_journalier, formatMoney),
    ].filter(Boolean);

    const identification = [
      buildInfoItem("Immatriculation", safeCar.immatriculation),
      buildInfoItem("Numéro de châssis", safeCar.numero_chassis),
      buildInfoItem("Propriétaire", safeCar.proprietaire),
    ].filter(Boolean);

    const characteristics = [
      buildInfoItem("Marque", safeCar.marque),
      buildInfoItem("Modèle", safeCar.modele),
      buildInfoItem("Année", safeCar.annee),
      buildInfoItem("Couleur", safeCar.couleur),
      buildInfoItem("Catégorie", safeCar.categorie || safeCar.type),
      buildInfoItem("Carburant", safeCar.carburant),
      buildInfoItem("Transmission", safeCar.transmission),
      buildInfoItem("Places", safeCar.places),
      buildInfoItem("Portes", safeCar.portes),
      buildInfoItem("Puissance fiscale", safeCar.puissance_fiscale),
      buildInfoItem("Cylindrée", safeCar.cylindree),
    ].filter(Boolean);

    const maintenance = [
      buildInfoItem("Assurance", coalesce(safeCar.assurance)),
      buildInfoItem("Expiration assurance", safeCar.assurance_expiration, formatDate),
      buildInfoItem("Vignette", coalesce(safeCar.vignette)),
      buildInfoItem("Expiration vignette", safeCar.vignette_expiration, formatDate),
      buildInfoItem("Vidange", coalesce(safeCar.vidange)),
      buildInfoItem("Prochaine vidange", safeCar.prochaine_vidange, formatDate),
      buildInfoItem("Visite technique", coalesce(safeCar.visite_technique)),
      buildInfoItem("Prochaine visite", safeCar.prochaine_visite_technique || safeCar.visite_technique_expiration, formatDate),
      buildInfoItem("Garantie", coalesce(safeCar.garantie)),
      buildInfoItem("Expiration garantie", safeCar.garantie_expiration, formatDate),
    ].filter(Boolean);

    const financial = [
      buildInfoItem("Prix d'achat", safeCar.prix_achat, formatMoney),
      buildInfoItem("Prix de vente", safeCar.prix_vente, formatMoney),
      buildInfoItem("Caution", safeCar.caution, formatMoney),
      buildInfoItem("Kilométrage gratuit/jour", safeCar.kilometrage_gratuit),
      buildInfoItem("Coût km suppl.", safeCar.cout_km_supplementaire, formatMoney),
    ].filter(Boolean);

    const dates = [
      buildInfoItem("Date d'achat", safeCar.date_achat, formatDate),
      buildInfoItem("Date de mise en service", safeCar.date_mise_en_service, formatDate),
      buildInfoItem("Dernière mise à jour", safeCar.updated_at, formatDate),
      buildInfoItem("Créée le", safeCar.created_at, formatDate),
    ].filter(Boolean);

    const notesValue = coalesce(safeCar.commentaires || safeCar.commentaire || safeCar.notes || safeCar.observations || safeCar.remarques);

    return {
      quick,
      identification,
      characteristics,
      maintenance,
      financial,
      dates,
      notes: notesValue,
    };
  }, [safeCar, statusInfo.label]);

  const handleOverlayClick = () => {
    if (typeof onClose === "function") {
      onClose();
    }
  };

  const stopPropagation = (event) => {
    event.stopPropagation();
  };

  useEffect(() => {
    const handler = (event) => {
      if (event.key === "Escape") {
        if (typeof onClose === "function") {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!car) {
    return null;
  }

  return (
    <div className="assurance-modal-overlay car-detail-overlay" onClick={handleOverlayClick} role="dialog" aria-modal="true">
      <div className="car-detail-card" onClick={stopPropagation}>
        <button type="button" className="car-detail-close" onClick={onClose} aria-label="Fermer la fiche véhicule">
          ×
        </button>

        <div className="car-detail-header">
          <div className="car-detail-icon">🚗</div>
          <div>
            <div className="car-detail-title">{`${car.marque || ""} ${car.modele || ""}`.trim() || car.immatriculation || "Véhicule"}</div>
            {car.immatriculation ? (
              <div className="car-detail-subtitle">{car.immatriculation}</div>
            ) : null}
          </div>
          <span className={`car-detail-status ${statusInfo.tone}`}>{statusInfo.label}</span>
        </div>

        {meta.quick.length > 0 && (
          <div className="car-detail-metrics">
            {meta.quick.map((item) => (
              <div key={item.label} className="car-detail-metric">
                <span className="metric-label">{item.label}</span>
                <span className="metric-value">{item.value}</span>
              </div>
            ))}
          </div>
        )}

        {meta.identification.length > 0 && (
          <div className="car-detail-section">
            <div className="section-title">🆔 Identification</div>
            <div className="car-detail-grid">
              {meta.identification.map((item) => (
                <div key={item.label} className="car-detail-item">
                  <span className="item-label">{item.label}</span>
                  <span className="item-value">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {meta.characteristics.length > 0 && (
          <div className="car-detail-section">
            <div className="section-title">🔧 Caractéristiques techniques</div>
            <div className="car-detail-grid">
              {meta.characteristics.map((item) => (
                <div key={item.label} className="car-detail-item">
                  <span className="item-label">{item.label}</span>
                  <span className="item-value">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {meta.financial.length > 0 && (
          <div className="car-detail-section">
            <div className="section-title">💰 Informations tarifaires</div>
            <div className="car-detail-grid">
              {meta.financial.map((item) => (
                <div key={item.label} className="car-detail-item">
                  <span className="item-label">{item.label}</span>
                  <span className="item-value">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {meta.maintenance.length > 0 && (
          <div className="car-detail-section">
            <div className="section-title">🛠️ Suivi & maintenance</div>
            <div className="car-detail-grid">
              {meta.maintenance.map((item) => (
                <div key={item.label} className="car-detail-item">
                  <span className="item-label">{item.label}</span>
                  <span className="item-value">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="car-detail-section">
          <div className="section-title">📊 Rentabilité & réservations</div>
          <div className="car-detail-metrics kpi-3">
            <div className="car-detail-metric">
              <span className="metric-label">Revenu encaissé</span>
              <span className="metric-value success">
                {formatMoney(stats?.paid || 0)}
              </span>
              <span className="metric-sub">
                {stats?.reservationsCount || 0} réservation{(stats?.reservationsCount || 0) > 1 ? 's' : ''}
              </span>
            </div>
            <div className={`car-detail-metric ${onNavigateUnpaid ? "clickable" : ""}`}
              onClick={onNavigateUnpaid}
              title={onNavigateUnpaid ? "Voir les réservations impayées de ce véhicule" : undefined}>
              <span className="metric-label">Impayé restant</span>
              <span className="metric-value warning">
                {formatMoney(stats?.unpaid || 0)}
              </span>
              <span className="metric-sub">
                Actives/A venir : {(stats?.active || 0) + (stats?.upcoming || 0)}
              </span>
            </div>
            <div className="car-detail-metric">
              <span className="metric-label">Prochaine échéance</span>
              <span className="metric-value">{stats?.nextDueFormatted || "—"}</span>
              <span className="metric-sub">
                Actives : {stats?.active || 0} • Terminées : {stats?.ended || 0}
              </span>
            </div>
          </div>

          <div className="car-detail-table">
            <div className="car-detail-table-head">
              <span>Client</span>
              <span>Période</span>
              <span>Statut</span>
              <span>Payé</span>
              <span>Reste</span>
            </div>
            {reservations.length === 0 ? (
              <div className="car-detail-table-empty">Aucune réservation associée.</div>
            ) : (
              reservations.map((r) => {
                const total = Number(r.montant_total) || 0;
                const paid = Math.min(total, Number(r.avance) || 0);
                const rest = Math.max(total - paid, 0);
                const status = r.statut || '—';
                const periode = [r.date_debut || '—', r.date_fin || '—'].join(' → ');
                return (
                  <div key={r.id} className="car-detail-table-row">
                    <span title={`Client #${r.client || '—'}`}>#{r.client || '—'}</span>
                    <span>{periode}</span>
                    <span>{status}</span>
                    <span className="metric-value success">{formatMoney(paid) || '—'}</span>
                    <span className={`metric-value ${rest > 0 ? "warning" : "muted"}`}>{formatMoney(rest) || '—'}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {meta.notes && (
          <div className="car-detail-section">
            <div className="section-title">📝 Notes & remarques</div>
            <div className="car-detail-notes">{meta.notes}</div>
          </div>
        )}

        {meta.dates.length > 0 && (
          <div className="car-detail-section">
            <div className="section-title">📅 Historique & dates</div>
            <div className="car-detail-grid">
              {meta.dates.map((item) => (
                <div key={item.label} className="car-detail-item">
                  <span className="item-label">{item.label}</span>
                  <span className="item-value">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="car-detail-actions">
          <button type="button" className="car-detail-action secondary" onClick={onClose}>
            Fermer
          </button>
          {typeof onEdit === "function" ? (
            <button type="button" className="car-detail-action primary" onClick={() => onEdit(car)}>
              Modifier ce véhicule
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default CarDetailModal;
