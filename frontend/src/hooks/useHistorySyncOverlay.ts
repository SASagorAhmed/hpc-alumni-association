import { useEffect, useRef } from "react";

const OVERLAY_KEY = "__hpcOverlay";

type OverlayHistoryState = { [OVERLAY_KEY]?: string };

/**
 * Pushes a same-URL history entry while `active` so the first system “back”
 * (Android gesture / button, some mobile browsers) closes the overlay via
 * `popstate` instead of leaving the page. Closing via UI removes the entry in
 * cleanup. Uses a unique token per open so nested overlays behave correctly.
 */
export function useHistorySyncOverlay(active: boolean, onRequestClose: () => void): void {
  const onRequestCloseRef = useRef(onRequestClose);
  onRequestCloseRef.current = onRequestClose;

  useEffect(() => {
    if (!active) return;

    const token =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    const state: OverlayHistoryState = { [OVERLAY_KEY]: token };
    window.history.pushState(state, "", window.location.href);

    const onPopState = () => {
      onRequestCloseRef.current();
    };

    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
      const current = window.history.state as OverlayHistoryState | null;
      if (current?.[OVERLAY_KEY] === token) {
        window.history.back();
      }
    };
  }, [active]);
}
