import React from "react";
import { FaTrash, FaEye } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const NotificationsTable = ({ items, totalItems, onMarkAsRead, onDelete, isBusy }) => {
  const navigate = useNavigate();
  if (totalItems === 0) {
    return (
      <div className="notifications-empty">
        <p>Aucune notification disponible. Lancez une génération ou vérifiez vos filtres.</p>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="notifications-empty">
        <p>Aucune notification ne correspond aux filtres ou à la page sélectionnée.</p>
      </div>
    );
  }

  return (
    <div className="notifications-table-card">
      <div className="notifications-table-scroll">
        <table className="notifications-table">
          <thead>
            <tr>
              <th>Statut</th>
              <th>Type</th>
              <th>Urgence</th>
              <th>Client</th>
              <th>Véhicule</th>
              <th>Échéance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((notification, index) => {
              // helper to produce a short label for the type column
              const shortenType = (full) => {
                if (!full) return '';
                const text = String(full).toLowerCase();
                const map = {
                  retour_voiture: 'retour',
                  retour: 'retour',
                  visite: 'visite',
                  assurance: 'assurance',
                  autorisation: 'autorisation',
                  paiement: 'paiement',
                  entretien: 'entretien',
                  inscription_client: 'inscription',
                  inscription: 'inscription',
                  demande: 'demande',
                  autres: 'autres',
                };
                for (const key of Object.keys(map)) {
                  if (text.includes(key)) return map[key];
                }
                // fallback to first token
                const token = text.split(/[_\s\-]+/)[0];
                return token || text.substring(0, 12);
              };

              const { id, typeMeta, urgencyMeta, car, client } = notification;
              const carDisplay = car
                ? `${car.immatriculation} · ${car.marque || ""} ${car.modele || ""}`.trim()
                : "-";
              const clientDisplay = client
                ? `${client.nom || ""} ${client.prenom || ""}`.trim()
                : notification.client_nom || "-";
              const dueDateLabel = notification.dueDateLabel || notification.createdAtLabel || "-";

              const rowClassName = index % 2 === 0 ? "notifications-row" : "notifications-row notifications-row--alt";

              return (
                <tr key={id} className={rowClassName}>
                  <td>
                    <span className={`notifications-pill ${notification.est_lue ? "notifications-pill--success" : "notifications-pill--warning"}`}>
                      {notification.est_lue ? "Lu" : "Non lu"}
                    </span>
                  </td>
                  <td>
                    <span
                      className="notifications-type-badge"
                      title={typeMeta?.text || notification.type || ''}
                    >
                      <span className="notifications-type-badge__label">{shortenType(typeMeta?.text || notification.type)}</span>
                    </span>
                  </td>
                  <td>
                    <span
                      className={`notifications-urgency notifications-urgency--${urgencyMeta.level}`}
                    >
                      {urgencyMeta.label}
                    </span>
                  </td>
                  <td title={clientDisplay}>
                    {clientDisplay}
                  </td>
                  <td title={carDisplay}>
                    {carDisplay}
                  </td>
                  <td>
                    {dueDateLabel}
                  </td>
                  <td>
                    <div className="notifications-actions">
                      {!notification.est_lue && (
                        <button
                          type="button"
                          className="notifications-action notifications-action--primary"
                          onClick={() => onMarkAsRead(id)}
                          disabled={isBusy}
                        >
                          Marquer lu
                        </button>
                      )}
                      <button
                        type="button"
                        className="notifications-action notifications-action--secondary"
                        onClick={(e) => { e.stopPropagation(); navigate(`/admin/notifications/${id}`); }}
                        title="Voir"
                        aria-label={`Voir notification ${id}`}
                      >
                        <FaEye aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="notifications-action notifications-action--danger notifications-action--icon"
                        onClick={() => onDelete(notification)}
                        disabled={isBusy}
                        title="Supprimer"
                        aria-label={`Supprimer notification ${id}`}
                      >
                        <FaTrash aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NotificationsTable;
