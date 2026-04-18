import { useLayoutEffect, useRef } from "react";
import { useLocation, type Location } from "react-router-dom";
import {
  clearLandingNavIntent,
  consumeFreshLandingNavTarget,
  shouldSkipLandingRestore,
} from "@/lib/landingNavIntent";
import {
  captureLoginBackSnapshot,
  consumeLoginBackSnapshot,
  consumeRegisterBackSnapshot,
} from "@/lib/registerBackSnapshot";

declare global {
  interface Window {
    __HPC_PENDING_SCROLL_RESTORE__?: {
      key: string;
      y: number;
      sectionId?: string;
      sectionOffset?: number;
    };
    __HPC_SCROLL_VISIBILITY_LOCK__?: boolean;
  }
}

type RouteScrollOptions = {
  enabled?: boolean;
  keyPrefix?: string;
};

type ScrollSnapshot = {
  y: number;
  sectionId?: string;
  sectionOffset?: number;
};

type RouteRestoreProfile = "landing" | "register" | "default";

function routeKey(pathname: string, search: string) {
  return `${pathname}${search}`;
}

/** Routes that typically reset `window.scrollY` before this layout effect runs after leaving `/`. */
function isScrollResetRouteFromHome(pathname: string): boolean {
  return (
    pathname === "/dashboard" ||
    pathname === "/admin/dashboard" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/verify-otp" ||
    pathname === "/admin/login" ||
    pathname === "/core-features"
  );
}

function readSnapshot(raw: string | null): ScrollSnapshot | null {
  if (!raw) return null;
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) {
    return { y: numeric };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ScrollSnapshot>;
    if (typeof parsed?.y !== "number" || !Number.isFinite(parsed.y)) return null;
    return {
      y: parsed.y,
      sectionId: typeof parsed.sectionId === "string" ? parsed.sectionId : undefined,
      sectionOffset:
        typeof parsed.sectionOffset === "number" && Number.isFinite(parsed.sectionOffset)
          ? parsed.sectionOffset
          : undefined,
    };
  } catch {
    return null;
  }
}

/** Keep in sync with `Navbar.tsx` (`NAVBAR_SCROLL_OFFSET` + `SECTION_SWITCH_BIAS_PX`). */
const LANDING_ANCHOR_NAV_OFFSET_PX = 72;
const LANDING_ANCHOR_SECTION_BIAS_PX = 220;
/** Match Navbar “near document bottom” handling so Contact + footer scroll maps to `#contact`. */
const LANDING_ANCHOR_BOTTOM_TOLERANCE_PX = 50;

/** Document order on `Index` (ids must match section `id` attributes). */
const LANDING_SECTION_IDS = [
  "about",
  "goals",
  "features",
  "committee",
  "achievements",
  "notices",
  "memories",
  "academics",
  "campus",
  "community",
  "join",
  "contact",
] as const;

/**
 * Used by scroll persistence and landing Navbar active-state.
 * `scrollY` is the scroll position being attributed (often `window.scrollY`, sometimes a merged logical y).
 * Document Y for nodes always uses the current viewport (`window.scrollY`) for `getBoundingClientRect` math.
 */
export function resolveLandingAnchor(scrollY: number) {
  if (typeof window === "undefined") return null;
  const yDoc = window.scrollY || window.pageYOffset || 0;
  const logicalY = Number.isFinite(scrollY) ? scrollY : yDoc;

  if (
    window.innerHeight + yDoc >=
    document.body.scrollHeight - LANDING_ANCHOR_BOTTOM_TOLERANCE_PX
  ) {
    const contactNode = document.getElementById("contact");
    if (contactNode) {
      const contactTop = contactNode.getBoundingClientRect().top + yDoc;
      return {
        sectionId: "contact",
        sectionOffset: Math.max(0, logicalY - contactTop),
      };
    }
  }

  const activationY = logicalY + LANDING_ANCHOR_NAV_OFFSET_PX + LANDING_ANCHOR_SECTION_BIAS_PX;
  let chosenId: string | null = null;
  let chosenTop = 0;
  for (const id of LANDING_SECTION_IDS) {
    const node = document.getElementById(id);
    if (!node) continue;
    const top = node.getBoundingClientRect().top + yDoc;
    if (top <= activationY && top >= chosenTop) {
      chosenId = id;
      chosenTop = top;
    }
  }

  const contactEl = document.getElementById("contact");
  if (contactEl) {
    const contactTopAbs = contactEl.getBoundingClientRect().top + yDoc;
    if (logicalY >= contactTopAbs - 0.5) {
      return {
        sectionId: "contact",
        sectionOffset: Math.max(0, logicalY - contactTopAbs),
      };
    }
  }

  if (!chosenId) return null;
  return {
    sectionId: chosenId,
    sectionOffset: Math.max(0, logicalY - chosenTop),
  };
}

