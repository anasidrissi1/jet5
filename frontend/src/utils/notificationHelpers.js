const parseApiList = (payload) => {
  if (!payload) {
    return [];
  }
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload.results)) {
    return payload.results;
  }
  if (Array.isArray(payload.items)) {
    return payload.items;
  }
  return [];
};

export const mapNotificationEntities = ({ notifications, cars, clients, reservations }) => {
  if (!notifications?.length) {
    return [];
  }

  const carsById = new Map((cars || []).map((car) => [car.id, car]));
  const clientsById = new Map((clients || []).map((client) => [client.id, client]));
  const reservationsById = new Map((reservations || []).map((reservation) => [reservation.id, reservation]));

  return notifications.map((notification) => {
    let car = notification.voiture_details || null;
    let client = notification.client_details || null;

    if (!car && notification.voiture_id) {
      car = carsById.get(notification.voiture_id) || null;
    }

    if (!client && notification.client_id) {
      client = clientsById.get(notification.client_id) || null;
    }

    if ((!car || !client) && notification.reservation_id) {
      const reservation = reservationsById.get(notification.reservation_id);
      if (reservation) {
        if (!car && reservation.voiture_id) {
          car = carsById.get(reservation.voiture_id) || null;
        }
        if (!client && reservation.client_id) {
          client = clientsById.get(reservation.client_id) || null;
        }
      }
    }

    return {
      ...notification,
      car,
      client,
    };
  });
};

export const getNotificationTypeMeta = (type) => {
  const meta = {
    retour_voiture: { text: 'Retour voiture', color: '#06b6d4', icon: '' },
    visite: { text: 'Visite technique', color: '#f59e0b', icon: '' },
    assurance: { text: 'Assurance', color: '#F5C400', icon: '' },
    autorisation: { text: 'Autorisation', color: '#ec4899', icon: '' },
    paiement: { text: 'Paiement', color: '#10b981', icon: '' },
    entretien: { text: 'Entretien', color: '#D4A900', icon: '' },
    inscription_client: { text: 'Inscription client', color: '#14b8a6', icon: '' },
    reservation_online: { text: 'Reservation online', color: '#B8900A', icon: '' },
  };

  return meta[type] || { text: type || 'Notification', color: '#6b7280', icon: '' };
};

export const buildUrgencyMeta = (notification) => {
  if (!notification) {
    return { level: 'normal', label: "À venir", code: null };
  }

  if (notification.urgence || notification.priorite === 'urgent') {
    return { level: 'urgent', label: 'URGENT', code: 'urgent' };
  }

  if (notification.priorite === 'high') {
    return { level: 'warning', label: 'IMPORTANT', code: 'high' };
  }

  const dueDate = notification.date_retour || notification.date_echeance;
  if (dueDate) {
    const reference = new Date(dueDate);
    const today = new Date();
    const tomorrow = new Date();

    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    reference.setHours(0, 0, 0, 0);

    if (reference.getTime() === today.getTime()) {
      return { level: 'urgent', label: "AUJOURD'HUI", code: 'today' };
    }

    if (reference.getTime() === tomorrow.getTime()) {
      return { level: 'warning', label: 'DEMAIN', code: 'tomorrow' };
    }
  }

  return { level: 'normal', label: "À venir", code: null };
};

export const formatDate = (value) => {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const parseNotificationsPayload = (payloads) => {
  return {
    notifications: parseApiList(payloads.notifications),
    cars: parseApiList(payloads.cars),
    clients: parseApiList(payloads.clients),
    reservations: parseApiList(payloads.reservations),
  };
};
