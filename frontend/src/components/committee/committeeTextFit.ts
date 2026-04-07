/** Extra px so the last glyph is never clipped (subpixels, letter-spacing, WebKit). */
export const FIT_WIDTH_SLOP_PX = 10;

/** Binary search can land slightly too large; nudge down until truly inside the box. */
export function snapDownUntilFits(el: HTMLElement, minPx: number, startPx: number): number {
  let px = Math.max(minPx, startPx);
  for (let i = 0; i < 48; i++) {
    el.style.fontSize = `${px}px`;
    if (el.scrollWidth <= el.clientWidth + FIT_WIDTH_SLOP_PX) break;
    const next = Math.max(minPx, px - 0.35);
    if (next >= px) break;
    px = next;
  }
  el.style.fontSize = `${px}px`;
  return px;
}

/** Largest font size in [minPx, maxPx] so one line fits (no wrapping). */
export function fitLargestFontSingleLine(el: HTMLElement, minPx: number, maxPx: number): number {
  el.style.fontSize = `${maxPx}px`;
  if (el.scrollWidth <= el.clientWidth + FIT_WIDTH_SLOP_PX) {
    return snapDownUntilFits(el, minPx, maxPx);
  }

  let lo = minPx;
  let hi = maxPx;
  let best = minPx;
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    el.style.fontSize = `${mid}px`;
    if (el.scrollWidth <= el.clientWidth + FIT_WIDTH_SLOP_PX) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  const px = Math.max(minPx, best);
  el.style.fontSize = `${px}px`;
  return snapDownUntilFits(el, minPx, px);
}

export function setOverflowSingleLineFit(el: HTMLElement) {
  el.style.overflow = "visible";
}
