/** Per-notice read state in localStorage (per logged-in user). */
function storageKey(userId: string | undefined | null): string {
  return userId ? `hpc_notifications_read_v1:${userId}` : `hpc_notifications_read_v1:anon`;
}

export function loadReadNoticeIds(userId?: string | null): Set<string> {
  const key = storageKey(userId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    /* ignore */
  }
  return new Set();
}

export function saveReadNoticeIds(userId: string | undefined | null, ids: Set<string>): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

export function markNoticeAsRead(userId: string | undefined | null, id: string): Set<string> {
  const next = loadReadNoticeIds(userId);
  next.add(id);
  saveReadNoticeIds(userId, next);
  return next;
}

export function countUnreadNotices(noticeIds: string[], readIds: Set<string>): number {
  return noticeIds.filter((nid) => nid && !readIds.has(nid)).length;
}

/** Exact localStorage key for storage-event sync across tabs. */
export function readNoticeStateStorageKey(userId: string | undefined | null): string {
  return storageKey(userId);
}
