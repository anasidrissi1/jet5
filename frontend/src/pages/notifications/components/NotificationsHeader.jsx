import React, { useMemo } from "react";
import { FaSyncAlt } from "react-icons/fa";

const NotificationsHeader = ({
  stats,
  searchValue,
  onSearchChange,
  onGenerate,
  onRefresh,
  isBusy,
}) => {
  const headerMetrics = useMemo(
    () => [
      { label: "Total", value: stats.total ?? 0 },
      { label: "Urgentes", value: stats.urgent ?? 0 },
      { label: "Non lues", value: stats.unread ?? 0 },
    ],
    [stats]
  );

  return (
    <div className="cars-header">
      <div>
        <h1 className="cars-title">Notifications</h1>
        <p className="cars-sub">
          Toutes les alertes clients et véhicules regroupées dans un même espace.
        </p>
        <div className="notifications-header-meta">
          {headerMetrics.map((metric) => (
            <span key={metric.label} className="notifications-header-badge">
              {metric.label}
              <strong>{metric.value}</strong>
            </span>
          ))}
        </div>
      </div>

      <div className="cars-actions">
        <input
          className="search-input"
          placeholder="Rechercher une notification..."
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <button
          type="button"
          className="add-button"
          onClick={onGenerate}
          disabled={isBusy}
        >
          Générer
        </button>
        <button
          type="button"
          className="export-button"
          onClick={onRefresh}
          disabled={isBusy}
          title="Rafraîchir la liste"
        >
          <FaSyncAlt />
          Actualiser
        </button>
      </div>
    </div>
  );
};

export default NotificationsHeader;
