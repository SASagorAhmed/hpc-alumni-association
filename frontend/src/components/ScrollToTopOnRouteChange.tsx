import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  tryConsumeNavScrollRestore,
  scrollToLandingSectionById,
  scrollToLandingSectionByIdWhenReady,
  consumeBackToAchievementsSection,
  applyWindowScrollYWithRetries,
} from "@/lib/navScrollRestore";

/**
 * Complements `<ScrollRestoration />` (data router): that component saves/restores
 * `window` scroll per history entry and scrolls new routes to the top when needed.
 *
 * This module only handles app-specific cases:
 * - Return from `/achievements/:id` → prefer exact `saveNavScrollRestore` scroll Y; else
 *   scroll `#achievements` into view (direct link / no saved position).
 * - Other returns when `saveNavScrollRestore()` was used before opening a detail link.
 *
 * We do **not** call `window.scrollTo(0, 0)` on every navigation — that was resetting
 * positions that ScrollRestoration had just restored.
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

    const prevPathname = prevPathnameRef.current;
    if (prevPathname === pathname) {
      return;
    }

    const fromAchievementDetail = /^\/achievements\/[^/]+\/?$/.test(prevPathname);
    prevPathnameRef.current = pathname;

    const backFromAchievementDetail =
      pathname === "/" && (consumeBackToAchievementsSection() || fromAchievementDetail);

    // Back from /achievements/:id → landing: restore exact scroll if user opened detail from grid
    if (backFromAchievementDetail) {
      const savedY = tryConsumeNavScrollRestore(pathKey);
      if (savedY !== null) {
        applyWindowScrollYWithRetries(savedY);
        return;
      }
      const apply = () => scrollToLandingSectionById("achievements");
      apply();
      scrollToLandingSectionByIdWhenReady("achievements");
      requestAnimationFrame(apply);
      requestAnimationFrame(() => requestAnimationFrame(apply));
      queueMicrotask(apply);
      setTimeout(apply, 0);
      setTimeout(apply, 60);
      setTimeout(apply, 150);
      setTimeout(apply, 320);
      return;
    }

    const y = tryConsumeNavScrollRestore(pathKey);
    if (y !== null) {
      applyWindowScrollYWithRetries(y);
    }
  }, [pathname, pathKey]);

  return null;
}
