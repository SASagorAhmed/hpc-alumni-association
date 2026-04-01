/** Academic session labels for HSC-style passing years, e.g. 2020-2021. First year 2005 … 2050 inclusive. */
export const PASSING_SESSION_MIN = 2005;
export const PASSING_SESSION_MAX = 2050;

export function buildPassingSessionOptions(): string[] {
  const out: string[] = [];
  for (let y = PASSING_SESSION_MIN; y <= PASSING_SESSION_MAX; y += 1) {
    out.push(`${y}-${y + 1}`);
  }
  return out;
}

const OPTIONS_SET = new Set(buildPassingSessionOptions());

export function isValidPassingSession(value: string | null | undefined): boolean {
  const s = String(value ?? "").trim();
  return OPTIONS_SET.has(s);
}

/** From "2020-2021" → end year "2021" for `profiles.passing_year`. */
export function passingYearFromSession(sessionLabel: string): string | null {
  const m = String(sessionLabel ?? "").trim().match(/^(\d{4})-(\d{4})$/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b !== a + 1) return null;
  return String(b);
}
