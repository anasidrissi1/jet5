import { useEffect, useRef, useState } from "react";

export default function useScrollAnimation(options = {}) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const node = elementRef.current;
    if (!node || typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -24px 0px",
        ...options,
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [options]);

  return [elementRef, isVisible];
}
