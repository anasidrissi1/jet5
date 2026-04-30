import React, { useState, useEffect } from 'react';

function FreinsForm({ onChange, initialData = null }) {
  const [freins, setFreins] = useState({
    plaquettes_avant: false,
    plaquettes_arriere: false,
    disques_avant: false,
    disques_arriere: false,
  });

  const [prix, setPrix] = useState({
    plaquettes_avant: '',
    plaquettes_arriere: '',
    disques_avant: '',
    disques_arriere: '',
  });

  // Templates rapides
  const templatePlaquettesAvant = () => {
    setFreins({ ...freins, plaquettes_avant: true });
    setPrix({ ...prix, plaquettes_avant: '400' });
  };

  const templateDisquesAvant = () => {
    setFreins({ ...freins, disques_avant: true });
    setPrix({ ...prix, disques_avant: '600' });
  };

  const templateFreinsComplets = () => {
    setFreins({
      plaquettes_avant: true,
      plaquettes_arriere: true,
      disques_avant: true,
      disques_arriere: true,
    });
    setPrix({
      plaquettes_avant: '400',
      plaquettes_arriere: '400',
      disques_avant: '600',
      disques_arriere: '600',
    });
  };

  // Charger les données initiales
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      const newFreins = { ...freins };
      const newPrix = { ...prix };
      
      initialData.forEach(frein => {
        newFreins[frein.type_frein] = true;
        newPrix[frein.type_frein] = frein.prix_unitaire;
      });
      
      setFreins(newFreins);
      setPrix(newPrix);
    }
  }, [initialData]);

  // Calculer le total
  const calculateTotal = () => {
    let total = 0;
    Object.keys(freins).forEach(type => {
      if (freins[type] && prix[type]) {
        // Prix unitaire × 2 (pour avant/arrière)
        total += (parseFloat(prix[type]) || 0) * 2;
      }
    });
    return total;
  };

  // Mettre à jour le parent
  useEffect(() => {
    const freinsData = [];
    Object.keys(freins).forEach(type => {
      if (freins[type]) {
        freinsData.push({
          type_frein: type,
          prix_unitaire: parseFloat(prix[type]) || 0
        });
      }
    });
    
    onChange({
      freins: freinsData,
      total: calculateTotal()
    });
  }, [freins, prix]);

  const handleCheckboxChange = (type) => {
    setFreins(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const handlePrixChange = (type, value) => {
    setPrix(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const typeLabels = {
    plaquettes_avant: { label: 'Plaquettes Avant', icon: '🔴' },
    plaquettes_arriere: { label: 'Plaquettes Arrière', icon: '🔴' },
    disques_avant: { label: 'Disques Avant', icon: '⚫' },
    disques_arriere: { label: 'Disques Arrière', icon: '⚫' },
  };

  return (
    <div className="entretien-form-section">
      <h3 className="form-section-title">🛑 Freins à Changer</h3>
      
      {/* Templates rapides */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={templatePlaquettesAvant}
          style={{
            padding: '8px 16px',
            background: '#D4A900',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          ⚡ Plaquettes Avant
        </button>
        <button
          type="button"
          onClick={templateDisquesAvant}
          style={{
            padding: '8px 16px',
            background: '#B8900A',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          ⚡ Disques Avant
        </button>
        <button
          type="button"
          onClick={templateFreinsComplets}
          style={{
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #D4A900 0%, #7A6000 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          ⚡ Freins Complets
        </button>
      </div>
      
      <div className="freins-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '20px' }}>
        {Object.keys(freins).map(type => (
          <div key={type} className="frein-card" style={{
            border: freins[type] ? '2px solid #D4A900' : '2px solid var(--border-color)',
            borderRadius: '10px',
            padding: '15px',
            background: freins[type] ? 'var(--bg-hover)' : 'var(--bg-card)',
            transition: 'all 0.3s'
          }}>
            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={freins[type]}
                onChange={() => handleCheckboxChange(type)}
                style={{ marginRight: '10px', width: '16px', height: '16px' }}
              />
              <span style={{ fontWeight: '600', fontSize: '15px' }}>
                {typeLabels[type].icon} {typeLabels[type].label}
              </span>
            </label>

            {freins[type] && (
              <div className="frein-details">
                <div className="form-group">
                  <label style={{ fontSize: '13px', color: '#6b7280', marginBottom: '5px', display: 'block' }}>
                    Prix unitaire (MAD)
                  </label>
                  <input
                    type="number"
                    value={prix[type]}
                    onChange={(e) => handlePrixChange(type, e.target.value)}
                    placeholder="400"
                    step="0.01"
                    min="0"
                    className="form-input"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  />
                  <small style={{ fontSize: '12px', color: '#9ca3af', marginTop: '5px', display: 'block' }}>
                    Total: {((parseFloat(prix[type]) || 0) * 2).toFixed(2)} MAD (× 2)
                  </small>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Résumé */}
      <div className="freins-summary" style={{
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
        padding: '15px 20px',
        borderRadius: '10px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Composants sélectionnés</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {Object.values(freins).filter(Boolean).length} élément(s)
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Sous-total</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {calculateTotal().toFixed(2)} MAD
          </div>
        </div>
      </div>
    </div>
  );
}

export default FreinsForm;
