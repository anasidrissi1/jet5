import React, { useState, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import '../styles/notification.css';

const Notification = ({ 
  id,
  message, 
  type = 'info', // 'info', 'success', 'warning', 'error'
  duration
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const { removeNotification } = useNotification();
  const effectiveDuration = typeof duration === 'number'
    ? (Number.isFinite(duration) ? duration : null)
    : (duration === null ? null : 5000);

  useEffect(() => {
    if (effectiveDuration && isVisible) {
      const timer = setTimeout(() => {
        handleClose();
      }, effectiveDuration);

      return () => clearTimeout(timer);
    }
  }, [effectiveDuration, isVisible]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      if (id) {
        removeNotification(id);
      }
    }, 300); // Match animation duration
  };

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill="currentColor"/>
          </svg>
        );
      case 'error':
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" fill="currentColor"/>
          </svg>
        );
      case 'warning':
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 4a1 1 0 011 1v4a1 1 0 11-2 0V7a1 1 0 011-1zm0 10a1 1 0 110-2 1 1 0 010 2z" fill="currentColor"/>
          </svg>
        );
      default:
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11a1 1 0 11-2 0V9a1 1 0 112 0v4zm-1-6a1 1 0 110-2 1 1 0 010 2z" fill="currentColor"/>
          </svg>
        );
    }
  };

  return (
    <div className={`notification notification-${type} ${isExiting ? 'notification-exit' : ''}`}>
      <div className="notification-icon">
        {getIcon()}
      </div>
      <div className="notification-message">{message}</div>
      <button className="notification-close" onClick={handleClose} aria-label="Fermer">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M12.707 3.293a1 1 0 00-1.414 0L8 6.586 4.707 3.293a1 1 0 00-1.414 1.414L6.586 8l-3.293 3.293a1 1 0 101.414 1.414L8 9.414l3.293 3.293a1 1 0 001.414-1.414L9.414 8l3.293-3.293a1 1 0 000-1.414z" fill="currentColor"/>
        </svg>
      </button>
    </div>
  );
};

export default Notification;
