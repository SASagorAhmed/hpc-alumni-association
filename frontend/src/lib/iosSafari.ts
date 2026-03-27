/**
 * True for iPhone / iPod / iPad browsers (including iPadOS desktop UA).
 * Used to skip CSS `zoom` and stabilize text on WebKit touch (Safari quirks).
 */
export function isIosSafariViewport(): boolean {
  if (typeof navigator === "undefined") return false;
  if (/iPad|iPhone|iPod/i.test(navigator.userAgent)) return true;
  if (typeof navigator.platform === "string" && navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    return true;
  return false;
}
