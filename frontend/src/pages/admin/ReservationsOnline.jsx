import React from 'react';
import ReservationsProfessional from './ReservationsProfessional';

function ReservationsOnline() {
  return (
    <ReservationsProfessional
      sourceFilter="en_ligne"
      title="Réservations en ligne"
      subtitle="Demandes créées depuis l'interface client publique"
      allowCreate={false}
    />
  );
}

export default ReservationsOnline;