import React, { useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import "../../styles/public-topbar.css";
import logo from "../../assets/jet5logo.png";

function PublicTopbar() {
  const { isDarkMode, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const links = [
    { to: "/", label: "Accueil" },
    { to: "/cars", label: "Véhicules" },
    { to: "/#services", label: "Services", mobileLabel: "Service" },
    { to: "/contact", label: "Contact" },
  ];

  // Close mobile menu on navigation
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="public-topbar">
      <div className="public-topbar__inner">
        <Link to="/" className="public-topbar__brand">
          <img src={logo} alt="JET5 – Location de voitures" className="public-topbar__logo-image" />
        </Link>

        <nav className="public-topbar__nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `public-topbar__link ${isActive ? "public-topbar__link--active" : ""}`
              }
            >
              {link.mobileLabel || link.label}
            </NavLink>
          ))}
        </nav>

        <div className="public-topbar__actions">
          <button
            type="button"
            className="public-topbar__theme-toggle"
            onClick={toggleTheme}
            aria-label={isDarkMode ? "Passer en mode clair" : "Passer en mode sombre"}
          >
            {isDarkMode ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="4" />
                <line x1="12" y1="2" x2="12" y2="5" />
                <line x1="12" y1="19" x2="12" y2="22" />
                <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
                <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
                <line x1="2" y1="12" x2="5" y2="12" />
                <line x1="19" y1="12" x2="22" y2="12" />
                <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
                <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 0 1 11.21 3 7 7 0 1 0 21 12.79z" />
              </svg>
            )}
          </button>

          {/* Hamburger button – mobile only */}
          <button
            type="button"
            className={`public-topbar__hamburger ${mobileMenuOpen ? "public-topbar__hamburger--open" : ""}`}
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      <nav className={`public-topbar__mobile-nav ${mobileMenuOpen ? "public-topbar__mobile-nav--open" : ""}`}>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `public-topbar__mobile-link ${isActive ? "public-topbar__mobile-link--active" : ""}`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

export default PublicTopbar;
