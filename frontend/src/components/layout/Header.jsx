import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import NotificationsBell from "../notifications/NotificationsBell";
import apiClient from "../../api/apiClient";
import { AlertSoundPlayer } from "../../utils/alertSound";
import "../../styles/header.css";

function Header({ onSearchClick, notificationsFeed, onMenuClick }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [returnsToday, setReturnsToday] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const soundRef = useRef(null);

  useEffect(() => {
    const matcher = window.matchMedia("(max-width: 768px)");
    const updateViewport = () => setIsMobile(matcher.matches);
    updateViewport();
    matcher.addEventListener("change", updateViewport);
    return () => matcher.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    let timer;
    const fetchReturns = async () => {
      try {
        const response = await apiClient.get('/dashboard/retours-aujourdhui/');
        const list = response.data?.retours ?? [];
        setReturnsToday(Array.isArray(list) ? list : []);
      } catch {
        // Silent fail: banner simply not shown
      }
    };

    fetchReturns();
    timer = setInterval(fetchReturns, 60000);

    const handleRefreshReturns = () => fetchReturns();
    window.addEventListener('jet5:refreshReturns', handleRefreshReturns);

    return () => {
      if (timer) {
        clearInterval(timer);
      }
      window.removeEventListener('jet5:refreshReturns', handleRefreshReturns);
      soundRef.current?.stop();
    };
  }, []);

  const urgentNotifications = notificationsFeed?.urgentNotifications ?? [];
  const shouldPlaySound = urgentNotifications.length > 0 || returnsToday.length > 0;

  useEffect(() => {
    if (!soundRef.current) {
      soundRef.current = new AlertSoundPlayer();
    }
    if (shouldPlaySound) {
      soundRef.current.start();
    } else {
      soundRef.current.stop();
    }

    return () => {
      soundRef.current?.stop();
    };
  }, [shouldPlaySound]);

  const renderSearchTrigger = ({ withShortcut = true, className = 'header-search' } = {}) => (
    <div className={className} onClick={onSearchClick}>
      <span className="search-placeholder">Rechercher une voiture, un client...</span>
      {withShortcut && (
        <span className="search-shortcut">
          <kbd>Ctrl</kbd>
          <span>+</span>
          <kbd>K</kbd>
        </span>
      )}
    </div>
  );

  const quickActions = (
    <div className="header-quick-actions">
      <NotificationsBell feed={notificationsFeed} />
      {user && (
        <button
          className={`logout-button ${isMobile ? 'logout-icon' : ''}`}
          onClick={logout}
          aria-label="Déconnexion"
        >
          {isMobile ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          ) : (
            'Déconnexion'
          )}
        </button>
      )}
    </div>
  );

  return (
    <header className="header">
      <div className="header-row">
        <div className="header-left">
          <button className="menu-toggle" onClick={onMenuClick} aria-label="Basculer le menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <div className="header-title-block">
            {isMobile && quickActions}
            <div className="header-title">
              <h1>Jet5 Admin</h1>
              <p className="header-subtitle">Suivi & opérations quotidiennes</p>
            </div>
          </div>
        </div>

        {!isMobile && (
          <div className="header-actions">
            {renderSearchTrigger()}
            {quickActions}
          </div>
        )}
      </div>

      {isMobile && (
        renderSearchTrigger({ withShortcut: false, className: 'header-search header-search--mobile' })
      )}

      {returnsToday.length > 0 && (
        <div className="returns-banner">
          <div className="returns-banner__top">
            <div className="returns-banner__title">
              <span className="returns-banner__dot" aria-hidden="true" />
              <div>
                <div className="returns-banner__count">{returnsToday.length} retour(s) prévu(s) aujourd'hui</div>
                <div className="returns-banner__subtitle">Voitures à récupérer ou prolonger</div>
              </div>
            </div>
            <button type="button" className="returns-banner__cta" onClick={() => navigate('/admin/reservations')}>
              Voir les retours
            </button>
          </div>

          <div className="returns-banner__list">
            {returnsToday.map((reservation) => (
              <div key={reservation.id} className="returns-banner__item">
                <div className="returns-banner__info">
                  <div className="returns-banner__car">
                    {reservation.voiture_display || reservation.voiture || 'Véhicule'}
                    {reservation.voiture_immatriculation ? ` - ${reservation.voiture_immatriculation}` : ''}
                  </div>
                  <div className="returns-banner__client">
                    👤 {reservation.client_nom || 'Client'} • 📞 {reservation.client_telephone || 'N/A'}
                  </div>
                </div>
                <div className="returns-banner__actions">
                  <button
                    type="button"
                    className="returns-banner__btn returns-banner__btn--green"
                    onClick={() => navigate(`/admin/reservations/edit/${reservation.id}`, { state: { focusRetour: true } })}
                  >
                    Récupérer
                  </button>
                  <button
                    type="button"
                    className="returns-banner__btn returns-banner__btn--blue"
                    onClick={() => navigate('/admin/reservations', { state: { headerAction: 'openPA', reservationId: reservation.id } })}
                  >
                    Prolonger
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
