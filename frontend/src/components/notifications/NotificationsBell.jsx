import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaBell } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import {
  getNotificationDetails,
} from "../../hooks/useNotificationsFeed";
import "../../styles/notificationsBell.css";

const MAX_PREVIEW = 5;

function NotificationsBell({ feed }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);
  const buttonRef = useRef(null);

  const urgentNotifications = feed?.urgentNotifications ?? [];
  const unreadNotifications = feed?.unreadNotifications ?? [];
  const notifications = feed?.notifications ?? [];
  const markNotificationAsRead = feed?.markNotificationAsRead;
  const markNotificationsAsRead = feed?.markNotificationsAsRead;
  const loading = feed?.loading;

  const badgeCount = urgentNotifications.length > 0 ? urgentNotifications.length : unreadNotifications.length;
  const badgeVariant = urgentNotifications.length > 0 ? "alert" : unreadNotifications.length > 0 ? "info" : "none";

  const activeSource = useMemo(() => {
    if (urgentNotifications.length > 0) {
      return urgentNotifications;
    }
    if (unreadNotifications.length > 0) {
      return unreadNotifications;
    }
    return notifications;
  }, [urgentNotifications, unreadNotifications, notifications]);

  const previewNotifications = useMemo(() => {
    return activeSource.slice(0, MAX_PREVIEW);
  }, [activeSource]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const handleClickOutside = (event) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleMarkAll = async () => {
    if (!markNotificationsAsRead) {
      return;
    }
    const ids = activeSource
      .filter((notification) => !notification.est_lue)
      .map((notification) => notification.id);
    if (ids.length === 0) {
      return;
    }
    await markNotificationsAsRead(ids);
  };

  const handleMarkSingle = async (id) => {
    if (!markNotificationAsRead) {
      return;
    }
    await markNotificationAsRead(id);
    setIsOpen(false);
  };

  const handleViewAll = () => {
    navigate("/admin/notifications");
    setIsOpen(false);
  };

  const getTypeClass = (notification) => {
    const type = String(notification?.type_notification || notification?.type || '').toLowerCase();
    if (type.includes('urgent') || type.includes('expir') || type.includes('retard')) return 'is-danger';
    if (type.includes('warning') || type.includes('alerte')) return 'is-warning';
    if (type.includes('success') || type.includes('ok')) return 'is-success';
    return 'is-info';
  };

  return (
    <div className="notifications-bell">
      <button
        ref={buttonRef}
        type="button"
        className="notifications-bell__button"
        onClick={handleToggle}
        title={urgentNotifications.length > 0 ? "Notifications urgentes" : "Notifications"}
      >
        <FaBell />  
        {badgeVariant !== "none" && (
          <span className={`notifications-bell__badge notifications-bell__badge--${badgeVariant}`}>
            {badgeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div ref={popoverRef} className="notifications-bell__popover">
          <div className="notifications-bell__header">
            <div>
              <h3>Notifications</h3>
              <p>
                {urgentNotifications.length > 0
                  ? `${urgentNotifications.length} urgente(s)`
                  : `${unreadNotifications.length} non lue(s)`}
              </p>
            </div>
            {previewNotifications.some((notification) => !notification.est_lue) && (
              <div className="notifications-bell__header-actions">
                <button type="button" onClick={handleMarkAll}>Tout marquer comme lu</button>
              </div>
            )}
          </div>

          <div className="notifications-bell__content">
            {loading ? (
              <div className="notifications-bell__empty">Chargement…</div>
            ) : notifications.length === 0 ? (
              <div className="notifications-bell__empty">Aucune notification enregistrée.</div>
            ) : previewNotifications.length === 0 ? (
              <div className="notifications-bell__empty">Toutes les notifications sont lues 🎉</div>
            ) : (
              <ul className="notifications-bell__list">
                {previewNotifications.map((notification) => {
                  const { typeLabel, dueDateLabel } = getNotificationDetails(notification);
                  const message = notification.message || notification.titre || 'Nouvelle notification';
                  return (
                    <li key={notification.id} className="notifications-bell__item">
                      <div className="notifications-bell__item-main">
                        <div className="notifications-bell__item-head">
                          <span className={`notifications-bell__item-type ${getTypeClass(notification)}`}>{typeLabel}</span>
                          <div className="notifications-bell__item-meta">
                            {!notification.est_lue && <span className="notifications-bell__item-dot" />}
                            <span className="notifications-bell__item-date">{dueDateLabel}</span>
                          </div>
                        </div>
                        <p className="notifications-bell__item-message">{message}</p>
                      </div>
                      {!notification.est_lue && (
                        <button
                          type="button"
                          className="notifications-bell__item-action"
                          onClick={() => handleMarkSingle(notification.id)}
                        >
                          Lu
                        </button>
                      )}
                      {notification.est_lue && (
                        <span className="notifications-bell__item-read">Lue</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="notifications-bell__footer">
            <button type="button" onClick={handleViewAll}>
              Voir toutes les notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationsBell;