export function useRouteScrollPersistence(options?: RouteScrollOptions) {
  const location = useLocation();
  const enabled = options?.enabled ?? true;
  const keyPrefix = options?.keyPrefix ?? "HPC_SCROLL";
  const key = `${keyPrefix}:${routeKey(location.pathname, location.search)}`;
  const alwaysTopRoute = location.pathname === "/register" || location.pathname === "/login";
  const isLoginRoute = location.pathname === "/login";
  const routeProfile: RouteRestoreProfile = alwaysTopRoute
    ? "register"
    : location.pathname === "/"
      ? "landing"
      : "default";
  const previousKeyRef = useRef<string | null>(null);
  const previousPathnameRef = useRef<string | null>(null);
  /** After landing restore, ignore spurious `scroll` saves at ~0 that would clobber a deep snapshot. */
  const landingRestoreArmUntilRef = useRef(0);

  /** Clears any first-paint visibility lock (legacy inline script) so the shell never stays blank. */
  const revealIfLocked = () => {
    if (typeof window === "undefined") return;
    window.__HPC_SCROLL_VISIBILITY_LOCK__ = false;
    document.documentElement.style.visibility = "";
  };

  const notifyScrollRestored = (detail?: { landingSectionId?: string }) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("hpc:route-scroll-restored", {
        detail: detail ?? {},
      })
    );
  };

  useLayoutEffect(() => {
    if (!enabled || typeof window === "undefined") {
      previousKeyRef.current = key;
      previousPathnameRef.current = location.pathname;
      return;
    }
    const previousKey = previousKeyRef.current;
    const previousPathname = previousPathnameRef.current;
    if (previousKey && previousKey !== key) {
      // Leaving `/` for routes that reset document scroll before this effect runs would clobber a
      // good `/` snapshot from `persistLandingScrollSnapshotEarly` or scroll listeners.
      const leavingHomeToScrollResetShell =
        previousPathname === "/" && isScrollResetRouteFromHome(location.pathname);
      if (!leavingHomeToScrollResetShell) {
        const previousY = window.scrollY || window.pageYOffset || 0;
        const snapshot: ScrollSnapshot = { y: previousY };
        if (previousPathname === "/") {
          const anchor = resolveLandingAnchor(previousY);
          if (anchor) {
            snapshot.sectionId = anchor.sectionId;
            snapshot.sectionOffset = anchor.sectionOffset;
          }
        }
        try {
          window.sessionStorage.setItem(previousKey, JSON.stringify(snapshot));
        } catch {
          // ignore storage write failures
        }
        if (isLoginRoute) {
          captureLoginBackSnapshot(previousKey, snapshot, { preserveExisting: true });
        }
      }
    }
    previousKeyRef.current = key;
    previousPathnameRef.current = location.pathname;
  }, [enabled, key, location.pathname, isLoginRoute]);

  useLayoutEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if (location.pathname === "/login") return;

    const captureForLoginLink = (target: EventTarget | null) => {
      const element = target instanceof Element ? target : null;
      if (!element) return;
      const anchor = element.closest("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      let url: URL;
      try {
        url = new URL(href, window.location.origin);
      } catch {
        return;
      }
      const isNoticeProtectedTarget =
        url.origin === window.location.origin &&
        (url.pathname === "/notices" || url.pathname.startsWith("/notices/"));
      if (isNoticeProtectedTarget) {
        const y = window.scrollY || window.pageYOffset || 0;
        const snapshot: ScrollSnapshot = { y };
        if (location.pathname === "/") {
          const anchorData = resolveLandingAnchor(y);
          if (anchorData) {
            snapshot.sectionId = anchorData.sectionId;
            snapshot.sectionOffset = anchorData.sectionOffset;
          }
        }
        captureLoginBackSnapshot(key, snapshot, { preserveExisting: true });
      }
      if (url.origin !== window.location.origin || url.pathname !== "/login") return;
      const y = window.scrollY || window.pageYOffset || 0;
      const snapshot: ScrollSnapshot = { y };
      if (location.pathname === "/") {
        const anchorData = resolveLandingAnchor(y);
        if (anchorData) {
          snapshot.sectionId = anchorData.sectionId;
          snapshot.sectionOffset = anchorData.sectionOffset;
        }
      }
      captureLoginBackSnapshot(key, snapshot);
    };

    const onPointerDownCapture = (event: PointerEvent) => {
      captureForLoginLink(event.target);
    };

    window.addEventListener("pointerdown", onPointerDownCapture, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDownCapture, true);
    };
  }, [enabled, key, location.pathname]);

  useLayoutEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, [enabled]);

  useLayoutEffect(() => {
    if (!enabled || typeof window === "undefined") {
      revealIfLocked();
      return;
    }
    if (routeProfile === "register") {
      // Register flow should never carry a stale landing section intent.
      // Otherwise back-to-landing can incorrectly skip exact restore.
      clearLandingNavIntent();
      delete window.__HPC_PENDING_SCROLL_RESTORE__;
      const prevScrollBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, 0);
      document.documentElement.style.scrollBehavior = prevScrollBehavior;
      notifyScrollRestored();
      revealIfLocked();
      return;
    }
    let snapshot: ScrollSnapshot | null = null;
    let snapshotSource: "auth" | "pending_or_session" = "pending_or_session";
    // Highest-priority source snapshot for register-return flows.
    snapshot = consumeRegisterBackSnapshot(key);
    if (snapshot) {
      snapshotSource = "auth";
    } else {
      snapshot = consumeLoginBackSnapshot(key);
      if (snapshot) snapshotSource = "auth";
    }
    if (!snapshot) {
      const pending = window.__HPC_PENDING_SCROLL_RESTORE__;
      if (pending?.key === key && Number.isFinite(pending.y)) {
        snapshot = {
          y: pending.y,
          sectionId: typeof pending.sectionId === "string" ? pending.sectionId : undefined,
          sectionOffset:
            typeof pending.sectionOffset === "number" && Number.isFinite(pending.sectionOffset)
              ? pending.sectionOffset
              : undefined,
        };
        delete window.__HPC_PENDING_SCROLL_RESTORE__;
      } else {
        snapshot = readSnapshot(window.sessionStorage.getItem(key));
      }
    }

    if (!snapshot) {
      revealIfLocked();
      return;
    }

    if (
      snapshotSource !== "auth" &&
      routeProfile === "landing" &&
      shouldSkipLandingRestore()
    ) {
      void consumeFreshLandingNavTarget();
      delete window.__HPC_PENDING_SCROLL_RESTORE__;
      revealIfLocked();
      return;
    }

    if (routeProfile === "landing") {
      landingRestoreArmUntilRef.current = Date.now() + 900;
    }

    const getRestoreY = () => {
      let nextY = snapshot.y;
      if (
        snapshotSource !== "auth" &&
        routeProfile === "landing" &&
        typeof snapshot.sectionId === "string"
      ) {
        const anchorNode = document.getElementById(snapshot.sectionId);
        if (anchorNode) {
          const anchorTop = anchorNode.getBoundingClientRect().top + window.scrollY;
          const off =
            typeof snapshot.sectionOffset === "number" && Number.isFinite(snapshot.sectionOffset)
              ? snapshot.sectionOffset
              : 0;
          nextY = Math.max(0, anchorTop + off);
        }
      }
      return nextY;
    };

    const scrollRestoredDetail =
      routeProfile === "landing" &&
      typeof snapshot.sectionId === "string" &&
      snapshot.sectionId.trim()
        ? { landingSectionId: snapshot.sectionId }
        : undefined;

    const applyRestore = () => {
      const nextY = getRestoreY();
      if (!Number.isFinite(nextY)) return;
      // Hash routes are currently landing-only. Keep hash cleanup scoped.
      if (routeProfile === "landing" && window.location.hash) {
        window.history.replaceState({}, "", window.location.pathname + window.location.search);
      }
      const prevScrollBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, nextY);
      document.documentElement.style.scrollBehavior = prevScrollBehavior;
      notifyScrollRestored(scrollRestoredDetail);
    };
    applyRestore();

    // Use short bounded settle passes and let user input cancel immediately.
    let settleRaf = 0;
    let settlePass = 0;
    const initialMaxScrollableY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    // After refresh, layout below the fold may not exist yet; y can exceed max scroll until content mounts.
    const needsBottomRecovery =
      routeProfile === "landing" && snapshot.y > initialMaxScrollableY + 2;
    const maxSettlePasses = routeProfile === "landing" ? (needsBottomRecovery ? 120 : 16) : 8;
    let userInteracted = false;
    const cancelSettleOnInput = () => {
      userInteracted = true;
      if (settleRaf) {
        cancelAnimationFrame(settleRaf);
        settleRaf = 0;
      }
    };
    // Landing: always run a short settle pass so y-only restores survive async layout (images, queries).
    const shouldRunSettlePass = routeProfile === "default" || routeProfile === "landing";
    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let stopRecoveryTimeout = 0;
    const disconnectRecoveryObservers = () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      if (mutationObserver) {
        mutationObserver.disconnect();
        mutationObserver = null;
      }
      if (stopRecoveryTimeout) {
        window.clearTimeout(stopRecoveryTimeout);
        stopRecoveryTimeout = 0;
      }
    };
    if (shouldRunSettlePass) {
      const runSettlePass = () => {
        if (userInteracted) return;
        applyRestore();
        if (settlePass >= maxSettlePasses) return;
        settlePass += 1;
        settleRaf = requestAnimationFrame(runSettlePass);
      };
      window.addEventListener("wheel", cancelSettleOnInput, { passive: true });
      window.addEventListener("touchstart", cancelSettleOnInput, { passive: true });
      window.addEventListener("pointerdown", cancelSettleOnInput, { passive: true });
      window.addEventListener("keydown", cancelSettleOnInput);
      settleRaf = requestAnimationFrame(runSettlePass);
    }
    if (needsBottomRecovery) {
      const recoveryTick = () => {
        if (userInteracted) return;
        applyRestore();
      };
      resizeObserver = new ResizeObserver(recoveryTick);
      resizeObserver.observe(document.documentElement);
      if (document.body) resizeObserver.observe(document.body);
      mutationObserver = new MutationObserver(recoveryTick);
      if (document.body) {
        mutationObserver.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["class", "style"],
        });
      }
      stopRecoveryTimeout = window.setTimeout(disconnectRecoveryObservers, 8000);
    }
    revealIfLocked();
    return () => {
      if (settleRaf) cancelAnimationFrame(settleRaf);
      disconnectRecoveryObservers();
      window.removeEventListener("wheel", cancelSettleOnInput as EventListener);
      window.removeEventListener("touchstart", cancelSettleOnInput as EventListener);
      window.removeEventListener("pointerdown", cancelSettleOnInput as EventListener);
      window.removeEventListener("keydown", cancelSettleOnInput as EventListener);
    };
  }, [enabled, key, routeProfile]);

  useLayoutEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    if (routeProfile === "register") {
      clearLandingNavIntent();
      try {
        window.sessionStorage.removeItem(key);
      } catch {
        // ignore storage errors
      }
      return;
    }

    const save = (reason: "scroll" | "pagehide" | "beforeunload" | "cleanup") => {
      // On route change away from `/`, cleanup runs after the next view has committed; `scrollY` is
      // often already ~0 here, which would wipe a good landing snapshot (early persist + scroll saves).
      if (reason === "cleanup" && routeProfile === "landing") {
        return;
      }
      let y = window.scrollY || window.pageYOffset || 0;
      if (reason === "scroll" && routeProfile === "landing") {
        if (y < 200 && Date.now() < landingRestoreArmUntilRef.current) {
          try {
            const existing = readSnapshot(window.sessionStorage.getItem(key));
            if (existing && typeof existing.y === "number" && existing.y > y + 400) {
              return;
            }
          } catch {
            /* ignore */
          }
        }
      }
      const snapshot: ScrollSnapshot = { y };
      if (routeProfile === "landing") {
        const anchor = resolveLandingAnchor(y);
        if (anchor) {
          snapshot.sectionId = anchor.sectionId;
          snapshot.sectionOffset = anchor.sectionOffset;
        }
      }
      window.sessionStorage.setItem(key, JSON.stringify(snapshot));
    };

    const onScroll = () => save("scroll");
    const onPageHide = () => save("pagehide");
    const onBeforeUnload = () => save("beforeunload");

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      save("cleanup");
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [enabled, key, routeProfile]);
}

