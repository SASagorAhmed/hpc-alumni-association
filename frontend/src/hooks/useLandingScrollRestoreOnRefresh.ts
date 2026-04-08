import { useLayoutEffect, useEffect } from "react";
import {
  saveLandingScrollBeforeUnload,
  tryConsumeLandingRefreshScroll,
  applyWindowScrollYWithRetries,
} from "@/lib/navScrollRestore";

/**
 * Persists `window.scrollY` before a full reload on `/` and restores it after.
 * React Router’s ScrollRestoration sets `history.scrollRestoration = "manual"`, so the
 * browser does not restore scroll on refresh by itself.
 */
export function useLandingScrollRestoreOnRefresh() {
  useLayoutEffect(() => {
    const y = tryConsumeLandingRefreshScroll();
    if (y !== null) {
      applyWindowScrollYWithRetries(y, { landingReload: true });
    }
  }, []);

  useEffect(() => {
    const save = () => saveLandingScrollBeforeUnload();
    window.addEventListener("pagehide", save);
    window.addEventListener("beforeunload", save);
    let t: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      if (t !== null) return;
      t = window.setTimeout(() => {
        t = null;
        saveLandingScrollBeforeUnload();
      }, 200);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("pagehide", save);
      window.removeEventListener("beforeunload", save);
      window.removeEventListener("scroll", onScroll);
      if (t !== null) window.clearTimeout(t);
    };
  }, []);
}
