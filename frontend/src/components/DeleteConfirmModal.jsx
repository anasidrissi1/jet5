import React from "react";

function DeleteConfirmModal({
  title = "Supprimer",
  description,
  icon = "🗑️",
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  confirmVariant = "danger",
  onConfirm,
  onCancel,
  disableActions = false,
}) {
  const handleOverlayClick = () => {
    if (disableActions) {
      return;
    }
    if (typeof onCancel === "function") {
      onCancel();
    }
  };

  const stopPropagation = (event) => {
    event.stopPropagation();
  };

  return (
    <div
      className="assurance-modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={handleOverlayClick}
    >
      <div className="assurance-confirm-card" onClick={stopPropagation}>
        {icon ? <div className="assurance-confirm-icon">{icon}</div> : null}
        {title ? <h3 className="assurance-confirm-title">{title}</h3> : null}
        {description ? (
          <div className="assurance-confirm-text">{description}</div>
        ) : null}
        <div className="assurance-confirm-actions">
          <button
            type="button"
            className="assurance-confirm-btn cancel"
            onClick={onCancel}
            disabled={disableActions}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`assurance-confirm-btn ${confirmVariant}`}
            onClick={onConfirm}
            disabled={disableActions}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmModal;
