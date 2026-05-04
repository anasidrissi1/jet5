import { useEffect } from "react";

/**
 * Reveal elements marked with [data-reveal] when they enter viewport.
 * Dependencies can be passed to retrigger the observer on content changes.
 */
export default function useScrollReveal(deps = []) {
  useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      return undefined;
    }

    const elements = Array.from(document.querySelectorAll("[data-reveal]"));
    if (!elements.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.14,
        rootMargin: "0px 0px -24px 0px",
      }
    );

    elements.forEach((element) => {
      element.classList.remove("is-visible");
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, deps);
}
