/** Session key: one pending scroll restore when returning to a list/section page. */
export const NAV_SCROLL_RESTORE_KEY = "hpc:navScrollRestore";

export type NavScrollRestorePayload = { scrollY: number; fromPath: string };

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
