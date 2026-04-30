import React from "react";

const VehicleSelectionBar = ({
  vehicles,
  selectedIds,
  onRemove,
  onClear
}) => {
  if (!selectedIds || selectedIds.length === 0) {
    return null;
  }

  const selectedVehicles = vehicles.filter((vehicle) => selectedIds.includes(String(vehicle.id)));

  if (selectedVehicles.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        marginTop: "12px",
        padding: "12px 16px",
        background: "var(--bg-secondary)",
        borderRadius: "8px",
        border: "1px solid var(--border-color)",
        maxHeight: "220px",
        overflowY: "auto",
        overscrollBehavior: "contain"
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "10px"
        }}
      >
        <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
          ✅ {selectedVehicles.length} voiture(s) selectionnee(s)
        </div>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: "12px"
            }}
          >
            Effacer tout
          </button>
        )}
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px"
        }}
      >
        {selectedVehicles.map((vehicle) => (
          <span
            key={vehicle.id}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 10px",
              background: "linear-gradient(135deg, #D4A900 0%, #F5C400 100%)",
              color: "#ffffff",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: 500
            }}
          >
            🚗 {vehicle.immatriculation || `${vehicle.marque} ${vehicle.modele}`}
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(String(vehicle.id))}
                style={{
                  background: "rgba(255, 255, 255, 0.18)",
                  border: "none",
                  color: "#ffffff",
                  cursor: "pointer",
                  padding: "2px 6px",
                  fontSize: "13px",
                  lineHeight: 1,
                  borderRadius: "3px",
                  fontWeight: "bold"
                }}
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>
    </div>
  );
};

export default VehicleSelectionBar;
