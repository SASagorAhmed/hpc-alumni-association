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
    const now = new Date().toISOString();
    const filtered = (achData as Achievement[]).filter((a) => {
      if (a.start_date && a.start_date > now) return false;
      if (a.end_date && a.end_date < now) return false;
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

export function useAchievementBannerData(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ACHIEVEMENT_BANNER_QUERY_KEY,
    queryFn: fetchAchievementBannerData,
    staleTime: 1000 * 60 * 5,
    enabled: options?.enabled !== false,
  });
}
