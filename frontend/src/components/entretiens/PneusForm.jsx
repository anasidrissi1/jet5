import React, { useState, useEffect } from 'react';

function PneusForm({ onChange, initialData = null }) {
  const [pneus, setPneus] = useState({
    avant_gauche: false,
    avant_droit: false,
    arriere_gauche: false,
    arriere_droit: false,
  });

  const [details, setDetails] = useState({
    avant_gauche: { marque: '', modele: '', prix_unitaire: '' },
    avant_droit: { marque: '', modele: '', prix_unitaire: '' },
    arriere_gauche: { marque: '', modele: '', prix_unitaire: '' },
    arriere_droit: { marque: '', modele: '', prix_unitaire: '' },
  });

  const [tousLesPneus, setTousLesPneus] = useState(false);
  const [marqueCommune, setMarqueCommune] = useState('');
  const [modeleCommun, setModeleCommun] = useState('');
  const [prixCommun, setPrixCommun] = useState('');

  // Charger les données initiales si en mode édition
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      const newPneus = { ...pneus };
      const newDetails = { ...details };
      
      initialData.forEach(pneu => {
        newPneus[pneu.position] = true;
        newDetails[pneu.position] = {
          marque: pneu.marque,
          modele: pneu.modele,
          prix_unitaire: pneu.prix_unitaire
        };
      });
      
      setPneus(newPneus);
      setDetails(newDetails);
    }
  }, [initialData]);

  // Calculer le total
  const calculateTotal = () => {
    let total = 0;
    Object.keys(pneus).forEach(position => {
      if (pneus[position] && details[position].prix_unitaire) {
        total += parseFloat(details[position].prix_unitaire) || 0;
      }
    });
    return total;
  };

  // Mettre à jour le parent à chaque changement
  useEffect(() => {
    const pneusData = [];
    Object.keys(pneus).forEach(position => {
      if (pneus[position]) {
        pneusData.push({
          position,
          marque: details[position].marque,
          modele: details[position].modele,
          prix_unitaire: parseFloat(details[position].prix_unitaire) || 0
        });
      }
    });
    
    onChange({
      pneus: pneusData,
      total: calculateTotal()
    });
  }, [pneus, details]);

  const handleCheckboxChange = (position) => {
    setPneus(prev => ({
      ...prev,
      [position]: !prev[position]
    }));
  };

  const handleTousLesPneusChange = () => {
    const newValue = !tousLesPneus;
    setTousLesPneus(newValue);
    setPneus({
      avant_gauche: newValue,
      avant_droit: newValue,
      arriere_gauche: newValue,
      arriere_droit: newValue,
    });
  };

  const handleDetailChange = (position, field, value) => {
    setDetails(prev => ({
      ...prev,
      [position]: {
        ...prev[position],
        [field]: value
      }
    }));
  };

  // Appliquer marque/modèle/prix à tous les pneus cochés
  const appliquerATous = () => {
    const newDetails = { ...details };
    Object.keys(pneus).forEach(position => {
      if (pneus[position]) {
        newDetails[position] = {
          marque: marqueCommune,
          modele: modeleCommun,
          prix_unitaire: prixCommun
        };
      }
    });
    setDetails(newDetails);
  };

  // (Supprimé) Remplissage rapide via bouton

  const positionLabels = {
    avant_gauche: 'Avant Gauche',
    avant_droit: 'Avant Droit',
    arriere_gauche: 'Arrière Gauche',
    arriere_droit: 'Arrière Droit',
  };

  return (
    <div className="entretien-form-section">
      <h3 className="form-section-title">🛞 Pneus à Changer</h3>
      
      {/* Templates rapides - supprimé sur demande */}

      {/* Remplissage rapide pour tous - AMÉLIORATION */}
      <div style={{ 
        marginBottom: '24px', 
        padding: '24px', 
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        borderRadius: '12px',
        color: 'white',
        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
        border: '2px solid rgba(255, 255, 255, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.2)', 
            borderRadius: '50%', 
            width: '40px', 
            height: '40px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '20px'
          }}>
            ⚡
          </div>
          <div>
            <h4 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>
              Remplissage Rapide
            </h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.9 }}>
              Copiez les mêmes informations sur tous les pneus cochés
            </p>
          </div>
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '12px', 
          marginBottom: '16px' 
        }}>
          <div>
            <label style={{ fontSize: '13px', display: 'block', marginBottom: '6px', fontWeight: '600', opacity: 0.95 }}>
              🏷️ Marque
            </label>
            <input
              type="text"
              value={marqueCommune}
              onChange={(e) => setMarqueCommune(e.target.value)}
              placeholder="Ex: Michelin, Bridgestone..."
              style={{ 
                width: '100%', 
                padding: '12px', 
                borderRadius: '8px', 
                border: '1px solid var(--border-color)',
                fontSize: '15px',
                fontWeight: '500',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)'
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '13px', display: 'block', marginBottom: '6px', fontWeight: '600', opacity: 0.95 }}>
              📦 Modèle
            </label>
            <input
              type="text"
              value={modeleCommun}
              onChange={(e) => setModeleCommun(e.target.value)}
              placeholder="Ex: Primacy 4, Turanza..."
              style={{ 
                width: '100%', 
                padding: '12px', 
                borderRadius: '8px', 
                border: '1px solid var(--border-color)',
                fontSize: '15px',
                fontWeight: '500',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)'
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '13px', display: 'block', marginBottom: '6px', fontWeight: '600', opacity: 0.95 }}>
              💰 Prix unitaire (MAD)
            </label>
            <input
              type="number"
              value={prixCommun}
              onChange={(e) => setPrixCommun(e.target.value)}
              placeholder="800"
              step="0.01"
              min="0"
              style={{ 
                width: '100%', 
                padding: '12px', 
                borderRadius: '8px', 
                border: '1px solid var(--border-color)',
                fontSize: '15px',
                fontWeight: '500',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)'
              }}
            />
          </div>
        </div>
        
        <button
          type="button"
          onClick={appliquerATous}
          disabled={!marqueCommune && !modeleCommun && !prixCommun}
          style={{
            width: '100%',
            padding: '14px 24px',
            background: 'var(--bg-card)',
            color: '#059669',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '700',
            cursor: (!marqueCommune && !modeleCommun && !prixCommun) ? 'not-allowed' : 'pointer',
            fontSize: '15px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s',
            opacity: (!marqueCommune && !modeleCommun && !prixCommun) ? 0.6 : 1
          }}
          onMouseOver={(e) => {
            if (marqueCommune || modeleCommun || prixCommun) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
          }}
        >
          ✓ Appliquer à tous les pneus cochés
        </button>
        
        {Object.values(pneus).filter(Boolean).length === 0 && (
          <div style={{ 
            marginTop: '12px', 
            padding: '10px', 
            background: 'rgba(245, 196, 0, 0.2)', 
            borderRadius: '6px',
            fontSize: '13px',
            textAlign: 'center',
            border: '1px solid rgba(245, 196, 0, 0.3)'
          }}>
            ⚠️ Veuillez d'abord cocher au moins un pneu ci-dessous
          </div>
        )}
      </div>
      
      {/* Option "Tous les pneus" */}
      <div className="checkbox-group" style={{ marginBottom: '20px', padding: '15px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <label className="checkbox-label" style={{ fontSize: '16px', fontWeight: '600' }}>
          <input
            type="checkbox"
            checked={tousLesPneus}
            onChange={handleTousLesPneusChange}
            style={{ marginRight: '10px', width: '18px', height: '18px' }}
          />
          ✅ Tous les 4 pneus
        </label>
      </div>

      {/* Sélection individuelle des pneus */}
      <div className="pneus-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '20px' }}>
        {Object.keys(pneus).map(position => (
          <div key={position} className="pneu-card" style={{
            border: pneus[position] ? '2px solid #D4A900' : '2px solid #e5e7eb',
            borderRadius: '10px',
            padding: '15px',
            background: pneus[position] ? 'var(--bg-hover)' : 'var(--bg-card)',
            transition: 'all 0.3s'
          }}>
            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={pneus[position]}
                onChange={() => handleCheckboxChange(position)}
                style={{ marginRight: '10px', width: '16px', height: '16px' }}
              />
              <span style={{ fontWeight: '600', fontSize: '15px' }}>{positionLabels[position]}</span>
            </label>

            {pneus[position] && (
              <div className="pneu-details" style={{ marginTop: '10px' }}>
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '13px', color: '#6b7280', marginBottom: '5px', display: 'block' }}>Marque</label>
                  <input
                    type="text"
                    value={details[position].marque}
                    onChange={(e) => handleDetailChange(position, 'marque', e.target.value)}
                    placeholder="Ex: Michelin"
                    className="form-input"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '13px', color: '#6b7280', marginBottom: '5px', display: 'block' }}>Modèle</label>
                  <input
                    type="text"
                    value={details[position].modele}
                    onChange={(e) => handleDetailChange(position, 'modele', e.target.value)}
                    placeholder="Ex: Primacy 4"
                    className="form-input"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '13px', color: '#6b7280', marginBottom: '5px', display: 'block' }}>Prix unitaire (MAD)</label>
                  <input
                    type="number"
                    value={details[position].prix_unitaire}
                    onChange={(e) => handleDetailChange(position, 'prix_unitaire', e.target.value)}
                    placeholder="500"
                    step="0.01"
                    min="0"
                    className="form-input"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Résumé */}
      <div className="pneus-summary" style={{
        background: 'linear-gradient(135deg, #D4A900 0%, #B8900A 100%)',
        color: 'white',
        padding: '15px 20px',
        borderRadius: '10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Pneus sélectionnés</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {Object.values(pneus).filter(Boolean).length} pneu(s)
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Sous-total</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {calculateTotal().toFixed(2)} MAD
          </div>
        </div>
      </div>
    </div>
  );
}

export default PneusForm;
