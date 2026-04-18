const LANDING_NAV_INTENT_TTL_MS = 1_500;
let pendingTargetHref: string | null = null;
let pendingIntentExpiresAt = 0;

export function clearLandingNavIntent() {
  pendingTargetHref = null;
  pendingIntentExpiresAt = 0;
}

export function setLandingNavIntent(targetHref: string) {
  pendingTargetHref = targetHref;
  pendingIntentExpiresAt = Date.now() + LANDING_NAV_INTENT_TTL_MS;
}

export function hasFreshLandingNavIntent() {
  if (!pendingTargetHref) return false;
  if (Date.now() > pendingIntentExpiresAt) {
    clearLandingNavIntent();
    return false;
  }
  return true;
}

export function consumeFreshLandingNavTarget(): string | null {
  if (!hasFreshLandingNavIntent()) return null;
  const href = pendingTargetHref;
  clearLandingNavIntent();
  if (typeof href !== "string" || href.length === 0) return null;
  return href;
}

export function shouldSkipLandingRestore(): boolean {
  return hasFreshLandingNavIntent();
}
