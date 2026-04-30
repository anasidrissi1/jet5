import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import apiClient from "../api/apiClient";
import { AlertSoundPlayer } from "../utils/alertSound";

const MILLISECONDS_PER_HOUR = 1000 * 60 * 60;

const parseDate = (value) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const isNotificationUrgent = (notification) => {
  if (!notification) {
    return false;
  }
  if (notification.urgence || notification.priorite === "urgent") {
    return true;
  }
  const targetDate = parseDate(notification.date_retour || notification.date_echeance);
  if (!targetDate) {
    return false;
  }
  const now = new Date();
  const diffHours = (targetDate - now) / MILLISECONDS_PER_HOUR;
  return diffHours <= 24;
};

export const useNotificationsFeed = ({ pollIntervalMs = 30000, enableSound = true } = {}) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const soundPlayerRef = useRef(null);
  const pollRef = useRef(null);
  const mountedRef = useRef(false);

  const startSound = useCallback(() => {
    if (!enableSound) {
      return;
    }
    if (!soundPlayerRef.current) {
      soundPlayerRef.current = new AlertSoundPlayer();
    }
    soundPlayerRef.current.start();
  }, [enableSound]);

  const stopSound = useCallback(() => {
    soundPlayerRef.current?.stop();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopSound();
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [stopSound]);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token || token === "undefined" || token === "null" || token.trim() === "") {
        if (mountedRef.current) {
          setNotifications([]);
          setLoading(false);
        }
        return;
      }

      const response = await apiClient.get("/notifications/");
      const payload = response.data;
      const list = Array.isArray(payload) ? payload : payload?.results ?? payload?.items ?? [];

      if (mountedRef.current) {
        setNotifications(list);
        setError(null);
        setLoading(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchNotifications();
    if (pollIntervalMs) {
      pollRef.current = setInterval(() => {
        fetchNotifications();
      }, pollIntervalMs);
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [fetchNotifications, pollIntervalMs]);

  const urgentNotifications = useMemo(() => {
    return notifications.filter(
      (notification) => !notification.est_lue && isNotificationUrgent(notification)
    );
  }, [notifications]);

  const unreadNotifications = useMemo(() => {
    return notifications.filter((notification) => !notification.est_lue);
  }, [notifications]);

  useEffect(() => {
    if (!enableSound) {
      return;
    }
    if (urgentNotifications.length > 0) {
      startSound();
    } else {
      stopSound();
    }
  }, [enableSound, startSound, stopSound, urgentNotifications.length]);

  const markNotificationsAsRead = useCallback(
    async (ids) => {
      if (!ids || ids.length === 0) {
        return;
      }
      try {
        await Promise.all(
          ids.map((id) =>
            apiClient.patch(`/notifications/${id}/`, {
              est_lue: true,
            })
          )
        );
        fetchNotifications();
      } catch (err) {
        console.error("Erreur marquage notifications:", err);
      }
    },
    [fetchNotifications]
  );

  const markNotificationAsRead = useCallback(
    async (id) => {
      if (!id) {
        return;
      }
      await markNotificationsAsRead([id]);
    },
    [markNotificationsAsRead]
  );

  const refresh = useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    urgentNotifications,
    unreadNotifications,
    loading,
    error,
    refresh,
    markNotificationAsRead,
    markNotificationsAsRead,
  };
};

export const getNotificationDetails = (notification) => {
  if (!notification) {
    return {
      dueDate: null,
      dueDateLabel: "-",
      typeLabel: "Notification",
    };
  }

  const dueDateValue = notification.date_retour || notification.date_echeance || notification.date_creation || notification.created_at;
  const dueDate = parseDate(dueDateValue);

  const typeLabels = {
    retour_voiture: "Retour de voiture",
    visite: "Visite technique",
    assurance: "Assurance",
    autorisation: "Autorisation",
    paiement: "Paiement",
    entretien: "Entretien",
    inscription_client: "Inscription client",
    reservation_online: "Reservation online",
  };

  const typeLabel = typeLabels[notification.type] || notification.type || "Notification";

  return {
    dueDate,
    dueDateLabel: dueDate ? dueDate.toLocaleDateString("fr-FR") : "-",
    typeLabel,
  };
};

export const highlightNotificationMessage = (message) => {
  if (!message) {
    return "";
  }
  return message;
};
