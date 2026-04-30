// Status des voitures
export const CAR_STATUS = {
  AVAILABLE: 'available',
  RESERVED: 'reserved',
  RENTED: 'rented',
  MAINTENANCE: 'maintenance'
};

export const CAR_STATUS_LABELS = {
  [CAR_STATUS.AVAILABLE]: 'Disponible',
  [CAR_STATUS.RESERVED]: 'Réservée',
  [CAR_STATUS.RENTED]: 'En location',
  [CAR_STATUS.MAINTENANCE]: 'En maintenance'
};

// Status des réservations
export const RESERVATION_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed'
};

export const RESERVATION_STATUS_LABELS = {
  [RESERVATION_STATUS.PENDING]: 'En attente',
  [RESERVATION_STATUS.CONFIRMED]: 'Confirmée',
  [RESERVATION_STATUS.CANCELLED]: 'Annulée',
  [RESERVATION_STATUS.COMPLETED]: 'Terminée'
};

// Status des paiements
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

export const PAYMENT_STATUS_LABELS = {
  [PAYMENT_STATUS.PENDING]: 'En attente',
  [PAYMENT_STATUS.COMPLETED]: 'Complété',
  [PAYMENT_STATUS.FAILED]: 'Échoué',
  [PAYMENT_STATUS.REFUNDED]: 'Remboursé'
};

// Méthodes de paiement
export const PAYMENT_METHODS = {
  CARD: 'card',
  CASH: 'cash',
  TRANSFER: 'transfer'
};

export const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHODS.CARD]: 'Carte bancaire',
  [PAYMENT_METHODS.CASH]: 'Espèces',
  [PAYMENT_METHODS.TRANSFER]: 'Virement'
};

// Types de carburant
export const FUEL_TYPES = {
  GASOLINE: 'gasoline',
  DIESEL: 'diesel',
  HYBRID: 'hybrid',
  ELECTRIC: 'electric'
};

export const FUEL_TYPE_LABELS = {
  [FUEL_TYPES.GASOLINE]: 'Essence',
  [FUEL_TYPES.DIESEL]: 'Diesel',
  [FUEL_TYPES.HYBRID]: 'Hybride',
  [FUEL_TYPES.ELECTRIC]: 'Électrique'
};

// Types de transmission
export const TRANSMISSION_TYPES = {
  MANUAL: 'manual',
  AUTOMATIC: 'automatic'
};

export const TRANSMISSION_LABELS = {
  [TRANSMISSION_TYPES.MANUAL]: 'Manuelle',
  [TRANSMISSION_TYPES.AUTOMATIC]: 'Automatique'
};