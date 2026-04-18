/** Full / short helpers for committee cards: prefer **full**; use short only when measurement says it does not fit (see `committeeAdaptiveCardText.tsx`). */

export function fullNameForCard(m: { name: string }): string {
  return m.name;
}

export function shortNameForCard(m: { name?: string | null; name_short?: string | null; nickname?: string | null }): string | null {
  const s =
    (m.name_short != null ? String(m.name_short).trim() : "") ||
    (m.nickname != null ? String(m.nickname).trim() : "");
  return s || null;
}

export function fullInstitutionForCard(m: { institution: string | null }): string {
  const s = m.institution != null ? String(m.institution).trim() : "";
  return s || "N/A";
}

export function shortInstitutionForCard(m: {
  institution?: string | null;
  institution_short?: string | null;
  universityShortName?: string | null;
  university_short_name?: string | null;
}): string | null {
  const s =
    (m.institution_short != null ? String(m.institution_short).trim() : "") ||
    (m.universityShortName != null ? String(m.universityShortName).trim() : "") ||
    (m.university_short_name != null ? String(m.university_short_name).trim() : "");
  return s || null;
}
