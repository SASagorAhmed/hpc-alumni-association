/** Non-sensitive display fields only — speeds nav greeting; cleared on logout. */
const KEY = "hpc_user_display_v1";

export type UserDisplayCache = {
  id: string;
  name: string;
  photo?: string | null;
};

export function saveUserDisplayCache(user: { id: string; name: string; photo?: string | null }): void {
  try {
    const payload: UserDisplayCache = {
      id: user.id,
      name: user.name,
      photo: user.photo ?? null,
    };
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function readUserDisplayCache(): UserDisplayCache | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as UserDisplayCache;
    if (!o || typeof o.id !== "string" || typeof o.name !== "string") return null;
    return o;
  } catch {
    return null;
  }
}

export function clearUserDisplayCache(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
