import React from "react";
import { NavLink } from "react-router-dom";
import "../../styles/public-sidebar.css";

function PublicSidebar() {
  const links = [
    { to: "/", label: "Accueil" },
    { to: "/cars", label: "Nos voitures" },
    { to: "/contact", label: "Contact" },
  ];

  return (
    <aside className="public-sidebar">
      <div className="public-sidebar__brand">
        <span className="public-sidebar__brand-main">JET5</span>
        <span className="public-sidebar__brand-sub">Location de voitures</span>
      </div>

      <nav className="public-sidebar__nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `public-sidebar__link ${isActive ? "public-sidebar__link--active" : ""}`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default PublicSidebar;
