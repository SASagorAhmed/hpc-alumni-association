/**
 * Canonical viewport bands (px):
 * - Narrow reference (banner card zoom): 330 design width — not a global breakpoint
 * - Mobile: 1–630 (stacked banner, mobile grids, mobile nav)
 * - Tablet: 631–1024 (same layout class as desktop for main site chrome)
 * - Desktop: 1025–1440
 * - Large desktop: 1441+
 */
export const BREAKPOINT_NARROW_REF = 330;

export const BREAKPOINT_MOBILE_MAX = 630;

export const BREAKPOINT_TABLET_MIN = 631;
export const BREAKPOINT_TABLET_MAX = 1024;

/** Committee page: stack mobile member cards below this width (fluid proportional layout). */
export const COMMITTEE_MOBILE_STACK_MAX = 680;

export const BREAKPOINT_DESKTOP_MIN = 1025;
export const BREAKPOINT_DESKTOP_MAX = 1440;

export const BREAKPOINT_LARGE_MIN = 1441;

/** Mobile / stacked layouts (achievement banner, achievement grid narrow mode, etc.). */
export const mqStackedMobile = `(max-width: ${BREAKPOINT_MOBILE_MAX}px)`;

/** Tablet band only — keep string literal separate from desktop queries in components. */
export const mqTabletRange = `(min-width: ${BREAKPOINT_TABLET_MIN}px) and (max-width: ${BREAKPOINT_TABLET_MAX}px)`;

/** Desktop primary band only — separate from `mqTabletRange`; same layout intent, distinct MQ. */
export const mqDesktopRange = `(min-width: ${BREAKPOINT_DESKTOP_MIN}px) and (max-width: ${BREAKPOINT_DESKTOP_MAX}px)`;

/** Desktop and larger screens (1025px+); matches tablet layout for banner / scaled sections. */
export const mqDesktopMin = `(min-width: ${BREAKPOINT_DESKTOP_MIN}px)`;

/** Large desktop and up */
export const mqLargeMin = `(min-width: ${BREAKPOINT_LARGE_MIN}px)`;

/** Mobile + tablet combined (viewport ≤1024). */
export const mqBelowDesktop = `(max-width: ${BREAKPOINT_TABLET_MAX}px)`;

/** Main column max width: matches desktop band so 1440px “PC” layout is the reference on large monitors. */
export const LAYOUT_CONTAINER_MAX_PX = BREAKPOINT_DESKTOP_MAX;

/**
 * Scale a fixed “design canvas” to the container. Below 1 shrinks; above 1 grows on wide screens (1440+),
 * preserving the same proportions as the PC composition.
 */
export function layoutCanvasScale(containerWidth: number, designWidth: number): number {
  if (!Number.isFinite(containerWidth) || !Number.isFinite(designWidth) || designWidth <= 0) return 1;
  return containerWidth / designWidth;
}
