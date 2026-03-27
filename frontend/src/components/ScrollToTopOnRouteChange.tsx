import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls to top on in-app route changes only (not on full page load / refresh),
 * so the document keeps normal browser behaviour on reload while SPA navigations feel consistent.
 */
export function ScrollToTopOnRouteChange() {
  const { pathname } = useLocation();
  const prevPathRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (prevPathRef.current !== null && prevPathRef.current !== pathname) {
      window.scrollTo(0, 0);
    }
    prevPathRef.current = pathname;
  }, [pathname]);

  return null;
}
