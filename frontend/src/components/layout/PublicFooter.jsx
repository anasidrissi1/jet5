import React from "react";
import { Link } from "react-router-dom";
import logo from "../../assets/jet5logo.png";

function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="public-footer">
      <div className="public-footer__inner">
        <div className="public-footer__grid">
          <div className="public-footer__brand-col">
            <img src={logo} alt="JET5" className="public-footer__logo" />
            <p className="public-footer__tagline">
              L'art de la route, sans compromis. Location de véhicules premium au Maroc.
            </p>
          </div>

          <div className="public-footer__col">
            <h4>Navigation</h4>
            <ul className="public-footer__links">
              <li><Link to="/">Accueil</Link></li>
              <li><Link to="/cars">Véhicules</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </div>

          <div className="public-footer__col">
            <h4>Services</h4>
            <ul className="public-footer__links">
              <li><Link to="/cars">Location courte durée</Link></li>
              <li><Link to="/cars">Location longue durée</Link></li>
              <li><Link to="/contact">Livraison à domicile</Link></li>
            </ul>
          </div>

          <div className="public-footer__col">
            <h4>Contact</h4>
            <ul className="public-footer__links">
              <li><a href="tel:+212625990709">06 25 99 07 09</a></li>
              <li><a href="mailto:jet5.casa@gmail.com">jet5.casa@gmail.com</a></li>
              <li><a href="https://www.google.com/maps/search/?api=1&query=JET5%2C%2011%20Rue%20du%20Liban%2C%20Casablanca%2020250" target="_blank" rel="noreferrer">11 Rue du Liban, Casablanca 20250</a></li>
            </ul>
          </div>
        </div>

        <div className="public-footer__divider" />

        <div className="public-footer__bottom">
          <p className="public-footer__copy">
            &copy; {currentYear} <span>JET5</span>. Tous droits réservés.
          </p>
          <div className="public-footer__social">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="public-footer__social-link" aria-label="Instagram">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="public-footer__social-link" aria-label="Facebook">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
            </a>
            <a href="https://wa.me/212600000000" target="_blank" rel="noopener noreferrer" className="public-footer__social-link" aria-label="WhatsApp">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default PublicFooter;
