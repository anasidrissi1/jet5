import { Link } from "react-router-dom";
import logo from "@/assets/jet5logo.png";

export default function PublicFooter() {
  return (
    <footer className="jet-footer">
      <div className="jet-container">
        <div className="jet-footer-grid">
          <div className="jet-footer-brand">
            <Link to="/" className="jet-logo">
              <img src={logo} alt="JET5" width={40} height={40} loading="lazy" />
              <span>JET5</span>
            </Link>
            <p>
              Location de véhicules premium. Une expérience d'exception, une flotte d'élite,
              un service haut de gamme partout en France.
            </p>
          </div>
          <div>
            <h4>Navigation</h4>
            <ul>
              <li><Link to="/">Accueil</Link></li>
              <li><Link to="/cars">Véhicules</Link></li>
              <li><Link to="/service">Services</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4>Légal</h4>
            <ul>
              <li><a href="#">Mentions légales</a></li>
              <li><a href="#">CGV</a></li>
              <li><a href="#">Confidentialité</a></li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              <li>
                <a href="tel:+212661811580">Appeler: +212 6 61 81 15 80</a>
                {" · "}
                <a href="https://wa.me/212661811580" target="_blank" rel="noreferrer">WhatsApp</a>
              </li>
              <li><a href="mailto:jet5maroc@gmail.com">jet5maroc@gmail.com</a></li>
              <li>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=11+Rue+du+Liban,+Casablanca+20250"
                  target="_blank"
                  rel="noreferrer"
                >
                  11 Rue du Liban, Casablanca 20250
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="jet-footer-bottom">
          © {new Date().getFullYear()} JET5 Location · Conçu avec exigence.
        </div>
      </div>
    </footer>
  );
}
