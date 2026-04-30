import { useCallback, useEffect, useMemo, useState } from "react";
import apiClient from "../../../api/apiClient";
import {
  buildUrgencyMeta,
  formatDate,
  getNotificationTypeMeta,
  mapNotificationEntities,
  parseNotificationsPayload,
} from "../../../utils/notificationHelpers";

const TYPE_KEYS = [
  "retour_voiture",
  "visite",
  "assurance",
  "autorisation",
  "paiement",
  "entretien",
  "reservation_online",
];

const buildStats = (items) => {
  const baseByType = TYPE_KEYS.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});

  baseByType.autres = 0;

  const summary = {
    total: items.length,
    urgent: 0,
    warning: 0,
    normal: 0,
    unread: 0,
    byType: baseByType,
    lastUpdated: new Date().toISOString(),
  };

  items.forEach((notification) => {
    if (!notification.est_lue) {
      summary.unread += 1;
    }

    if (notification.urgencyMeta.level === "urgent") {
      summary.urgent += 1;
    } else if (notification.urgencyMeta.level === "warning") {
      summary.warning += 1;
    } else {
      summary.normal += 1;
    }

    const typeKey = TYPE_KEYS.includes(notification.type) ? notification.type : "autres";
    summary.byType[typeKey] = (summary.byType[typeKey] || 0) + 1;
  });

  return summary;
};

const enrichNotifications = (notifications, cars, clients, reservations) => {
  if (!notifications.length) {
    return [];
  }

  const mapped = mapNotificationEntities({
    notifications,
    cars,
    clients,
    reservations,
  });

  return mapped
    .map((notification) => {
      const typeMeta = getNotificationTypeMeta(notification.type);
      const urgencyMeta = buildUrgencyMeta(notification);
      const dueDateValue = notification.date_retour || notification.date_echeance || null;
      const createdAtValue = notification.date_creation || notification.created_at || notification.updated_at || null;

      return {
        ...notification,
        typeMeta,
        urgencyMeta,
        dueDateValue,
        dueDateLabel: formatDate(dueDateValue),
        createdAtLabel: formatDate(createdAtValue),
      };
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at || a.dueDateValue || 0).getTime();
      const dateB = new Date(b.created_at || b.dueDateValue || 0).getTime();
      return dateB - dateA;
    });
};

// Récupère toutes les pages d'un endpoint paginé DRF
const fetchAllPages = async (endpoint) => {
  const results = [];
  let url = endpoint;

  while (url) {
    const res = await apiClient.get(url);
    const data = res.data;

    if (Array.isArray(data)) {
      // Pas de pagination (liste brute)
      results.push(...data);
      break;
    }

    const pageResults = Array.isArray(data?.results) ? data.results : [];
    results.push(...pageResults);

    // Supporte pagination DRF classique avec 'next'
    url = data?.next ? data.next : null;
  }

  return results;
};

const useNotificationsData = () => {
  const [notifications, setNotifications] = useState([]);
  const [cars, setCars] = useState([]);
  const [clients, setClients] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [notificationsData, carsData, clientsData, reservationsData] = await Promise.all([
        fetchAllPages("/notifications/"),
        fetchAllPages("/cars/voitures/"),
        fetchAllPages("/clients/"),
        fetchAllPages("/reservations/"),
      ]);

      const payload = parseNotificationsPayload({
        notifications: notificationsData,
        cars: carsData,
        clients: clientsData,
        reservations: reservationsData,
      });

      setNotifications(payload.notifications || []);
      setCars(payload.cars || []);
      setClients(payload.clients || []);
      setReservations(payload.reservations || []);
    } catch (err) {
      const message = err?.response?.data?.detail || err?.message || "Erreur lors du chargement des notifications";
      console.error("Erreur chargement notifications:", err);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData().catch(() => undefined);
  }, [fetchData]);

  const enrichedNotifications = useMemo(
    () => enrichNotifications(notifications, cars, clients, reservations),
    [notifications, cars, clients, reservations]
  );

  const stats = useMemo(() => buildStats(enrichedNotifications), [enrichedNotifications]);

  return {
    notifications: enrichedNotifications,
    stats,
    loading,
    error,
    refresh: fetchData,
  };
};

export default useNotificationsData;
