/** Session key: one pending scroll restore when returning to a list/section page. */
export const NAV_SCROLL_RESTORE_KEY = "hpc:navScrollRestore";

/** Same offset as Navbar when scrolling to landing #sections */
export const LANDING_NAV_SCROLL_OFFSET_PX = 80;

/** Scroll so `#sectionId` sits below the fixed nav (matches Navbar scroll). */
export function scrollToLandingSectionById(sectionId: string, offsetPx = LANDING_NAV_SCROLL_OFFSET_PX): void {
  if (typeof document === "undefined") return;
  const el = document.getElementById(sectionId);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - offsetPx;
  window.scrollTo({ top: Math.max(0, y), left: 0, behavior: "auto" });
}

/** Retry until the section exists (landing page may still be mounting after route change). */
export function scrollToLandingSectionByIdWhenReady(sectionId: string, attempt = 0): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(sectionId)) {
    scrollToLandingSectionById(sectionId);
    return;
  }
  if (attempt >= 30) return;
  window.setTimeout(() => scrollToLandingSectionByIdWhenReady(sectionId, attempt + 1), 80);
}

export type NavScrollRestorePayload = { scrollY: number; fromPath: string };

/**
 * True when the saved "from" URL and the destination (pathname+search+hash) refer to the
 * same document path. Needed because the landing page may be `/` when saving but `/#achievements`
 * when returning from a detail page — both should restore the same scroll position.
 */
export function pathsMatchForScrollRestore(fromPath: string, toPathKey: string): boolean {
  if (fromPath === toPathKey) return true;
  const stripHash = (p: string) => {
    const i = p.indexOf("#");
    return i === -1 ? p : p.slice(0, i);
  };
  const normalize = (p: string) => {
    let s = p || "";
    if (!s.startsWith("/")) s = `/${s}`;
    return stripHash(s) || "/";
  };
  return normalize(fromPath) === normalize(toPathKey);
}

/** Set when user clicks “Back to Achievements” on /achievements/:id — read in ScrollToTopOnRouteChange. */
export const BACK_TO_ACHIEVEMENTS_KEY = "hpc:backToAchievementsSection";

const BACK_TO_ACHIEVEMENTS_MAX_AGE_MS = 15_000;

export function setBackToAchievementsSection(): void {
  try {
    sessionStorage.setItem(BACK_TO_ACHIEVEMENTS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/** Returns true once if a recent “back to achievements” click is pending; clears it. */
export function consumeBackToAchievementsSection(): boolean {
  try {
    const raw = sessionStorage.getItem(BACK_TO_ACHIEVEMENTS_KEY);
    if (!raw) return false;
    const t = Number(raw);
    if (!Number.isFinite(t) || Date.now() - t > BACK_TO_ACHIEVEMENTS_MAX_AGE_MS) {
      sessionStorage.removeItem(BACK_TO_ACHIEVEMENTS_KEY);
      return false;
    }
    sessionStorage.removeItem(BACK_TO_ACHIEVEMENTS_KEY);
    return true;
  } catch {
    /* ignore */
  }
  return false;
}

/** Call immediately before in-app navigation to a detail page (click on Link). */
export function saveNavScrollRestore(): void {
  try {
    const payload: NavScrollRestorePayload = {
      scrollY: window.scrollY,
      fromPath: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    };
    sessionStorage.setItem(NAV_SCROLL_RESTORE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * If a pending `saveNavScrollRestore` payload matches the destination URL, consume it
 * and return the saved scroll Y; otherwise return null (key left unchanged).
 */
export function tryConsumeNavScrollRestore(pathKey: string): number | null {
  try {
    const raw = sessionStorage.getItem(NAV_SCROLL_RESTORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { scrollY?: number; fromPath?: string };
    if (
      typeof parsed.scrollY !== "number" ||
      typeof parsed.fromPath !== "string" ||
      !pathsMatchForScrollRestore(parsed.fromPath, pathKey)
    ) {
      return null;
    }
    sessionStorage.removeItem(NAV_SCROLL_RESTORE_KEY);
    return parsed.scrollY;
  } catch {
    return null;
  }
}

/** Full page reload on `/` — `ScrollRestoration` uses `history.scrollRestoration = "manual"`, so the browser won’t restore. */
export const LANDING_REFRESH_SCROLL_KEY = "hpc:landingRefreshScroll";

export function saveLandingScrollBeforeUnload(): void {
  try {
    if (typeof window === "undefined") return;
    if (window.location.pathname !== "/") return;
    sessionStorage.setItem(
      LANDING_REFRESH_SCROLL_KEY,
      JSON.stringify({ scrollY: window.scrollY })
    );
  } catch {
    /* ignore */
  }
}

export function tryConsumeLandingRefreshScroll(): number | null {
  try {
    const raw = sessionStorage.getItem(LANDING_REFRESH_SCROLL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { scrollY?: unknown };
    if (typeof parsed.scrollY !== "number" || !Number.isFinite(parsed.scrollY)) return null;
    sessionStorage.removeItem(LANDING_REFRESH_SCROLL_KEY);
    return Math.max(0, parsed.scrollY);
  } catch {
    return null;
  }
}

/** Reapply scroll after layout / ScrollRestoration (extra delays for landing images/async blocks). */
export function applyWindowScrollYWithRetries(y: number, options?: { landingReload?: boolean }): void {
  const apply = () => window.scrollTo({ top: y, left: 0, behavior: "auto" });
  apply();
  requestAnimationFrame(apply);
  requestAnimationFrame(() => requestAnimationFrame(apply));
  queueMicrotask(apply);
  const delays = options?.landingReload
    ? [0, 50, 120, 280, 500, 900, 1500, 2500]
    : [0, 50, 120, 280];
  for (const ms of delays) {
    window.setTimeout(apply, ms);
  }
}
