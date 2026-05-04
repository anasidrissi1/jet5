import { Link, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import "../../styles/public-sidebar.css";

export default function PublicSidebar({ open, onClose, links }) {
  const { pathname } = useLocation();
  return (
    <>
      <div className={`jet-sidebar-overlay ${open ? "open" : ""}`} onClick={onClose} />
      <aside className={`jet-sidebar ${open ? "open" : ""}`}>
        <div className="jet-sidebar-head">
          <span style={{ fontFamily: "Poppins", fontWeight: 800, fontSize: "1.25rem" }}>
            JET5
          </span>
          <button className="jet-sidebar-close" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        <nav className="jet-sidebar-nav">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={onClose}
              className={pathname === l.to ? "active" : ""}
            >
              {l.label}
            </Link>
          ))}
          <Link
            to="/booking"
            onClick={onClose}
            className="jet-btn jet-btn-primary"
            style={{ marginTop: 16 }}
          >
            Réserver maintenant
          </Link>
        </nav>
        <div className="jet-sidebar-foot">© JET5 Location · Tous droits réservés</div>
      </aside>
    </>
  );
}
