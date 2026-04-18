type ScrollSnapshot = {
  y: number;
  sectionId?: string;
  sectionOffset?: number;
};

type AuthReturnRecord = {
  targetKey: string;
  snapshot: ScrollSnapshot;
};

const REGISTER_RETURN_STORAGE_KEY = "HPC_SCROLL:register-return";
const LOGIN_RETURN_STORAGE_KEY = "HPC_SCROLL:login-return";
const DEFAULT_KEY_PREFIX = "HPC_SCROLL:route";
const NAVBAR_SCROLL_OFFSET = 72;
const LANDING_SECTION_IDS = [
  "committee",
  "achievements",
  "notices",
  "memories",
  "academics",
  "campus",
  "community",
  "join",
  "contact",
] as const;

function resolveLandingAnchor(scrollY: number) {
  const activationY = scrollY + NAVBAR_SCROLL_OFFSET;
  let chosenId: string | undefined;
  let chosenTop = 0;
  for (const id of LANDING_SECTION_IDS) {
    const node = document.getElementById(id);
    if (!node) continue;
    const top = node.getBoundingClientRect().top + window.scrollY;
    if (top <= activationY && top >= chosenTop) {
      chosenId = id;
      chosenTop = top;
    }
  }
  if (!chosenId) return null;
  return {
    sectionId: chosenId,
    sectionOffset: Math.max(0, scrollY - chosenTop),
  };
}

function isValidSnapshot(value: unknown): value is ScrollSnapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ScrollSnapshot>;
  return typeof candidate.y === "number" && Number.isFinite(candidate.y);
}

function saveAuthBackSnapshot(storageKey: string, record: AuthReturnRecord) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(record));
  } catch {
    // ignore storage write failures
  }
}

function consumeAuthBackSnapshot(storageKey: string, targetKey: string): ScrollSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthReturnRecord>;
    if (!parsed || typeof parsed.targetKey !== "string" || !isValidSnapshot(parsed.snapshot)) {
      window.sessionStorage.removeItem(storageKey);
      return null;
    }
    if (parsed.targetKey !== targetKey) return null;
    window.sessionStorage.removeItem(storageKey);
    return parsed.snapshot;
  } catch {
    return null;
  }
}

export function captureRegisterBackSnapshot(options?: { keyPrefix?: string }) {
  if (typeof window === "undefined") return;
  const keyPrefix = options?.keyPrefix ?? DEFAULT_KEY_PREFIX;
  const routeKey = `${window.location.pathname}${window.location.search}`;
  const targetKey = `${keyPrefix}:${routeKey}`;
  const y = window.scrollY || window.pageYOffset || 0;
  const snapshot: ScrollSnapshot = { y };
  if (window.location.pathname === "/") {
    const anchor = resolveLandingAnchor(y);
    if (anchor) {
      snapshot.sectionId = anchor.sectionId;
      snapshot.sectionOffset = anchor.sectionOffset;
    }
  }
  const record: AuthReturnRecord = { targetKey, snapshot };
  saveAuthBackSnapshot(REGISTER_RETURN_STORAGE_KEY, record);
}

export function captureLoginBackSnapshot(
  targetKey: string,
  snapshot: ScrollSnapshot,
  options?: { preserveExisting?: boolean }
) {
  const landingReturnKey = `${DEFAULT_KEY_PREFIX}:/`;
  if (options?.preserveExisting && typeof window !== "undefined") {
    try {
      const raw = window.sessionStorage.getItem(LOGIN_RETURN_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AuthReturnRecord>;
        // Do not let intermediate routes (e.g. /notices/:id -> /login) replace a snapshot
        // that returns the user to landing. Always allow writes when the new target *is* landing
        // (notice click from home) so stale records or updated scroll still persist.
        if (
          typeof parsed?.targetKey === "string" &&
          isValidSnapshot(parsed.snapshot) &&
          parsed.targetKey === landingReturnKey &&
          targetKey !== landingReturnKey
        ) {
          return;
        }
      }
    } catch {
      // ignore read failures and continue with write
    }
  }
  const record: AuthReturnRecord = { targetKey, snapshot };
  saveAuthBackSnapshot(LOGIN_RETURN_STORAGE_KEY, record);
}

export function consumeRegisterBackSnapshot(targetKey: string): ScrollSnapshot | null {
  return consumeAuthBackSnapshot(REGISTER_RETURN_STORAGE_KEY, targetKey);
}

export function consumeLoginBackSnapshot(targetKey: string): ScrollSnapshot | null {
  return consumeAuthBackSnapshot(LOGIN_RETURN_STORAGE_KEY, targetKey);
}
