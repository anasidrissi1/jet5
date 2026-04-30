import React from 'react';

function CoutRecapitulatif({ 
  typeEntretien, 
  mainOeuvre = 0, 
  sousTotal = 0, 
  details = {} 
}) {
  const total = parseFloat(mainOeuvre) + parseFloat(sousTotal);

  const getTypeIcon = () => {
    switch(typeEntretien) {
      case 'pneus': return '🛞';
      case 'freins': return '🛑';
      case 'batterie': return '🔋';
      case 'vidange': return '🛢️';
      case 'autre': return '⚙️';
      default: return '🔧';
    }
  };

  const getTypeLabel = () => {
    switch(typeEntretien) {
      case 'pneus': return 'Pneus';
      case 'freins': return 'Freins';
      case 'batterie': return 'Batterie';
      case 'vidange': return 'Vidange';
      case 'autre': return 'Révision Générale';
      default: return 'Entretien';
    }
  };

  const getGradient = () => {
    switch(typeEntretien) {
      case 'pneus': return 'linear-gradient(135deg, #D4A900 0%, #B8900A 100%)';
      case 'freins': return 'linear-gradient(135deg, #D4A900 0%, #B8900A 100%)';
      case 'batterie': return 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)';
      case 'vidange': return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      case 'autre': return 'linear-gradient(135deg, #F5C400 0%, #B8900A 100%)';
      default: return 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
    }
  };

  return (
    <div className="cout-recapitulatif" style={{
      position: 'sticky',
      top: '20px',
      background: 'var(--bg-card)',
      borderRadius: '12px',
      boxShadow: 'var(--shadow-lg)',
      overflow: 'hidden',
      border: '2px solid var(--border-color)'
    }}>
      {/* Header */}
      <div style={{
        background: getGradient(),
        color: 'white',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '36px', marginBottom: '8px' }}>
          {getTypeIcon()}
        </div>
        <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
          {getTypeLabel()}
        </div>
        <div style={{ fontSize: '13px', opacity: 0.9 }}>
          Récapitulatif des coûts
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '20px' }}>
        {/* Détails selon le type */}
        {typeEntretien === 'pneus' && details.pneus && details.pneus.length > 0 && (
          <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>
              Pneus sélectionnés:
            </div>
            {details.pneus.map((pneu, index) => (
              <div key={index} style={{ fontSize: '12px', color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span>{pneu.position_display || pneu.position}</span>
                <span style={{ fontWeight: '600' }}>{parseFloat(pneu.prix_unitaire).toFixed(2)} MAD</span>
              </div>
            ))}
          </div>
        )}

        {typeEntretien === 'freins' && details.freins && details.freins.length > 0 && (
          <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>
              Composants sélectionnés:
            </div>
            {details.freins.map((frein, index) => (
              <div key={index} style={{ fontSize: '12px', color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span>{frein.type_display || frein.type_frein}</span>
                <span style={{ fontWeight: '600' }}>{(parseFloat(frein.prix_unitaire) * 2).toFixed(2)} MAD</span>
              </div>
            ))}
          </div>
        )}

        {typeEntretien === 'batterie' && details.batterie && (
          <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>
              Batterie:
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginBottom: '4px' }}>
              {details.batterie.marque} {details.batterie.modele}
            </div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
              {parseFloat(details.batterie.prix).toFixed(2)} MAD
            </div>
          </div>
        )}

        {typeEntretien === 'vidange' && details.vidange && (
          <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>
              Vidange:
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Huile ({details.vidange.quantite_litres}L)</span>
              <span style={{ fontWeight: '600' }}>
                {parseFloat(details.vidange.prix_total).toFixed(2)} MAD
              </span>
            </div>
            {(details.vidange.filtre_huile || details.vidange.filtre_air || details.vidange.filtre_carburant) && (
              <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '4px' }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>Filtres:</div>
                {details.vidange.filtre_huile && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', color: 'var(--text-primary)' }}>
                    <span>• Filtre à huile</span>
                    <span>{parseFloat(details.vidange.prix_filtre_huile || 0).toFixed(2)} MAD</span>
                  </div>
                )}
                {details.vidange.filtre_air && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', color: 'var(--text-primary)' }}>
                    <span>• Filtre à air</span>
                    <span>{parseFloat(details.vidange.prix_filtre_air || 0).toFixed(2)} MAD</span>
                  </div>
                )}
                {details.vidange.filtre_carburant && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)' }}>
                    <span>• Filtre à carburant</span>
                    <span>{parseFloat(details.vidange.prix_filtre_carburant || 0).toFixed(2)} MAD</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {typeEntretien === 'autre' && details.revision && (
          <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>
              Révision:
            </div>
            {details.revision.pieces && details.revision.pieces.length > 0 && (
              <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                <div style={{ fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>
                  {details.revision.pieces.length} pièce(s) remplacée(s)
                </div>
              </div>
            )}
          </div>
        )}

        {/* Calculs */}
        <div style={{ marginTop: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            <span>Sous-total pièces:</span>
            <span style={{ fontWeight: '600' }}>{parseFloat(sousTotal).toFixed(2)} MAD</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '14px', color: 'var(--text-secondary)' }}>
            <span>Main d'œuvre:</span>
            <span style={{ fontWeight: '600' }}>{parseFloat(mainOeuvre).toFixed(2)} MAD</span>
          </div>
          
          <div style={{
            borderTop: '2px solid var(--border-color)',
            paddingTop: '15px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
              TOTAL:
            </span>
            <span style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              {total.toFixed(2)} MAD
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        background: 'var(--bg-secondary)',
        padding: '12px 20px',
        fontSize: '12px',
        color: 'var(--text-secondary)',
        textAlign: 'center',
        borderTop: '1px solid var(--border-color)'
      }}>
        💡 Le coût total est calculé automatiquement
      </div>
    </div>
  );
}

export default CoutRecapitulatif;
