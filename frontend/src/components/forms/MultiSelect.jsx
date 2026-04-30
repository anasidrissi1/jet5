import React, { useEffect, useRef, useState } from "react";

const MultiSelect = ({
  options,
  selectedValues,
  onChange,
  placeholder = "-- Selectionner --",
  valueKey = "id",
  labelKey = "label",
  secondaryLabelKey,
  disabled = false,
  emptyState,
  maxDropdownHeight = 320
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const toggleOption = (value) => {
    const normalizedValue = String(value);
    const alreadySelected = selectedValues.includes(normalizedValue);
    const nextSelection = alreadySelected
      ? selectedValues.filter((item) => item !== normalizedValue)
      : [...selectedValues, normalizedValue];
    onChange(nextSelection);
  };

  const handleSelectAll = () => {
    if (options.length === 0) {
      onChange([]);
      return;
    }
    const allSelected = selectedValues.length === options.length;
    onChange(allSelected ? [] : options.map((option) => String(option[valueKey])));
  };

  const renderPrimaryLabel = (option) => {
    if (typeof labelKey === "function") {
      return labelKey(option);
    }
    return option[labelKey];
  };

  const renderSecondaryLabel = (option) => {
    if (!secondaryLabelKey) {
      return null;
    }
    if (typeof secondaryLabelKey === "function") {
      return secondaryLabelKey(option);
    }
    return option[secondaryLabelKey];
  };

  const buttonLabel = selectedValues.length === 0
    ? placeholder
    : `${selectedValues.length} option(s) selectionnee(s)`;

  const allSelected = options.length > 0 && selectedValues.length === options.length;

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
        style={{
          width: "100%",
          cursor: disabled ? "not-allowed" : "pointer",
          textAlign: "left",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--bg-secondary)",
          padding: "12px 16px",
          borderRadius: "8px",
          border: "1px solid var(--border-color)",
          color: selectedValues.length === 0 ? "var(--text-secondary)" : "var(--text-primary)",
          transition: "border-color 0.2s, box-shadow 0.2s"
        }}
      >
        <span>{buttonLabel}</span>
        <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            maxHeight: `${maxDropdownHeight}px`,
            overflowY: "auto",
            zIndex: 1000,
            boxShadow: "0 12px 24px rgba(0, 0, 0, 0.18)",
            overscrollBehavior: "contain"
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--border-color)",
              background: "var(--bg-secondary)",
              position: "sticky",
              top: 0,
              zIndex: 1
            }}
          >
            <label style={{ display: "flex", alignItems: "center", cursor: "pointer", fontWeight: 600 }}>
              <input
                type="checkbox"
                onChange={handleSelectAll}
                checked={allSelected}
                style={{
                  marginRight: "10px",
                  width: "16px",
                  height: "16px",
                  cursor: "pointer",
                  accentColor: "var(--primary-color)"
                }}
              />
              Tout selectionner ({options.length})
            </label>
          </div>
          {options.length === 0 && (
            <div style={{ padding: "28px 20px", textAlign: "center", color: "var(--text-secondary)" }}>
              {emptyState || "Aucune option disponible"}
            </div>
          )}
          {options.map((option) => {
            const optionValue = String(option[valueKey]);
            const isChecked = selectedValues.includes(optionValue);
            return (
              <label
                key={optionValue}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "14px 16px",
                  cursor: "pointer",
                  transition: "background 0.2s",
                  borderBottom: "1px solid var(--border-color)"
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = "var(--bg-secondary)";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = "transparent";
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleOption(optionValue)}
                  style={{
                    marginRight: "12px",
                    width: "16px",
                    height: "16px",
                    cursor: "pointer",
                    accentColor: "var(--primary-color)"
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, color: "var(--text-primary)", marginBottom: "4px" }}>
                    {renderPrimaryLabel(option)}
                  </div>
                  {secondaryLabelKey && (
                    <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                      {renderSecondaryLabel(option)}
                    </div>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MultiSelect;
