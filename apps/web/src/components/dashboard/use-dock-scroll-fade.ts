import { useEffect, useState } from "react";

/**
 * True while the page is actively scrolling, clearing `debounceMs` after
 * scrolling stops. Listens on `document` with `capture: true` because
 * scroll events don't bubble — the actual scrollable element is a nested
 * `overflow-auto` container (apps/web/src/routes/dashboard.tsx's `<main>`),
 * not `window`/`document` itself, so a capture-phase listener on document
 * is what catches it regardless of which page's scroll container fires it.
 */
export function useDockScrollFade(debounceMs = 400): boolean {
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const handleScroll = () => {
      setIsScrolling(true);
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setIsScrolling(false), debounceMs);
    };

    document.addEventListener("scroll", handleScroll, {
      capture: true,
      passive: true,
    });

    return () => {
      document.removeEventListener("scroll", handleScroll, {
        capture: true,
      });
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [debounceMs]);

  return isScrolling;
}
