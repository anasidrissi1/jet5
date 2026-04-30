import React, { useMemo } from "react";

const NotificationsSummary = ({ stats }) => {
  const cards = useMemo(
    () => [
      {
        key: "total",
        label: "Notifications",
        value: stats.total ?? 0,
        detail: "Total des alertes actives",
        tone: "blue",
      },
      {
        key: "urgent",
        label: "Urgentes",
        value: stats.urgent ?? 0,
        detail: "Actions immédiates requises",
        tone: "red",
      },
      {
        key: "unread",
        label: "Non lues",
        value: stats.unread ?? 0,
        detail: "En attente de consultation",
        tone: "orange",
      },
      {
        key: "normal",
        label: "Planifiées",
        value: stats.normal ?? 0,
        detail: "Échéances à venir",
        tone: "green",
      },
    ],
    [stats]
  );

  return (
    <div className="stats-grid">
      {cards.map((card) => (
        <div key={card.key} className={`stats-card-autorisation stats-card-${card.tone}`}>
          <div className="stats-card-label">{card.label}</div>
          <div className="stats-card-value">{card.value}</div>
          <div className="stats-card-detail">{card.detail}</div>
        </div>
      ))}
    </div>
  );
};

export default NotificationsSummary;
