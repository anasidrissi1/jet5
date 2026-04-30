import React, { useState, useEffect } from 'react';

function RevisionForm({ onChange, initialData = null }) {
  const [controles, setControles] = useState({
    controle_freins: false,
    prix_controle_freins: '',
    controle_suspension: false,
    prix_controle_suspension: '',
    controle_direction: false,
    prix_controle_direction: '',
    controle_climatisation: false,
    prix_controle_climatisation: '',
    diagnostic_electronique: false,
    prix_diagnostic_electronique: ''
  });

  const [pieces, setPieces] = useState([]);

  // Charger les données initiales
  // Ne reset qu'une seule fois au montage ou quand initialData change vraiment
  const didInitRef = React.useRef(false);
  useEffect(() => {
    if (initialData && !didInitRef.current) {
      setControles({
        controle_freins: initialData.controle_freins || false,
        prix_controle_freins: initialData.prix_controle_freins || '',
        controle_suspension: initialData.controle_suspension || false,
        prix_controle_suspension: initialData.prix_controle_suspension || '',
        controle_direction: initialData.controle_direction || false,
        prix_controle_direction: initialData.prix_controle_direction || '',
        controle_climatisation: initialData.controle_climatisation || false,
        prix_controle_climatisation: initialData.prix_controle_climatisation || '',
        diagnostic_electronique: initialData.diagnostic_electronique || false,
        prix_diagnostic_electronique: initialData.prix_diagnostic_electronique || ''
      });
      if (initialData.pieces && initialData.pieces.length > 0) {
        setPieces(initialData.pieces);
      }
      didInitRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  // Calculer les totaux
  const calculateTotals = () => {
    let totalControles = 0;
    
    if (controles.controle_freins && controles.prix_controle_freins) {
      totalControles += parseFloat(controles.prix_controle_freins);
    }
    if (controles.controle_suspension && controles.prix_controle_suspension) {
      totalControles += parseFloat(controles.prix_controle_suspension);
    }
    if (controles.controle_direction && controles.prix_controle_direction) {
      totalControles += parseFloat(controles.prix_controle_direction);
    }
    if (controles.controle_climatisation && controles.prix_controle_climatisation) {
      totalControles += parseFloat(controles.prix_controle_climatisation);
    }
    if (controles.diagnostic_electronique && controles.prix_diagnostic_electronique) {
      totalControles += parseFloat(controles.prix_diagnostic_electronique);
    }
    
    const totalPieces = pieces.reduce((sum, piece) => sum + (parseFloat(piece.prix) || 0), 0);
    
    return {
      totalControles,
      totalPieces,
      total: totalControles + totalPieces
    };
  };

  // Mettre à jour le parent
  useEffect(() => {
    const hasData = Object.values(controles).some(v => v === true) || pieces.length > 0;
    
    onChange({
      revision: hasData ? {
        controle_freins: controles.controle_freins,
        prix_controle_freins: controles.controle_freins ? parseFloat(controles.prix_controle_freins) || 0 : null,
        controle_suspension: controles.controle_suspension,
        prix_controle_suspension: controles.controle_suspension ? parseFloat(controles.prix_controle_suspension) || 0 : null,
        controle_direction: controles.controle_direction,
        prix_controle_direction: controles.controle_direction ? parseFloat(controles.prix_controle_direction) || 0 : null,
        controle_climatisation: controles.controle_climatisation,
        prix_controle_climatisation: controles.controle_climatisation ? parseFloat(controles.prix_controle_climatisation) || 0 : null,
        diagnostic_electronique: controles.diagnostic_electronique,
        prix_diagnostic_electronique: controles.diagnostic_electronique ? parseFloat(controles.prix_diagnostic_electronique) || 0 : null,
        pieces: pieces.map(p => ({
          nom_piece: p.nom_piece,
          prix: parseFloat(p.prix) || 0
        }))
      } : null,
      total: calculateTotals().total
    });
  }, [controles, pieces]);

  const handleCheckboxChange = (field) => {
    setControles(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handlePrixChange = (field, value) => {
    setControles(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addPiece = () => {
    setPieces(prev => [...prev, { nom_piece: '', prix: '' }]);
  };

  const removePiece = (index) => {
    setPieces(prev => prev.filter((_, i) => i !== index));
  };

  const updatePiece = (index, field, value) => {
    setPieces(prev => prev.map((piece, i) => 
      i === index ? { ...piece, [field]: value } : piece
    ));
  };

  const controlesConfig = [
    { key: 'controle_freins', label: 'Contrôle Freins', icon: '🛑' },
    { key: 'controle_suspension', label: 'Contrôle Suspension', icon: '🔧' },
    { key: 'controle_direction', label: 'Contrôle Direction', icon: '🎯' },
    { key: 'controle_climatisation', label: 'Contrôle Climatisation', icon: '❄️' },
    { key: 'diagnostic_electronique', label: 'Diagnostic Électronique', icon: '💻' }
  ];

  const totals = calculateTotals();

  return (
    <div className="entretien-form-section" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <h3 className="form-section-title" style={{ color: '#fff', background: 'linear-gradient(90deg, #D4A900, #F5C400)', borderRadius: '10px', padding: '12px 24px', marginBottom: '24px', fontWeight: '700', fontSize: '22px', letterSpacing: '1px' }}>⚙️ Révision Générale</h3>

      {/* Section Contrôles */}
      <div className="revision-controles-section" style={{
        border: '2px solid #D4A900',
        borderRadius: '10px',
        padding: '20px',
        background: 'rgba(49, 51, 69, 0.95)',
        marginBottom: '20px',
        boxShadow: '0 2px 12px rgba(99,102,241,0.08)'
      }}>
        <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '15px', color: '#FCD34D', letterSpacing: '0.5px' }}>
          🔍 Contrôles
        </h4>

        <div className="controles-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
          {controlesConfig.map(({ key, label, icon }) => (
            <div key={key} className="controle-card" style={{
              border: controles[key] ? '2px solid #D4A900' : '2px solid #374151',
              borderRadius: '8px',
              padding: '15px',
              background: controles[key] ? 'rgba(99,102,241,0.12)' : 'rgba(30,32,48,0.95)',
              color: controles[key] ? '#fff' : '#d1d5db',
              boxShadow: controles[key] ? '0 2px 8px rgba(99,102,241,0.12)' : 'none'
            }}>
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', cursor: 'pointer', zIndex: 2, pointerEvents: 'auto' }}>
                <input
                  type="checkbox"
                  checked={controles[key]}
                  onChange={() => handleCheckboxChange(key)}
                  style={{ marginRight: '8px', width: '16px', height: '16px', zIndex: 3, pointerEvents: 'auto' }}
                />
                <span style={{ fontWeight: '600', fontSize: '14px', color: controles[key] ? '#fff' : '#FCD34D', zIndex: 2, pointerEvents: 'auto' }}>
                  {icon} {label}
                </span>
              </label>

              {controles[key] && (
                <input
                  type="number"
                  value={controles[`prix_${key}`]}
                  onChange={(e) => handlePrixChange(`prix_${key}`, e.target.value)}
                  placeholder="Prix (MAD)"
                  step="0.01"
                  min="0"
                  className="form-input"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #D4A900', background: '#18181b', color: '#fff', appearance: 'textfield' }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Section Pièces Remplacées */}
      <div className="revision-pieces-section" style={{
        border: '2px solid #f59e0b',
        borderRadius: '10px',
        padding: '20px',
        background: 'rgba(30,32,48,0.95)',
        boxShadow: '0 2px 12px rgba(245,158,11,0.08)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#fbbf24' }}>
            🔩 Pièces Remplacées
          </h4>
          <button
            type="button"
            onClick={addPiece}
            style={{
              padding: '8px 16px',
              background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
              color: '#18181b',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              boxShadow: '0 2px 8px rgba(245,158,11,0.12)'
            }}
          >
            + Ajouter une pièce
          </button>
        </div>

        {pieces.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#fbbf24', background: 'rgba(30,32,48,0.95)', borderRadius: '8px' }}>
            Aucune pièce ajoutée. Cliquez sur "Ajouter une pièce" pour commencer.
          </div>
        ) : (
          <div className="pieces-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pieces.map((piece, index) => (
              <div key={index} className="piece-item" style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr auto',
                gap: '10px',
                padding: '10px',
                background: '#18181b',
                borderRadius: '6px',
                border: '1px solid #fbbf24',
                color: '#fff'
              }}>
                <input
                  type="text"
                  value={piece.nom_piece}
                  onChange={(e) => updatePiece(index, 'nom_piece', e.target.value)}
                  placeholder="Nom de la pièce"
                  className="form-input"
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #D4A900', background: '#232336', color: '#fff' }}
                />
                <input
                  type="number"
                  value={piece.prix}
                  onChange={(e) => updatePiece(index, 'prix', e.target.value)}
                  placeholder="Prix (MAD)"
                  step="0.01"
                  min="0"
                  className="form-input"
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #D4A900', background: '#232336', color: '#fff', appearance: 'textfield' }}
                />
                <button
                  type="button"
                  onClick={() => removePiece(index)}
                  style={{
                    padding: '8px 12px',
                    background: 'linear-gradient(90deg, #D4A900, #f59e0b)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    boxShadow: '0 2px 8px rgba(245, 196, 0, 0.12)'
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Résumé */}
      {totals.total > 0 && (
        <div className="revision-summary" style={{
          background: 'linear-gradient(135deg, #D4A900 0%, #F5C400 100%)',
          color: '#fff',
          padding: '15px 20px',
          borderRadius: '10px',
          marginTop: '15px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '15px',
          boxShadow: '0 2px 12px rgba(99,102,241,0.12)'
        }}>
          <div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>Contrôles</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
              {totals.totalControles.toFixed(2)} MAD
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>Pièces ({pieces.length})</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
              {totals.totalPieces.toFixed(2)} MAD
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>TOTAL</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {totals.total.toFixed(2)} MAD
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RevisionForm;
