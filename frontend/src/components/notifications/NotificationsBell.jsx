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

  const unreadCount = unreadNotifications.length;
  const badgeCount = urgentNotifications.length > 0 ? urgentNotifications.length : unreadCount;
  const badgeVariant = urgentNotifications.length > 0 ? "alert" : unreadCount > 0 ? "info" : "none";

  const previewNotifications = useMemo(() => {
    return notifications.slice(0, MAX_PREVIEW);
  }, [notifications]);

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

  const handleNotificationClick = async (notification) => {
    if (!markNotificationAsRead) {
      return;
    }
    if (!notification?.est_lue) {
      await markNotificationAsRead(notification.id);
    }
  };

  const handleViewAll = () => {
    navigate("/admin/notifications");
    setIsOpen(false);
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
            <div className="notifications-bell__header-main">
              <h3>Notifications</h3>
              <p>{unreadCount} non lue(s)</p>
            </div>
            <span className="notifications-bell__unread-pill">{unreadCount}</span>
          </div>

          <div className="notifications-bell__content">
            {loading ? (
              <div className="notifications-bell__empty">Chargement…</div>
            ) : notifications.length === 0 ? (
              <div className="notifications-bell__empty">Aucune notification enregistrée.</div>
            ) : (
              <ul className="notifications-bell__list">
                {previewNotifications.map((notification) => {
                  const { dueDateLabel } = getNotificationDetails(notification);
                  const message = notification.message || notification.titre || 'Nouvelle notification';
                  return (
                    <li key={notification.id} className="notifications-bell__item">
                      <button
                        type="button"
                        className="notifications-bell__item-button"
                        onClick={() => handleNotificationClick(notification)}
                        title={message}
                      >
                        <span className={`notifications-bell__item-dot ${notification.est_lue ? "is-read" : "is-unread"}`} />
                        <span className="notifications-bell__item-main">
                          <span className="notifications-bell__item-message">{message}</span>
                          <span className="notifications-bell__item-date">{dueDateLabel}</span>
                        </span>
                      </button>
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
