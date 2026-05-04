import { Link, useLocation } from "react-router-dom";
import { Menu, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import logo from "@/assets/jet5logo.png";
import PublicSidebar from "./PublicSidebar";
import "../../styles/public-topbar.css";

const links = [
  { to: "/", label: "Accueil" },
  { to: "/cars", label: "Véhicules" },
  { to: "/service", label: "Services" },
  { to: "/contact", label: "Contact" },
];

export default function PublicTopbar() {
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="jet-topbar">
        <div className="jet-topbar-inner">
          <Link to="/" className="jet-logo">
            <img src={logo} alt="JET5 Location" width={44} height={44} />
            <span>JET5</span>
          </Link>
          <nav className="jet-nav">
            {links.map((l) => (
              <Link key={l.to} to={l.to} className={pathname === l.to ? "active" : ""}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="jet-topbar-actions">
            <button
              className="jet-theme-toggle"
              onClick={toggleTheme}
              aria-label="Changer le thème"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link to="/booking" className="jet-btn jet-btn-primary" style={{ padding: "10px 22px" }}>
              Réserver
            </Link>
            <button className="jet-burger" onClick={() => setOpen(true)} aria-label="Menu">
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>
      <PublicSidebar open={open} onClose={() => setOpen(false)} links={links} />
    </>
  );
}
