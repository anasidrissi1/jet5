import React from "react";

const NotificationsFilters = ({
  urgencyOptions,
  selectedUrgency,
  onUrgencyChange,
  typeOptions,
  selectedType,
  onTypeChange,
  disabled,
}) => {
  return (
    <div className="notifications-toolbar">
      <div className="notifications-toolbar__group">
        <span className="notifications-toolbar__label">Statut des notifications</span>
        <div className="notifications-toolbar__chips">
          {urgencyOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`notifications-chip${selectedUrgency === option.key ? " active" : ""}`}
              onClick={() => onUrgencyChange(option.key)}
              disabled={disabled}
            >
              <span className="notifications-chip__label">{option.label}</span>
              <span className="notifications-chip__count">{option.count ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="notifications-toolbar__divider" aria-hidden="true" />

      <div className="notifications-toolbar__group">
        <span className="notifications-toolbar__label">Type de notification</span>
        <div className="notifications-toolbar__chips">
          {typeOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`notifications-chip notifications-chip--compact${selectedType === option.key ? " active" : ""}`}
              onClick={() => onTypeChange(option.key)}
              disabled={disabled}
            >
              <span className="notifications-chip__label">{option.label}</span>
              <span className="notifications-chip__count">{option.count ?? 0}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotificationsFilters;
