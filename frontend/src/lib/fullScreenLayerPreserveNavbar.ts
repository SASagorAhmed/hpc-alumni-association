import type { Location } from "react-router-dom";

/**
 * Layered detail routes reserve a top strip for the global landing navbar only when
 * the frozen background is the home page. Dashboard and other shells have no landing nav;
 * a full-bleed overlay avoids showing frozen dashboard chrome in that gap.
 */
export function preserveTopNavbarForBackground(background: Location | undefined | null): boolean {
  return Boolean(background && background.pathname === "/");
}
