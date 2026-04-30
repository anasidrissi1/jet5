import React from "react";
import PublicTopbar from "./PublicTopbar";
import PublicFooter from "./PublicFooter";
import "../../styles/public-layout.css";
import "../../styles/public-premium-dark.css";

function PublicLayout({ children }) {
  return (
    <div className="public-layout">
      <PublicTopbar />
      <main className="public-layout__content">{children}</main>
      <PublicFooter />
    </div>
  );
}

export default PublicLayout;
