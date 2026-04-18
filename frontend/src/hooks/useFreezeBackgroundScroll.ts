import { useLayoutEffect } from "react";
import { acquireDocumentScrollLock } from "@/lib/documentScrollLock";

/**
 * Freezes window/body scroll while a full-screen route layer is open.
 * Prevents foreground layer scrolling from mutating the background page scroll.
 */
export function useFreezeBackgroundScroll(active: boolean) {
  useLayoutEffect(() => {
    if (!active || typeof window === "undefined") return;
    return acquireDocumentScrollLock();
  }, [active]);
}
