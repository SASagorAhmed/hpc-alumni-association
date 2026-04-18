import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { clearLandingNavIntent, shouldSkipLandingRestore } from "@/lib/landingNavIntent";
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

function resolveLandingAnchor(scrollY: number) {
  if (typeof window === "undefined") return null;
  const activationY = scrollY + 72;
  let chosenId: string | null = null;
  let chosenTop = 0;
  for (const id of LANDING_SECTION_IDS) {
    const node = document.getElementById(id);
    if (!node) continue;
    const top = node.getBoundingClientRect().top + window.scrollY;
    if (top <= activationY && top >= chosenTop) {
      chosenId = id;
      chosenTop = top;
    }
  }
  if (!chosenId) return null;
  return {
    sectionId: chosenId,
    sectionOffset: Math.max(0, scrollY - chosenTop),
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
  const loggedLandingScrollSaveRef = useRef(false);

  const revealIfLocked = () => {
    if (typeof window === "undefined") return;
    if (!window.__HPC_SCROLL_VISIBILITY_LOCK__) return;
    window.__HPC_SCROLL_VISIBILITY_LOCK__ = false;
    document.documentElement.style.visibility = "";
  };

  const notifyScrollRestored = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("hpc:route-scroll-restored"));
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
    if (!snapshot && routeProfile === "landing" && shouldSkipLandingRestore()) {
      delete window.__HPC_PENDING_SCROLL_RESTORE__;
      revealIfLocked();
      return;
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

    if (!snapshot) return;
    const getRestoreY = () => {
      let nextY = snapshot.y;
      if (
        snapshotSource !== "auth" &&
        routeProfile === "landing" &&
        typeof snapshot.sectionId === "string" &&
        typeof snapshot.sectionOffset === "number"
      ) {
        const anchorNode = document.getElementById(snapshot.sectionId);
        if (anchorNode) {
          const anchorTop = anchorNode.getBoundingClientRect().top + window.scrollY;
          nextY = Math.max(0, anchorTop + snapshot.sectionOffset);
        }
      }
      return nextY;
    };

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
      notifyScrollRestored();
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
      const y = window.scrollY || window.pageYOffset || 0;
      const snapshot: ScrollSnapshot = { y };
      if (routeProfile === "landing") {
        const anchor = resolveLandingAnchor(y);
        if (anchor) {
          snapshot.sectionId = anchor.sectionId;
          snapshot.sectionOffset = anchor.sectionOffset;
        }
      }
      window.sessionStorage.setItem(key, JSON.stringify(snapshot));
      if (routeProfile === "landing" && (reason !== "scroll" || !loggedLandingScrollSaveRef.current)) {
        loggedLandingScrollSaveRef.current = true;
      }
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

