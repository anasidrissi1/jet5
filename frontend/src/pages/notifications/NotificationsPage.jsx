import React, { useEffect, useMemo, useState } from "react";
import { useNotification } from "../../contexts/NotificationContext";
import Loader from "../../components/Loader";
import apiClient from "../../api/apiClient";
import useNotificationsData from "./hooks/useNotificationsData";
import NotificationsHeader from "./components/NotificationsHeader";
import NotificationsSummary from "./components/NotificationsSummary";
import NotificationsFilters from "./components/NotificationsFilters";
import NotificationsTable from "./components/NotificationsTable";
import "../../styles/pages.css";
import "../../styles/cars.css";
import "../../styles/autorisations.css";
import "./styles.css";

const DEFAULT_STATS = {
  total: 0,
  urgent: 0,
  warning: 0,
  normal: 0,
  unread: 0,
  byType: {
    retour_voiture: 0,
    visite: 0,
    assurance: 0,
    autorisation: 0,
    paiement: 0,
    entretien: 0,
    reservation_online: 0,
    autres: 0,
  },
};

const NotificationsPage = () => {
  const { notifications, stats = DEFAULT_STATS, loading, error, refresh } = useNotificationsData();
  const { addNotification } = useNotification();

  const [searchValue, setSearchValue] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const searchNormalized = searchValue.trim().toLowerCase();

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      if (urgencyFilter === "urgent" && notification.urgencyMeta.level !== "urgent") {
        return false;
      }
      if (urgencyFilter === "warning" && notification.urgencyMeta.level !== "warning") {
        return false;
      }
      if (urgencyFilter === "normal" && notification.urgencyMeta.level !== "normal") {
        return false;
      }
      if (urgencyFilter === "unread" && notification.est_lue) {
        return false;
      }
      if (typeFilter !== "all" && notification.type !== typeFilter) {
        return false;
      }

      if (!searchNormalized) {
        return true;
      }

      const searchPool = [
        notification.message,
        notification.typeMeta?.text,
        notification.car?.immatriculation,
        notification.car?.marque,
        notification.car?.modele,
        notification.client ? `${notification.client.nom} ${notification.client.prenom}` : notification.client_nom,
        notification.client?.telephone,
        notification.client?.email,
        notification.createdAtLabel,
      ];

      return searchPool
        .filter(Boolean)
        .some((value) => value.toString().toLowerCase().includes(searchNormalized));
    });
  }, [notifications, urgencyFilter, typeFilter, searchNormalized]);

  useEffect(() => {
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
      }
    };
  }, []);

  const urgencyOptions = useMemo(
    () => [
      { key: "all", label: "Tous les statuts", count: stats.total },
      { key: "urgent", label: "Urgentes", count: stats.urgent },
      { key: "warning", label: "Importantes", count: stats.warning },
      { key: "normal", label: "Planifiées", count: stats.normal },
      { key: "unread", label: "Non lues", count: stats.unread },
    ],
    [stats]
  );

  const typeOptions = useMemo(() => {
    const byType = stats.byType || {};
    return [
      { key: "all", label: "Tous les types", count: stats.total },
      { key: "retour_voiture", label: "Retours", count: byType.retour_voiture || 0 },
      { key: "visite", label: "Visites", count: byType.visite || 0 },
      { key: "assurance", label: "Assurances", count: byType.assurance || 0 },
      { key: "autorisation", label: "Autorisations", count: byType.autorisation || 0 },
      { key: "paiement", label: "Paiements", count: byType.paiement || 0 },
      { key: "entretien", label: "Entretiens", count: byType.entretien || 0 },
      { key: "reservation_online", label: "Reservations online", count: byType.reservation_online || 0 },
      { key: "autres", label: "Autres", count: byType.autres || 0 },
    ];
  }, [stats]);

  const handleRefresh = async () => {
    setIsProcessing(true);
    try {
      await refresh();
      addNotification("Liste des notifications actualisée", "success");
    } catch (err) {
      const message = err?.response?.data?.detail || err?.message || "Erreur lors de l'actualisation";
      addNotification(message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerate = async () => {
    if (!window.confirm("Générer les notifications automatiques ?")) {
      return;
    }

    setIsProcessing(true);
    try {
      await apiClient.post("/notifications/generer/");
      await refresh();
      addNotification("Notifications générées avec succès", "success");
    } catch (err) {
      const message = err?.response?.data?.detail || err?.message || "Erreur lors de la génération";
      addNotification(message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    setIsProcessing(true);
    try {
      await apiClient.patch(`/notifications/${id}/`, { est_lue: true });
      await refresh();
      addNotification("Notification marquée comme lue", "success");
    } catch (err) {
      const message = err?.response?.data?.detail || err?.message || "Erreur lors de la mise à jour";
      addNotification(message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const openDeleteModal = (notification) => {
    setPendingDelete(notification);
    if (typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
    }
  };

  const closeDeleteModal = () => {
    if (isProcessing) {
      return;
    }
    setPendingDelete(null);
    if (typeof document !== "undefined") {
      document.body.style.overflow = "";
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    setIsProcessing(true);
    try {
      await apiClient.delete(`/notifications/${pendingDelete.id}/`);
      await refresh();
      addNotification("Notification supprimée", "success");
    } catch (err) {
      const message = err?.response?.data?.detail || err?.message || "Erreur lors de la suppression";
      addNotification(message, "error");
    } finally {
      setIsProcessing(false);
      setPendingDelete(null);
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
      }
    }
  };

  if (loading) {
    return (
      <div className="cars-page">
        <Loader />
      </div>
    );
  }

  return (
    <div className="cars-page notifications-pro-page">
      <NotificationsHeader
        stats={stats}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        urgencyFilter={urgencyFilter}
        onUrgencyChange={setUrgencyFilter}
        onGenerate={handleGenerate}
        onRefresh={handleRefresh}
        isBusy={isProcessing}
      />

      <NotificationsSummary stats={stats} />

      <NotificationsFilters
        urgencyOptions={urgencyOptions}
        selectedUrgency={urgencyFilter}
        onUrgencyChange={setUrgencyFilter}
        typeOptions={typeOptions}
        selectedType={typeFilter}
        onTypeChange={setTypeFilter}
        disabled={isProcessing}
      />

      <div className="cars-body">
        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button type="button" className="btn btn-primary" onClick={handleRefresh}>
              Réessayer
            </button>
          </div>
        )}

        <NotificationsTable
          items={filteredNotifications}
          totalItems={filteredNotifications.length}
          onMarkAsRead={handleMarkAsRead}
          onDelete={openDeleteModal}
          isBusy={isProcessing}
        />

        {pendingDelete && (
          <div
            className="assurance-modal-overlay"
            role="alertdialog"
            aria-modal="true"
            onClick={closeDeleteModal}
          >
            <div
              className="assurance-confirm-card"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="assurance-confirm-icon">🔔</div>
              <h3 className="assurance-confirm-title">Supprimer cette notification ?</h3>
              <p className="assurance-confirm-text">
                Cette action supprimera définitivement la notification
                {pendingDelete.typeMeta?.text ? (
                  <> <strong>{pendingDelete.typeMeta.text}</strong></>
                ) : null}
                {pendingDelete.car?.immatriculation ? (
                  <> liée au véhicule <strong>{pendingDelete.car.immatriculation}</strong></>
                ) : null}
                {pendingDelete.dueDateLabel ? (
                  <> (échéance {pendingDelete.dueDateLabel})</>
                ) : null}
                . Cette opération est irréversible.
              </p>
              {(pendingDelete.client || pendingDelete.client_nom) && (
                <div className="assurance-confirm-text" style={{ opacity: 0.8 }}>
                  Client concerné : {
                    pendingDelete.client
                      ? `${pendingDelete.client.nom || ""} ${pendingDelete.client.prenom || ""}`.trim() ||
                        pendingDelete.client.email || pendingDelete.client.telephone || "-"
                      : pendingDelete.client_nom || pendingDelete.client_telephone || "-"
                  }
                </div>
              )}
              {pendingDelete.message && (
                <div className="assurance-confirm-text" style={{ opacity: 0.75 }}>
                  Message : <em>{pendingDelete.message}</em>
                </div>
              )}
              <div className="assurance-confirm-actions">
                <button
                  type="button"
                  className="assurance-confirm-btn cancel"
                  onClick={closeDeleteModal}
                  disabled={isProcessing}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="assurance-confirm-btn danger"
                  onClick={confirmDelete}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Suppression..." : "Supprimer"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
