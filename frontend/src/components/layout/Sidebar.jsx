import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import logo from "../../assets/jet5logo.png";
import "../../styles/sidebar.css";
import apiClient from "../../api/apiClient";

const getOpenSectionsFromPath = (pathname) => ({
  clients: pathname.startsWith('/admin/clients'),
  vehicles:
    pathname.startsWith('/admin/cars') ||
    pathname.startsWith('/admin/entretiens') ||
    pathname.startsWith('/admin/assurances') ||
    pathname.startsWith('/admin/autorisations') ||
    pathname.startsWith('/admin/visites-techniques'),
  locations:
    pathname.startsWith('/admin/reservations') ||
    pathname.startsWith('/admin/contact-messages'),
  finances:
    pathname.startsWith('/admin/payments') ||
    pathname.startsWith('/admin/rentabilite')
});

function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const { logout } = useAuth();
  const [openSections, setOpenSections] = useState(() => getOpenSectionsFromPath(location.pathname));

  const [onlineReservationsCount, setOnlineReservationsCount] = useState(0);
  const [unreadContactsCount, setUnreadContactsCount] = useState(0);

  const parseISODate = (value) => {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const parseOnlineStatusMarker = (comment) => {
    const ONLINE_STATUS_REGEX = /\[ONLINE_STATUS:(new|contacted|confirmed|refused)\]/;
    const match = String(comment || '').match(ONLINE_STATUS_REGEX);
    return match ? match[1] : null;
  };

  const getOnlineStatusKey = (reservation) => {
    const markerStatus = parseOnlineStatusMarker(reservation.commentaire);
    const startDate = parseISODate(reservation.date_debut);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (reservation.statut === 'annule' || markerStatus === 'refused') return 'refused';
    if (markerStatus === 'confirmed' || reservation.numero_contrat || ['en_cours', 'termine'].includes(reservation.statut)) return 'confirmed';
    if (startDate && startDate < today) return 'expired';
    if (markerStatus === 'contacted') return 'contacted';
    return 'new';
  };

  const fetchSidebarCounts = async () => {
    try {
      const [reservationsRes, contactsRes] = await Promise.all([
        apiClient.get("/reservations/", { params: { origin: "en_ligne" } }),
        apiClient.get("/dashboard/contact/messages/", { params: { is_read: false } }),
      ]);

      const reservationsData = reservationsRes.data;
      const rList = Array.isArray(reservationsData)
        ? reservationsData
        : reservationsData?.results ?? [];
      const pendingOnline = rList.filter((r) => getOnlineStatusKey(r) === 'new').length;
      setOnlineReservationsCount(pendingOnline || 0);

      const contactsData = contactsRes.data;
      const cList = Array.isArray(contactsData)
        ? contactsData
        : contactsData?.results ?? [];
      setUnreadContactsCount(cList.filter((m) => !m.is_read).length || 0);
    } catch (e) {
      // échec silencieux dans le menu
    }
  };

  useEffect(() => {
    fetchSidebarCounts();
    const interval = setInterval(fetchSidebarCounts, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = () => {
      fetchSidebarCounts();
    };
    window.addEventListener('jet5:refreshSidebarCounts', handler);
    return () => window.removeEventListener('jet5:refreshSidebarCounts', handler);
  }, []);

  useEffect(() => {
    setOpenSections((prev) => ({
      ...prev,
      ...getOpenSectionsFromPath(location.pathname),
    }));
  }, [location.pathname]);

  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleLogout = () => {
    if (onClose) {
      onClose();
    }
    logout();
  };

  return (
    <aside className={`sidebar-professional ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <img src={logo} alt="JET5" className="sidebar-logo" />
      </div>
      
      <nav className="sidebar-nav">
        {/* Dashboard */}
        <div className="nav-section">
          <Link to="/admin/dashboard" className={`nav-item single ${isActive('/admin/dashboard') ? 'active' : ''}`} onClick={handleLinkClick}>
            <span className="nav-label">DASHBOARD</span>
          </Link>
        </div>

        {/* Clients */}
        <div className="nav-section">
          <button
            type="button"
            className={`nav-item parent ${openSections.clients ? 'open' : ''}`}
            onClick={() => toggleSection('clients')}
            aria-expanded={openSections.clients}
            aria-controls="sidebar-section-clients"
          >
            <span className="nav-label">CLIENTS</span>
            <span className="nav-arrow">{openSections.clients ? '▲' : '▼'}</span>
          </button>
          {openSections.clients && (
            <div className="nav-submenu" id="sidebar-section-clients">
              <Link to="/admin/clients" className={`nav-subitem ${isActive('/admin/clients') ? 'active' : ''}`} onClick={handleLinkClick}>
                <span className="subitem-label">Liste des Clients</span>
              </Link>
            </div>
          )}
        </div>

        {/* Parc Automobile */}
        <div className="nav-section">
          <button
            type="button"
            className={`nav-item parent ${openSections.vehicles ? 'open' : ''}`}
            onClick={() => toggleSection('vehicles')}
            aria-expanded={openSections.vehicles}
            aria-controls="sidebar-section-vehicles"
          >
            <span className="nav-label">PARC AUTOMOBILE</span>
            <span className="nav-arrow">{openSections.vehicles ? '▲' : '▼'}</span>
          </button>
          {openSections.vehicles && (
            <div className="nav-submenu" id="sidebar-section-vehicles">
              <Link to="/admin/cars" className={`nav-subitem ${isActive('/admin/cars') ? 'active' : ''}`} onClick={handleLinkClick}>
                <span className="subitem-label">Liste des Voitures</span>
              </Link>
              <Link to="/admin/entretiens" className={`nav-subitem ${isActive('/admin/entretiens') ? 'active' : ''}`} onClick={handleLinkClick}>
                <span className="subitem-label">Entretiens</span>
              </Link>
              <Link to="/admin/assurances" className={`nav-subitem ${isActive('/admin/assurances') ? 'active' : ''}`} onClick={handleLinkClick}>
                <span className="subitem-label">Assurances</span>
              </Link>
              <Link to="/admin/autorisations" className={`nav-subitem ${isActive('/admin/autorisations') ? 'active' : ''}`} onClick={handleLinkClick}>
                <span className="subitem-label">Autorisations</span>
              </Link>
              <Link to="/admin/visites-techniques" className={`nav-subitem ${isActive('/admin/visites-techniques') ? 'active' : ''}`} onClick={handleLinkClick}>
                <span className="subitem-label">Visites Techniques</span>
              </Link>
            </div>
          )}
        </div>

        {/* Locations */}
        <div className="nav-section">
          <button
            type="button"
            className={`nav-item parent ${openSections.locations ? 'open' : ''}`}
            onClick={() => toggleSection('locations')}
            aria-expanded={openSections.locations}
            aria-controls="sidebar-section-locations"
          >
            <span className="nav-label">LOCATIONS</span>
            <span className="nav-arrow">{openSections.locations ? '▲' : '▼'}</span>
          </button>
          {openSections.locations && (
            <div className="nav-submenu" id="sidebar-section-locations">
              <Link to="/admin/reservations" className={`nav-subitem ${isActive('/admin/reservations') ? 'active' : ''}`} onClick={handleLinkClick}>
                <span className="subitem-label">Réservations Actives</span>
              </Link>
              <Link to="/admin/reservations/online" className={`nav-subitem ${isActive('/admin/reservations/online') ? 'active' : ''}`} onClick={handleLinkClick}>
                <span className="subitem-label">Réservations en ligne</span>
                {onlineReservationsCount > 0 && (
                  <span className="nav-badge">{onlineReservationsCount}</span>
                )}
              </Link>
              <Link to="/admin/contact-messages" className={`nav-subitem ${isActive('/admin/contact-messages') ? 'active' : ''}`} onClick={handleLinkClick}>
                <span className="subitem-label">Contact</span>
                {unreadContactsCount > 0 && (
                  <span className="nav-badge">{unreadContactsCount}</span>
                )}
              </Link>
            </div>
          )}
        </div>

        {/* Finances */}
        <div className="nav-section">
          <button
            type="button"
            className={`nav-item parent ${openSections.finances ? 'open' : ''}`}
            onClick={() => toggleSection('finances')}
            aria-expanded={openSections.finances}
            aria-controls="sidebar-section-finances"
          >
            <span className="nav-label">FINANCES</span>
            <span className="nav-arrow">{openSections.finances ? '▲' : '▼'}</span>
          </button>
          {openSections.finances && (
            <div className="nav-submenu" id="sidebar-section-finances">
              <Link to="/admin/payments" className={`nav-subitem ${isActive('/admin/payments') ? 'active' : ''}`} onClick={handleLinkClick}>
                <span className="subitem-label">Paiements</span>
              </Link>
              <Link to="/admin/rentabilite" className={`nav-subitem ${isActive('/admin/rentabilite') ? 'active' : ''}`} onClick={handleLinkClick}>
                <span className="subitem-label">Rentabilité</span>
              </Link>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="nav-section">
          <Link to="/admin/notifications" className={`nav-item single ${isActive('/admin/notifications') ? 'active' : ''}`} onClick={handleLinkClick}>
            <span className="nav-label">NOTIFICATIONS</span>
          </Link>
        </div>
      </nav>

      {/* Logout Button */}
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
