const LEGACY_HAMDARD_COLLEGE = /Hamdard\s+Public\s+Collage/gi;

/** Canonical label for display (fixes historical "Collage" typo). */
export const HAMDARD_PUBLIC_COLLEGE = "Hamdard Public College";

function normalizeCollegeName(s: string): string {
  return s.replace(LEGACY_HAMDARD_COLLEGE, HAMDARD_PUBLIC_COLLEGE);
}

/** Committee cards / member UI: missing college → "N/A". */
export function displayCollegeName(name: string | null | undefined): string {
  const t = String(name ?? "").trim();
  if (!t) return "N/A";
  return normalizeCollegeName(t);
}

/** Profile rows: empty → null (row can be hidden). */
export function displayCollegeNameOrNull(name: string | null | undefined): string | null {
  const t = String(name ?? "").trim();
  if (!t) return null;
  return normalizeCollegeName(t);
}
