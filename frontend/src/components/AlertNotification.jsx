import React from 'react';
import { getNotificationDetails } from '../hooks/useNotificationsFeed';
import '../styles/alertnotification.css';

function AlertNotification({ feed }) {
  const urgentNotifications = feed?.urgentNotifications ?? [];
  const markNotificationAsRead = feed?.markNotificationAsRead;
  const markNotificationsAsRead = feed?.markNotificationsAsRead;

  if (urgentNotifications.length === 0) {
    return null;
  }

  const handleDismiss = async (notificationId) => {
    if (!markNotificationAsRead) {
      return;
    }
    await markNotificationAsRead(notificationId);
  };

  const handleDismissAll = async () => {
    if (!markNotificationsAsRead) {
      return;
    }
    const ids = urgentNotifications.map((notification) => notification.id);
    await markNotificationsAsRead(ids);
  };

  return (
    <div className="alert-notification-container">
      <div className="alert-notification-header">
        <div className="alert-notification-title">
          <span className="alert-icon">🚨</span>
          <strong>Alertes urgentes ({urgentNotifications.length})</strong>
        </div>
        <button 
          className="alert-dismiss-all" 
          onClick={handleDismissAll}
          title="Fermer toutes les alertes"
        >
          Tout fermer
        </button>
      </div>
      
      <div className="alert-notification-list">
        {urgentNotifications.map(notification => {
          const { typeLabel, dueDateLabel } = getNotificationDetails(notification);
          return (
            <div key={notification.id} className="alert-notification-item">
              <div className="alert-notification-content">
                <div className="alert-notification-type">
                  {typeLabel}
                </div>
                <div className="alert-notification-message">
                  {notification.message}
                </div>
                {dueDateLabel && dueDateLabel !== '-' && (
                  <div className="alert-notification-date">
                    📅 {dueDateLabel}
                  </div>
                )}
              </div>
              <button
                className="alert-notification-close"
                onClick={() => handleDismiss(notification.id)}
                title="Fermer cette alerte"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AlertNotification;