/**
 * Writes the current window scroll for `/` into the same sessionStorage key used by
 * `useRouteScrollPersistence`, **before** the next route paints (e.g. Dashboard link).
 * Without this, the layout effect runs after navigation and reads `scrollY` from the new page (~0).
 */
export function persistLandingScrollSnapshotEarly(
  keyPrefix: string,
  location: Pick<Location, "pathname" | "search" | "state">
) {
  if (typeof window === "undefined") return;
  const bg = (location.state as { backgroundLocation?: Location } | null)?.backgroundLocation;
  let pathname: string | null = null;
  let search = "";
  if (bg?.pathname === "/") {
    pathname = "/";
    search = bg.search ?? "";
  } else if (location.pathname === "/") {
    pathname = "/";
    search = location.search ?? "";
  }
  if (!pathname) return;

  const key = `${keyPrefix}:${routeKey(pathname, search)}`;
  /** Focus / scroll-into-view on the Dashboard control can drop `scrollY` sharply before this runs. */
  const measuredY = window.scrollY || window.pageYOffset || 0;
  let y = measuredY;
  try {
    const existing = readSnapshot(window.sessionStorage.getItem(key));
    if (existing && Number.isFinite(existing.y) && existing.y > measuredY + 200) {
      y = existing.y;
    }
  } catch {
    /* ignore */
  }
  const snapshot: ScrollSnapshot = { y };
  const anchor = resolveLandingAnchor(y);
  if (anchor) {
    snapshot.sectionId = anchor.sectionId;
    snapshot.sectionOffset = anchor.sectionOffset;
  }
  try {
    window.sessionStorage.setItem(key, JSON.stringify(snapshot));
  } catch {
    /* ignore storage write failures */
  }
}

