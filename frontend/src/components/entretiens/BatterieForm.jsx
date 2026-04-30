import React, { useState, useEffect } from 'react';

function BatterieForm({ onChange, initialData = null }) {
  // Initialiser batterie une seule fois au montage ou si initialData change ET que le state est encore vierge
  const [batterie, setBatterie] = useState(() => initialData ? {
    marque: initialData.marque || '',
    modele: initialData.modele || '',
    prix: initialData.prix || ''
  } : {
    marque: '',
    modele: '',
    prix: ''
  });

  // Bloquer la réinitialisation après le premier set
  const didInitRef = React.useRef(false);
  useEffect(() => {
    if (!didInitRef.current && initialData && batterie.marque === '' && batterie.modele === '' && batterie.prix === '') {
      setBatterie({
        marque: initialData.marque || '',
        modele: initialData.modele || '',
        prix: initialData.prix || ''
      });
      didInitRef.current = true;
    }
    // Ne pas mettre batterie dans les dépendances pour éviter la boucle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  // Mettre à jour le parent
  useEffect(() => {
    onChange({
      batterie: batterie.marque && batterie.modele && batterie.prix ? batterie : null,
      total: parseFloat(batterie.prix) || 0
    });
  }, [batterie, onChange]);

  const handleChange = (field, value) => {
    setBatterie(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Templates rapides
  const templateVarta = () => {
    setBatterie({ marque: 'Varta', modele: '12V 70Ah', prix: '1500' });
  };

  const templateBosch = () => {
    setBatterie({ marque: 'Bosch', modele: '12V 60Ah', prix: '1200' });
  };

  return (
    <div className="entretien-form-section">
      <h3 className="form-section-title">🔋 Batterie</h3>
      
      {/* Templates rapides */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button
          type="button"
          onClick={templateVarta}
          style={{
            padding: '8px 16px',
            background: '#fbbf24',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          ⚡ Varta 70Ah
        </button>
        <button
          type="button"
          onClick={templateBosch}
          style={{
            padding: '8px 16px',
            background: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          ⚡ Bosch 60Ah
        </button>
      </div>
      
      <div className="batterie-card" style={{
        border: '2px solid #fbbf24',
        borderRadius: '10px',
        padding: '20px',
        background: 'var(--bg-card)'
      }}>
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '15px' }}>
          <div className="form-group">
            <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '8px', display: 'block' }}>
              Marque <span style={{ color: '#D4A900' }}>*</span>
            </label>
            <input
              type="text"
              value={batterie.marque}
              onChange={(e) => handleChange('marque', e.target.value)}
              placeholder="Ex: Varta, Bosch"
              className="form-input"
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '8px', display: 'block' }}>
              Modèle/Référence <span style={{ color: '#D4A900' }}>*</span>
            </label>
            <input
              type="text"
              value={batterie.modele}
              onChange={(e) => handleChange('modele', e.target.value)}
              placeholder="Ex: 12V 70Ah"
              className="form-input"
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        <div className="form-group">
          <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '8px', display: 'block' }}>
            Prix (MAD) <span style={{ color: '#D4A900' }}>*</span>
          </label>
          <input
            type="number"
            value={batterie.prix}
            onChange={(e) => handleChange('prix', e.target.value)}
            placeholder="1500"
            step="0.01"
            min="0"
            className="form-input"
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Résumé */}
      {batterie.prix && (
        <div className="batterie-summary" style={{
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          padding: '15px 20px',
          borderRadius: '10px',
          marginTop: '15px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Batterie</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
              {batterie.marque} {batterie.modele}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Prix</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {parseFloat(batterie.prix).toFixed(2)} MAD
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BatterieForm;
