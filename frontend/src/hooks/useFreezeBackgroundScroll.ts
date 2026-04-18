import { useLayoutEffect } from "react";

/**
 * Freezes window/body scroll while a full-screen route layer is open.
 * Prevents foreground layer scrolling from mutating the background page scroll.
 */
type FrozenStyleSnapshot = {
  bodyOverflow: string;
  bodyOverscrollBehavior: string;
  bodyTouchAction: string;
  bodyPaddingRight: string;
  htmlOverflow: string;
  htmlOverscrollBehavior: string;
};

let activeLocks = 0;
let frozenStyles: FrozenStyleSnapshot | null = null;

export function useFreezeBackgroundScroll(active: boolean) {
  useLayoutEffect(() => {
    if (!active || typeof window === "undefined") return;

    const body = document.body;
    const html = document.documentElement;
    if (activeLocks === 0) {
      const scrollbarWidth = Math.max(0, window.innerWidth - html.clientWidth);
      frozenStyles = {
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
    activeLocks += 1;

    return () => {
      activeLocks = Math.max(0, activeLocks - 1);
      if (activeLocks > 0) return;

      const snapshot = frozenStyles;
      frozenStyles = null;
      if (!snapshot) return;

      body.style.overflow = snapshot.bodyOverflow;
      body.style.overscrollBehavior = snapshot.bodyOverscrollBehavior;
      body.style.touchAction = snapshot.bodyTouchAction;
      body.style.paddingRight = snapshot.bodyPaddingRight;
      html.style.overflow = snapshot.htmlOverflow;
      html.style.overscrollBehavior = snapshot.htmlOverscrollBehavior;
    };
  }, [active]);
}
