import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { NAV_SCROLL_RESTORE_KEY } from "@/lib/navScrollRestore";

/**
 * Scrolls to top on in-app **pathname** changes (not hash-only on the same path).
 * If the user opened a detail page from a list/section, we restore the previous
 * scroll position when they return (see `saveNavScrollRestore`).
 */
export function ScrollToTopOnRouteChange() {
  const location = useLocation();
  const prevPathnameRef = useRef<string | null>(null);

  const pathKey = `${location.pathname}${location.search}${location.hash}`;
  const pathname = location.pathname;

  useLayoutEffect(() => {
    if (prevPathnameRef.current === null) {
      prevPathnameRef.current = pathname;
      return;
    }
    if (prevPathnameRef.current === pathname) {
      return;
    }
    prevPathnameRef.current = pathname;

    try {
      const raw = sessionStorage.getItem(NAV_SCROLL_RESTORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { scrollY?: number; fromPath?: string };
        if (typeof parsed.scrollY === "number" && typeof parsed.fromPath === "string" && parsed.fromPath === pathKey) {
          sessionStorage.removeItem(NAV_SCROLL_RESTORE_KEY);
          requestAnimationFrame(() => {
            window.scrollTo({ top: parsed.scrollY, left: 0, behavior: "auto" });
            requestAnimationFrame(() => {
              window.scrollTo({ top: parsed.scrollY, left: 0, behavior: "auto" });
            });
          });
          return;
        }
      }
    } catch {
      /* ignore */
    }
    window.scrollTo(0, 0);
  }, [pathname, pathKey]);

  return null;
}
