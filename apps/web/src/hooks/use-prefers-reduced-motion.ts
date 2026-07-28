import { useEffect, useState } from "react";

/**
 * Tracks the `prefers-reduced-motion` media query so components can gate
 * animation/motion effects behind the user's OS-level preference.
 *
 * Previously duplicated verbatim in aurora-backdrop.tsx, glass-panel.tsx and
 * auth-surface.tsx — extracted here as the single source of truth.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
