import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "@/api-production/api.js";

export const ACHIEVEMENT_BANNER_QUERY_KEY = ["achievement-banner"] as const;

export interface Achievement {
  id: string;
  name: string;
  batch: string | null;
  photo_url: string | null;
  achievement_title: string;
  institution: string | null;
  message: string | null;
  tag: string | null;
  is_pinned: boolean;
  banner_photo_batch_text?: string | null;
  banner_photo_tagline?: string | null;
  banner_congratulations_text?: string | null;
  banner_theme?: "default" | "theme2" | "theme3" | null;
  start_date?: string | null;
  end_date?: string | null;
}

export interface AchievementBannerSettings {
  banner_enabled: boolean;
  slide_duration: number;
  max_display_count: number | null;
  banner_theme?: "default" | "theme2" | "theme3";
}

const ACHIEVEMENT_BANNER_CACHE_KEY = "hpc:achievement-banner-cache";

function parseAchievementWindowDate(
  raw: string | null | undefined,
  _field: "start_date" | "end_date",
  _id: string
): number | null {
  const value = raw?.trim();
  if (!value) return null;
  const ms = Date.parse(value);
  if (Number.isFinite(ms)) return ms;
  return Number.NaN;
}

/** MySQL / JSON may send 0/1; ignore error-shaped bodies */
function normalizeAchievementSettings(raw: unknown): AchievementBannerSettings | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if ("ok" in o && (o as { ok?: boolean }).ok === false) return null;
  if (!("banner_enabled" in o)) return null;
  const be = o.banner_enabled;
  const banner_enabled = be === true || be === 1 || be === "1";
  const sd = Number(o.slide_duration);
  const slide_duration = Number.isFinite(sd) && sd > 0 ? sd : 4;
  const mdc = o.max_display_count;
  let max_display_count: number | null = null;
  if (mdc !== null && mdc !== undefined && mdc !== "") {
    const n = Number(mdc);
    if (Number.isFinite(n)) max_display_count = n;
  }
  const rawBt = (o as { banner_theme?: unknown }).banner_theme;
  const themeRaw =
    typeof rawBt === "string"
      ? rawBt.trim().toLowerCase()
      : rawBt != null && rawBt !== ""
        ? String(rawBt).trim().toLowerCase()
        : "";
  const banner_theme: "default" | "theme2" | "theme3" =
    themeRaw === "theme2" || themeRaw === "tomato"
      ? "theme2"
      : themeRaw === "theme3"
        ? "theme3"
        : "default";
  return { banner_enabled, slide_duration, max_display_count, banner_theme };
}

export async function fetchAchievementBannerData(): Promise<{
  settings: AchievementBannerSettings;
  achievements: Achievement[];
}> {
  const [settingsRes, achRes] = await Promise.all([
    fetch(`${API_BASE_URL}/api/public/achievement-settings`),
    fetch(`${API_BASE_URL}/api/public/achievements?active=true`),
  ]);
  const settingsRaw = settingsRes.ok ? await settingsRes.json().catch(() => null) : null;
  const normalized = normalizeAchievementSettings(settingsRaw);
  const fallbackSettings: AchievementBannerSettings = {
    banner_enabled: true,
    slide_duration: 4,
    max_display_count: null,
  };
  const settings = normalized ?? fallbackSettings;

  const achData = achRes.ok ? await achRes.json().catch(() => []) : [];
  let achievements: Achievement[] = [];
  if (Array.isArray(achData)) {
    const nowMs = Date.now();
    const filtered = (achData as Achievement[]).filter((a) => {
      const startMs = parseAchievementWindowDate(a.start_date, "start_date", a.id);
      if (startMs !== null) {
        if (!Number.isFinite(startMs)) return false;
        // Inclusive start boundary.
        if (nowMs < startMs) return false;
      }
      const endMs = parseAchievementWindowDate(a.end_date, "end_date", a.id);
      if (endMs !== null) {
        if (!Number.isFinite(endMs)) return false;
        // Hide strictly after end boundary.
        if (nowMs > endMs) return false;
      }
      return true;
    });
    const eff = settings;
    achievements =
      eff.max_display_count != null && eff.max_display_count > 0
        ? filtered.slice(0, eff.max_display_count)
        : filtered;
  }
  return { settings, achievements };
}

function readCachedBannerData():
  | {
      settings: AchievementBannerSettings;
      achievements: Achievement[];
    }
  | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.sessionStorage.getItem(ACHIEVEMENT_BANNER_CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<{
      settings: AchievementBannerSettings;
      achievements: Achievement[];
    }>;
    if (!parsed || !parsed.settings || !Array.isArray(parsed.achievements)) return undefined;
    return {
      settings: parsed.settings,
      achievements: parsed.achievements,
    };
  } catch {
    return undefined;
  }
}

function writeCachedBannerData(data: {
  settings: AchievementBannerSettings;
  achievements: Achievement[];
}): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ACHIEVEMENT_BANNER_CACHE_KEY, JSON.stringify(data));
  } catch {
    // ignore cache write failure
  }
}

export function useAchievementBannerData(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ACHIEVEMENT_BANNER_QUERY_KEY,
    queryFn: fetchAchievementBannerData,
    // Longer stability window avoids frequent top-of-page banner reshapes.
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
    initialData: readCachedBannerData,
    onSuccess: (data) => {
      writeCachedBannerData(data);
    },
    enabled: options?.enabled !== false,
  });
}
