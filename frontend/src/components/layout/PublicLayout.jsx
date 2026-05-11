import { useEffect } from "react";
import PublicTopbar from "./PublicTopbar";
import PublicFooter from "./PublicFooter";
import "@/styles/public-luxury.css";
import "@/styles/public-site.css";
import "@/styles/public-layout.css";
import "@/styles/public-premium-dark.css";
import "@/styles/public-contact.css";

export default function PublicLayout({ children }) {
  useEffect(() => {
    const prev = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', 'dark');
    if (document.body) document.body.setAttribute('data-theme', 'dark');
    return () => {
      if (prev) {
        document.documentElement.setAttribute('data-theme', prev);
        if (document.body) document.body.setAttribute('data-theme', prev);
      }
    };
  }, []);

  return (
    <div className="jet-layout">
      <PublicTopbar />
      <main className="jet-main">{children}</main>
      <PublicFooter />
    </div>
  );
}
