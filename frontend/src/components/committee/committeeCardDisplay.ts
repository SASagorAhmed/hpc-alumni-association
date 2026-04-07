/** Full / short helpers for committee cards: prefer **full**; use short only when measurement says it does not fit (see `committeeAdaptiveCardText.tsx`). */

export function fullNameForCard(m: { name: string }): string {
  return m.name;
}

export function shortNameForCard(m: { name_short?: string | null }): string | null {
  const s = m.name_short != null ? String(m.name_short).trim() : "";
  return s || null;
}

export function fullInstitutionForCard(m: { institution: string | null }): string {
  const s = m.institution != null ? String(m.institution).trim() : "";
  return s || "N/A";
}

export function shortInstitutionForCard(m: { institution_short?: string | null }): string | null {
  const s = m.institution_short != null ? String(m.institution_short).trim() : "";
  return s || null;
}
