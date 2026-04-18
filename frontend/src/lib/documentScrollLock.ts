/**
 * Reference-counted document scroll lock (body + html inline styles).
 * Used by fullscreen overlays and the mobile nav drawer so nested locks
 * do not restore a stale `overflow: hidden` after the outer layer unmounts.
 */
type StyleSnapshot = {
  bodyOverflow: string;
  bodyOverscrollBehavior: string;
  bodyTouchAction: string;
  bodyPaddingRight: string;
  htmlOverflow: string;
  htmlOverscrollBehavior: string;
};

let lockCount = 0;
let snapshot: StyleSnapshot | null = null;

/** Each call returns `release`; invoke on unmount or when the lock is no longer needed. */
export function acquireDocumentScrollLock(): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const body = document.body;
  const html = document.documentElement;

  if (lockCount === 0) {
    const scrollbarWidth = Math.max(0, window.innerWidth - html.clientWidth);
    snapshot = {
      bodyOverflow: body.style.overflow,
      bodyOverscrollBehavior: body.style.overscrollBehavior,
      bodyTouchAction: body.style.touchAction,
      bodyPaddingRight: body.style.paddingRight,
      htmlOverflow: html.style.overflow,
      htmlOverscrollBehavior: html.style.overscrollBehavior,
    };

    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    body.style.touchAction = "none";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
  }

  lockCount += 1;

  return () => {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount > 0) return;

    const snap = snapshot;
    snapshot = null;
    if (!snap) return;

    body.style.overflow = snap.bodyOverflow;
    body.style.overscrollBehavior = snap.bodyOverscrollBehavior;
    body.style.touchAction = snap.bodyTouchAction;
    body.style.paddingRight = snap.bodyPaddingRight;
    html.style.overflow = snap.htmlOverflow;
    html.style.overscrollBehavior = snap.htmlOverscrollBehavior;
  };
}
