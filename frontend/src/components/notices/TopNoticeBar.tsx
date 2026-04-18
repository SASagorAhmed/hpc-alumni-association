import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, X, Bell } from "lucide-react";
import { API_BASE_URL } from "@/api-production/api.js";

interface TopNotice {
  id: string;
  title: string;
  summary: string | null;
  urgent: boolean;
}

const TOP_NOTICE_CACHE_KEY = "hpc:top-notice-cache";
const TOP_NOTICE_DISMISSED_IDS_KEY = "hpc:top-notice-dismissed-ids";

function readCachedTopNotice(): TopNotice | null {
  try {
    const raw = sessionStorage.getItem(TOP_NOTICE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TopNotice>;
    if (!parsed || typeof parsed.id !== "string" || typeof parsed.title !== "string") return null;
    return {
      id: parsed.id,
      title: parsed.title,
      summary: typeof parsed.summary === "string" ? parsed.summary : null,
      urgent: parsed.urgent === true,
    };
  } catch {
    return null;
  }
}

function writeCachedTopNotice(notice: TopNotice | null): void {
  try {
    if (!notice) {
      sessionStorage.removeItem(TOP_NOTICE_CACHE_KEY);
      return;
    }
    sessionStorage.setItem(TOP_NOTICE_CACHE_KEY, JSON.stringify(notice));
  } catch {
    /* ignore */
  }
}

function readDismissedIds(): string[] {
  try {
    const raw = sessionStorage.getItem(TOP_NOTICE_DISMISSED_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

function writeDismissedIds(ids: string[]): void {
  try {
    sessionStorage.setItem(TOP_NOTICE_DISMISSED_IDS_KEY, JSON.stringify(ids.slice(-30)));
  } catch {
    /* ignore */
  }
}

export default function TopNoticeBar() {
  const [notice, setNotice] = useState<TopNotice | null>(() => readCachedTopNotice());
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => readDismissedIds());

  useEffect(() => {
    const loadTopNotice = async () => {
      const res = await window.fetch(`${API_BASE_URL}/api/public/notices/top`, { method: "GET" });
      if (!res.ok) return;
      const data = (await res.json()) as TopNotice | null;
      setNotice(data);
      writeCachedTopNotice(data);
    };
    loadTopNotice();
  }, []);

  const dismissed = notice ? dismissedIds.includes(notice.id) : false;

  if (!notice || dismissed) return null;

  return (
    <div
      className={`w-full fs-notice-bar ${
        notice.urgent
          ? "bg-destructive text-destructive-foreground"
          : "bg-blue-600 text-white"
      }`}
    >
      <div className="flex w-full items-center justify-between px-2.5 py-2 sm:px-3 lg:px-4">
        <Link
          to={`/notices/${notice.id}`}
          className="flex items-center gap-2 flex-1 min-w-0 hover:underline"
        >
          {notice.urgent ? (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          ) : (
            <Bell className="w-4 h-4 shrink-0" />
          )}
          <span className="font-medium truncate">{notice.title}</span>
          {notice.summary && (
            <span className="hidden sm:inline fs-notice-bar-secondary opacity-80 truncate">
              — {notice.summary}
            </span>
          )}
        </Link>
        <button
          onClick={() => {
            if (!notice) return;
            setDismissedIds((prev) => {
              if (prev.includes(notice.id)) return prev;
              const next = [...prev, notice.id];
              writeDismissedIds(next);
              return next;
            });
          }}
          className="p-1 rounded hover:bg-white/20 transition-colors shrink-0 ml-2"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
