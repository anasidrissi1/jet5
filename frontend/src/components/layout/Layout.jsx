import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import AlertNotification from '../AlertNotification';
import SearchModal from '../SearchModal';
import { useNotificationsFeed } from '../../hooks/useNotificationsFeed';
import { useNotification } from '../../contexts/NotificationContext';
import '../../styles/layout.css';

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const notificationsFeed = useNotificationsFeed();
  const { addNotification } = useNotification();
  const seenNotificationIdsRef = useRef(new Set());
  const notificationsReadyRef = useRef(false);

  useEffect(() => {
    const syncViewport = () => {
      const isNowMobile = window.matchMedia('(max-width: 1024px)').matches;
      setIsMobile(isNowMobile);
      setSidebarOpen(isNowMobile ? false : true);
    };
    syncViewport();
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, sidebarOpen]);

  useEffect(() => {
    if (notificationsFeed.loading) {
      return;
    }

    const currentNotifications = notificationsFeed.notifications || [];

    if (!notificationsReadyRef.current) {
      seenNotificationIdsRef.current = new Set(currentNotifications.map((notification) => notification.id));
      notificationsReadyRef.current = true;
      return;
    }

    const seenIds = seenNotificationIdsRef.current;
    const newOnlineReservations = currentNotifications.filter(
      (notification) => !seenIds.has(notification.id) && notification.type === 'reservation_online' && !notification.est_lue
    );

    currentNotifications.forEach((notification) => {
      seenIds.add(notification.id);
    });

    newOnlineReservations.forEach((notification) => {
      addNotification(notification.message, 'warning', {
        duration: 9000,
        soundVariant: 'online_reservation',
      });
    });
  }, [addNotification, notificationsFeed.loading, notificationsFeed.notifications]);

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const sidebarShouldBeOpen = sidebarOpen;
  const showOverlay = isMobile && sidebarOpen;

  return (
    <div className={`app-layout ${isMobile ? 'is-mobile' : 'is-desktop'}`}>
      {showOverlay && (
        <div
          className="sidebar-overlay active"
          onClick={handleSidebarClose}
          aria-label="Fermer le menu"
        />
      )}
      
      {/* Alertes urgentes en haut de l'écran */}
      <AlertNotification feed={notificationsFeed} />
      
      {/* Modal de recherche globale */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      
      <Sidebar
        isOpen={sidebarShouldBeOpen}
        onClose={handleSidebarClose}
      />
      <div className={`main-content ${sidebarShouldBeOpen ? 'with-sidebar' : ''}`}>
        <Header
          onMenuClick={handleSidebarToggle}
          onSearchClick={() => setSearchOpen(true)}
          notificationsFeed={notificationsFeed}
        />
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default Layout;
