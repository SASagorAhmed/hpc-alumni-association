/** Max words for banner-related achievement fields (admin form + API). */
export const BANNER_MAX_WORDS = 30;

export function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

/** Truncate to at most `max` words (whitespace-separated). */
export function clampToWordLimit(text: string, max: number = BANNER_MAX_WORDS): string {
  if (!text) return text;
  const trimmed = text.trim();
  if (!trimmed) return text;
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length <= max) return text;
  return words.slice(0, max).join(" ");
}
