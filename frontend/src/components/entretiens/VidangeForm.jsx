import React, { useState, useEffect, useRef } from 'react';

function VidangeForm({ onChange, initialData = null }) {
  const [vidange, setVidange] = useState({
    type_huile: '',
    quantite_litres: '',
    prix_total: '',
    filtre_huile: false,
    prix_filtre_huile: '',
    filtre_air: false,
    prix_filtre_air: '',
    filtre_carburant: false,
    prix_filtre_carburant: ''
  });

  const isInitialized = useRef(false);

  const sectionCardBg = 'var(--bg-card)';
  const sectionHuileBorder = '2px solid #10b981';
  const sectionHuileTitle = '#065f46';
  const sectionFiltresBorder = '2px solid #D4A900';
  const sectionFiltresTitle = '#4338ca';
  const labelColor = '#374151';
  const requiredColor = '#D4A900';
  const inputBorderColor = '#d1d5db';
  const inputBackground = '#ffffff';
  const inputTextColor = '#1f2937';
  const inputFocusBorder = '#D4A900';
  const inputBoxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
  const checkboxAccent = '#D4A900';
  const activeFilterBg = 'var(--bg-hover)';
  const inactiveFilterBg = sectionCardBg;
  const filterBorderDefault = '2px solid var(--border-color)';
  const summaryBackground = 'var(--bg-card)';
  const summaryBorder = '1px solid var(--border-color)';
  const summaryLabelColor = 'var(--text-secondary)';
  const summaryValueColor = 'var(--text-primary)';

  const sharedInputStyle = {
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: `1px solid ${inputBorderColor}`,
    background: inputBackground,
    color: inputTextColor,
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
  };

  const sharedInputFocusHandlers = {
    onFocus: (e) => {
      e.currentTarget.style.borderColor = inputFocusBorder;
      e.currentTarget.style.boxShadow = inputBoxShadow;
    },
    onBlur: (e) => {
      e.currentTarget.style.borderColor = inputBorderColor;
      e.currentTarget.style.boxShadow = 'none';
    }
  };

  // Charger les données initiales
  useEffect(() => {
    if (initialData && !isInitialized.current) {
      setVidange({
        type_huile: initialData.type_huile || '',
        quantite_litres: initialData.quantite_litres || '',
        prix_total: initialData.prix_total || '',
        filtre_huile: initialData.filtre_huile || false,
        prix_filtre_huile: initialData.prix_filtre_huile || '',
        filtre_air: initialData.filtre_air || false,
        prix_filtre_air: initialData.prix_filtre_air || '',
        filtre_carburant: initialData.filtre_carburant || false,
        prix_filtre_carburant: initialData.prix_filtre_carburant || ''
      });
      isInitialized.current = true;
    }
  }, [initialData]);

  // Calculer les totaux
  const calculateTotals = () => {
    const totalHuile = parseFloat(vidange.prix_total) || 0;

    let totalFiltres = 0;
    if (vidange.filtre_huile && vidange.prix_filtre_huile) {
      totalFiltres += parseFloat(vidange.prix_filtre_huile);
    }
    if (vidange.filtre_air && vidange.prix_filtre_air) {
      totalFiltres += parseFloat(vidange.prix_filtre_air);
    }
    if (vidange.filtre_carburant && vidange.prix_filtre_carburant) {
      totalFiltres += parseFloat(vidange.prix_filtre_carburant);
    }

    return {
      totalHuile,
      totalFiltres,
      total: totalHuile + totalFiltres
    };
  };

  // Mettre à jour le parent
  useEffect(() => {
    const hasData = vidange.type_huile && vidange.quantite_litres && vidange.prix_total;
    const totals = calculateTotals();

    onChange({
      vidange: hasData ? {
        type_huile: vidange.type_huile,
        quantite_litres: parseFloat(vidange.quantite_litres),
        prix_total_huile: parseFloat(vidange.prix_total_huile),
        filtre_huile: vidange.filtre_huile,
        prix_filtre_huile: vidange.filtre_huile ? parseFloat(vidange.prix_filtre_huile) || 0 : null,
        filtre_air: vidange.filtre_air,
        prix_filtre_air: vidange.filtre_air ? parseFloat(vidange.prix_filtre_air) || 0 : null,
        filtre_carburant: vidange.filtre_carburant,
        prix_filtre_carburant: vidange.filtre_carburant ? parseFloat(vidange.prix_filtre_carburant) || 0 : null
      } : null,
      total: totals.total
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    vidange.type_huile,
    vidange.quantite_litres,
    vidange.prix_par_litre,
    vidange.filtre_huile,
    vidange.prix_filtre_huile,
    vidange.filtre_air,
    vidange.prix_filtre_air,
    vidange.filtre_carburant,
    vidange.prix_filtre_carburant
  ]);

  const handleChange = (field, value) => {
    setVidange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCheckboxChange = (field) => {
    setVidange(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Templates rapides
  const templateVidangeStandard = () => {
    setVidange({
      type_huile: '5W30',
      quantite_litres: '4',
      prix_total_huile: '',
      filtre_huile: true,
      prix_filtre_huile: '',
      filtre_air: false,
      prix_filtre_air: '',
      filtre_carburant: false,
      prix_filtre_carburant: ''
    });
  };

  const templateVidangeComplete = () => {
    setVidange({
      type_huile: '5W30',
      quantite_litres: '4',
      prix_total_huile: '',
      filtre_huile: true,
      prix_filtre_huile: '',
      filtre_air: true,
      prix_filtre_air: '',
      filtre_carburant: true,
      prix_filtre_carburant: ''
    });
  };

  const totals = calculateTotals();

  return (
    <div className="entretien-form-section">
      <h3 className="form-section-title">🛢️ Vidange</h3>

      {/* Templates rapides */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button
          type="button"
          onClick={templateVidangeStandard}
          style={{
            padding: '8px 16px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          ⚡ Vidange Standard (Huile + Filtre)
        </button>
        <button
          type="button"
          onClick={templateVidangeComplete}
          style={{
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          ⚡ Vidange Complète (3 Filtres)
        </button>
      </div>

      {/* Section Huile */}
      <div className="vidange-huile-section" style={{
        border: sectionHuileBorder,
        borderRadius: '10px',
        padding: '20px',
        background: sectionCardBg,
        marginBottom: '20px',
        boxShadow: '0 12px 28px rgba(16, 185, 129, 0.12)'
      }}>
        <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '15px', color: sectionHuileTitle }}>
          💧 Huile Moteur
        </h4>

        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
          <div className="form-group">
            <label style={{ fontSize: '14px', fontWeight: '500', color: labelColor, marginBottom: '8px', display: 'block' }}>
              Type d'huile <span style={{ color: requiredColor }}>*</span>
            </label>
            <input
              type="text"
              value={vidange.type_huile}
              onChange={(e) => handleChange('type_huile', e.target.value)}
              placeholder="Ex: 5W30, 10W40"
              className="form-input"
              style={sharedInputStyle}
              {...sharedInputFocusHandlers}
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: '14px', fontWeight: '500', color: labelColor, marginBottom: '8px', display: 'block' }}>
              Quantité (litres) <span style={{ color: requiredColor }}>*</span>
            </label>
            <input
              type="number"
              value={vidange.quantite_litres}
              onChange={(e) => handleChange('quantite_litres', e.target.value)}
              placeholder="5"
              step="0.1"
              min="0"
              className="form-input"
              style={sharedInputStyle}
              {...sharedInputFocusHandlers}
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: '14px', fontWeight: '500', color: labelColor, marginBottom: '8px', display: 'block' }}>
              Prix total huile (MAD) <span style={{ color: requiredColor }}>*</span>
            </label>
            <input
              type="number"
              value={vidange.prix_total_huile}
              onChange={(e) => handleChange('prix_total_huile', e.target.value)}
              placeholder="320"
              step="0.01"
              min="0"
              className="form-input"
              style={sharedInputStyle}
              {...sharedInputFocusHandlers}
            />
          </div>
        </div>

        {totals.totalHuile > 0 && (
          <div style={{ marginTop: '10px', padding: '10px', background: 'var(--bg-hover)', borderRadius: '6px', color: 'var(--text-primary)' }}>
            <strong>Sous-total huile:</strong> {totals.totalHuile.toFixed(2)} MAD
          </div>
        )}
      </div>

      {/* Section Filtres */}
      <div className="vidange-filtres-section" style={{
        border: sectionFiltresBorder,
        borderRadius: '10px',
        padding: '20px',
        background: sectionCardBg,
        boxShadow: '0 16px 32px rgba(99, 102, 241, 0.12)'
      }}>
        <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '15px', color: sectionFiltresTitle }}>
          🔧 Filtres (Optionnels)
        </h4>

        <div className="filtres-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
          {/* Filtre à huile */}
          <div className="filtre-card" style={{
            border: vidange.filtre_huile ? sectionFiltresBorder : filterBorderDefault,
            borderRadius: '8px',
            padding: '15px',
            background: vidange.filtre_huile ? activeFilterBg : inactiveFilterBg,
            transition: 'all 0.2s'
          }}>
            <label className="checkbox-label" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '10px', 
              cursor: 'pointer',
              userSelect: 'none'
            }}>
              <input
                type="checkbox"
                checked={vidange.filtre_huile}
                onChange={() => handleCheckboxChange('filtre_huile')}
                style={{ 
                  marginRight: '8px', 
                  width: '18px', 
                  height: '18px', 
                  cursor: 'pointer',
                  accentColor: checkboxAccent
                }}
              />
              <span style={{ fontWeight: '600', fontSize: '14px', color: labelColor }}>Filtre à huile</span>
            </label>

            {vidange.filtre_huile && (
              <input
                type="number"
                value={vidange.prix_filtre_huile}
                onChange={(e) => handleChange('prix_filtre_huile', e.target.value)}
                placeholder="Prix (MAD)"
                step="0.01"
                min="0"
                className="form-input"
                style={{ ...sharedInputStyle, padding: '8px' }}
                {...sharedInputFocusHandlers}
              />
            )}
          </div>

          {/* Filtre à air */}
          <div className="filtre-card" style={{
            border: vidange.filtre_air ? sectionFiltresBorder : filterBorderDefault,
            borderRadius: '8px',
            padding: '15px',
            background: vidange.filtre_air ? activeFilterBg : inactiveFilterBg,
            transition: 'all 0.2s'
          }}>
            <label className="checkbox-label" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '10px', 
              cursor: 'pointer',
              userSelect: 'none'
            }}>
              <input
                type="checkbox"
                checked={vidange.filtre_air}
                onChange={() => handleCheckboxChange('filtre_air')}
                style={{ 
                  marginRight: '8px', 
                  width: '18px', 
                  height: '18px', 
                  cursor: 'pointer',
                  accentColor: checkboxAccent
                }}
              />
              <span style={{ fontWeight: '600', fontSize: '14px', color: labelColor }}>Filtre à air</span>
            </label>

            {vidange.filtre_air && (
              <input
                type="number"
                value={vidange.prix_filtre_air}
                onChange={(e) => handleChange('prix_filtre_air', e.target.value)}
                placeholder="Prix (MAD)"
                step="0.01"
                min="0"
                className="form-input"
                style={{ ...sharedInputStyle, padding: '8px' }}
                {...sharedInputFocusHandlers}
              />
            )}
          </div>

          {/* Filtre à carburant */}
          <div className="filtre-card" style={{
            border: vidange.filtre_carburant ? sectionFiltresBorder : filterBorderDefault,
            borderRadius: '8px',
            padding: '15px',
            background: vidange.filtre_carburant ? activeFilterBg : inactiveFilterBg,
            transition: 'all 0.2s'
          }}>
            <label className="checkbox-label" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '10px', 
              cursor: 'pointer',
              userSelect: 'none'
            }}>
              <input
                type="checkbox"
                checked={vidange.filtre_carburant}
                onChange={() => handleCheckboxChange('filtre_carburant')}
                style={{ 
                  marginRight: '8px', 
                  width: '18px', 
                  height: '18px', 
                  cursor: 'pointer',
                  accentColor: checkboxAccent
                }}
              />
              <span style={{ fontWeight: '600', fontSize: '14px', color: labelColor }}>Filtre à carburant</span>
            </label>

            {vidange.filtre_carburant && (
              <input
                type="number"
                value={vidange.prix_filtre_carburant}
                onChange={(e) => handleChange('prix_filtre_carburant', e.target.value)}
                placeholder="Prix (MAD)"
                step="0.01"
                min="0"
                className="form-input"
                style={{ ...sharedInputStyle, padding: '8px' }}
                {...sharedInputFocusHandlers}
              />
            )}
          </div>
        </div>
      </div>

      {/* Résumé */}
      {totals.total > 0 && (
        <div className="vidange-summary" style={{
          background: summaryBackground,
          color: summaryValueColor,
          padding: '15px 20px',
          borderRadius: '10px',
          marginTop: '15px',
          border: summaryBorder,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '15px',
          boxShadow: '0 10px 28px rgba(15, 118, 110, 0.1)'
        }}>
          <div>
            <div style={{ fontSize: '12px', color: summaryLabelColor }}>Huile</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
              {totals.totalHuile.toFixed(2)} MAD
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: summaryLabelColor }}>Filtres</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
              {totals.totalFiltres.toFixed(2)} MAD
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: summaryLabelColor }}>TOTAL</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {totals.total.toFixed(2)} MAD
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VidangeForm;
