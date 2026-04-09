import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bell,
  Pin,
  AlertTriangle,
  FileText,
  Megaphone,
  Info,
  ChevronRight,
  Users,
  ShieldAlert,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminNotificationRoutes } from "@/contexts/AdminViewAsAlumniContext";
import { API_BASE_URL } from "@/api-production/api.js";
import { getAuthToken } from "@/lib/authToken";
import { cn } from "@/lib/utils";

// ─── Shared types ────────────────────────────────────────────────────────────

interface NoticeItem {
  id: string;
  title: string;
  summary: string | null;
  notice_type: string | null;
  urgent: boolean | null;
  pinned: boolean | null;
  created_at: string | null;
  is_read: boolean | number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getNoticeIcon(type: string | null) {
  switch (type) {
    case "urgent":
      return <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />;
    case "announcement":
      return <Megaphone className="h-4 w-4 text-blue-500 dark:text-blue-400" />;
    case "document":
      return <FileText className="h-4 w-4 text-amber-500 dark:text-amber-400" />;
    default:
      return <Info className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />;
  }
}

// ─── Admin panel ─────────────────────────────────────────────────────────────

interface AdminPanelData {
  notices: NoticeItem[];
  pending_users: number;
}

function AdminNotificationPanel({
  onClose,
  onNavigate,
}: {
  onClose: () => void;
  onNavigate: (path: string) => void;
}) {
  const [data, setData] = useState<AdminPanelData>({ notices: [], pending_users: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch$ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/notifications?limit=10`, {
        headers: authHeaders(),
      });
      const raw = await res.json().catch(() => null);
      if (!res.ok) {
        setError(raw?.error || `Error ${res.status}`);
        return;
      }
      setData({
        notices: Array.isArray(raw?.notices) ? raw.notices : [],
        pending_users: Number(raw?.pending_users ?? 0),
      });
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch$(); }, [fetch$]);

  const markOneRead = useCallback(async (id: string) => {
    await fetch(`${API_BASE_URL}/api/admin/notifications/notices/${id}/read`, {
      method: "POST",
      headers: authHeaders(),
    }).catch(() => {});
    setData((prev) => ({
      ...prev,
      notices: prev.notices.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    }));
  }, []);

  const markAllRead = useCallback(async () => {
    await fetch(`${API_BASE_URL}/api/admin/notifications/notices/read-all`, {
      method: "POST",
      headers: authHeaders(),
    }).catch(() => {});
    setData((prev) => ({
      ...prev,
      notices: prev.notices.map((n) => ({ ...n, is_read: true })),
    }));
  }, []);

  const unreadNotices = data.notices.filter((n) => !n.is_read).length;
  const totalBadge = unreadNotices + (data.pending_users > 0 ? 1 : 0);

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-border bg-muted/50 px-4 py-3">
        <div>
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Admin Notifications</h3>
            {totalBadge > 0 && (
              <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[9px] font-bold leading-none text-destructive-foreground">
                {totalBadge}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Pending actions &amp; admin notices
          </p>
        </div>
        {unreadNotices > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-primary hover:bg-accent"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-[min(380px,72dvh)] divide-y divide-border overflow-y-auto">
        {/* Pending users banner */}
        {data.pending_users > 0 && (
          <button
            type="button"
            onClick={() => { onClose(); onNavigate("/admin/users"); }}
            className="group flex w-full items-center gap-3 bg-amber-50 px-4 py-3 text-left transition-colors hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-900/40"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
              <Users className="h-4 w-4 text-amber-700 dark:text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-amber-900 dark:text-amber-200">
                {data.pending_users} profile{data.pending_users !== 1 ? "s" : ""} pending review
              </p>
              <p className="mt-0.5 text-[11px] text-amber-700/80 dark:text-amber-400/80">
                Click to open Users → review &amp; approve
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-amber-600/50 opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        )}

        {/* Admin-targeted notices */}
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : error ? (
          <div className="space-y-2 px-4 py-6 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <button type="button" onClick={fetch$} className="text-xs font-medium text-primary hover:underline">
              Retry
            </button>
          </div>
        ) : data.notices.length === 0 && data.pending_users === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No unread admin notices or pending actions.
          </div>
        ) : data.notices.length === 0 ? null : (
          data.notices.map((notice) => {
            const unread = !notice.is_read;
            return (
              <button
                key={notice.id}
                type="button"
                onClick={async () => {
                  await markOneRead(notice.id);
                  onClose();
                  onNavigate(`/admin/notices`);
                }}
                className={cn(
                  "group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50",
                  unread && "bg-primary/[0.06]"
                )}
              >
                <div className="relative mt-0.5 shrink-0">
                  {getNoticeIcon(notice.notice_type)}
                  {unread && (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {unread && <span className="sr-only">Unread.</span>}
                    <span className="block truncate text-[13px] font-semibold text-foreground">{notice.title}</span>
                    {notice.urgent && (
                      <span className="shrink-0 rounded bg-destructive/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-destructive">
                        Urgent
                      </span>
                    )}
                    {notice.pinned && <Pin className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />}
                  </div>
                  {notice.summary && (
                    <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">{notice.summary}</p>
                  )}
                  {notice.created_at && (
                    <span className="mt-1 block text-[11px] text-muted-foreground/80">
                      {formatDistanceToNow(new Date(notice.created_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
        <button
          type="button"
          onClick={() => { onClose(); onNavigate("/admin/users"); }}
          className="py-2.5 text-center text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
        >
          Users
        </button>
        <button
          type="button"
          onClick={() => { onClose(); onNavigate("/admin/notices"); }}
          className="py-2.5 text-center text-[12px] font-medium text-primary transition-colors hover:bg-accent/50"
        >
          All Notices
        </button>
      </div>
    </>
  );
}

// ─── Alumni panel ─────────────────────────────────────────────────────────────

function AlumniNotificationPanel({
  onClose,
  onNavigate,
}: {
  onClose: () => void;
  onNavigate: (path: string) => void;
}) {
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch$ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/alumni/notices?limit=10`, {
        headers: authHeaders(),
      });
      const raw = await res.json().catch(() => null);
      if (!res.ok) {
        setError(raw?.error || `Error ${res.status}`);
        setNotices([]);
        return;
      }
      setNotices(Array.isArray(raw) ? raw : []);
    } catch {
      setError("Network error");
      setNotices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch$(); }, [fetch$]);

  const markOneRead = useCallback(async (id: string) => {
    await fetch(`${API_BASE_URL}/api/alumni/notices/${id}/read`, {
      method: "POST",
      headers: authHeaders(),
    }).catch(() => {});
    setNotices((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }, []);

  const markAllRead = useCallback(async () => {
    await fetch(`${API_BASE_URL}/api/alumni/notices/read-all`, {
      method: "POST",
      headers: authHeaders(),
    }).catch(() => {});
    setNotices((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, []);

  const unread = notices.filter((n) => !n.is_read).length;

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-border bg-muted/50 px-4 py-3">
        <div>
          <div className="flex items-center gap-1.5">
            <Bell className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {unread > 0
              ? `${unread} unread — click a notice to open & mark read`
              : "All caught up! No unread notices."}
          </p>
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-primary hover:bg-accent"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-[min(340px,70dvh)] divide-y divide-border overflow-y-auto">
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : error ? (
          <div className="space-y-2 px-4 py-6 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <button type="button" onClick={fetch$} className="text-xs font-medium text-primary hover:underline">
              Retry
            </button>
          </div>
        ) : notices.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No published notices yet. Check back soon.
          </div>
        ) : (
          notices.map((notice) => {
            const isUnread = !notice.is_read;
            return (
              <button
                key={notice.id}
                type="button"
                onClick={async () => {
                  await markOneRead(notice.id);
                  onClose();
                  onNavigate(`/notices/${notice.id}`);
                }}
                className={cn(
                  "group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50",
                  isUnread && "bg-primary/[0.06]"
                )}
              >
                <div className="relative mt-0.5 shrink-0">
                  {getNoticeIcon(notice.notice_type)}
                  {isUnread && (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {isUnread && <span className="sr-only">Unread.</span>}
                    <span className="block truncate text-[13px] font-semibold text-foreground">{notice.title}</span>
                    {notice.urgent && (
                      <span className="shrink-0 rounded bg-destructive/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-destructive">
                        Urgent
                      </span>
                    )}
                    {notice.pinned && <Pin className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />}
                  </div>
                  {notice.summary && (
                    <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">{notice.summary}</p>
                  )}
                  {notice.created_at && (
                    <span className="mt-1 block text-[11px] text-muted-foreground/80">
                      {formatDistanceToNow(new Date(notice.created_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            );
          })
        )}
      </div>

      <div className="border-t border-border">
        <button
          type="button"
          onClick={() => { onClose(); onNavigate("/notices"); }}
          className="w-full px-4 py-2.5 text-center text-[13px] font-medium text-primary transition-colors hover:bg-accent/50"
        >
          View All Notices
        </button>
      </div>
    </>
  );
}

// ─── Main wrapper (badge + portal) ───────────────────────────────────────────

type NotificationDropdownProps = {
  compact?: boolean;
};

const NotificationDropdown = ({ compact }: NotificationDropdownProps) => {
  const [open, setOpen] = useState(false);
  const [badgeCount, setBadgeCount] = useState(0);
  const [panelStyle, setPanelStyle] = useState<{ top: number; right: number }>({ top: 0, right: 12 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = useAdminNotificationRoutes(user);

  /** Polling badge count from the appropriate endpoint without opening the panel. */
  const refreshBadge = useCallback(async () => {
    try {
      if (isAdmin) {
        const res = await fetch(`${API_BASE_URL}/api/admin/notifications?limit=10`, {
          headers: authHeaders(),
        });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        const notices: NoticeItem[] = Array.isArray(data?.notices) ? data.notices : [];
        const unreadNotices = notices.filter((n) => !n.is_read).length;
        const pendingUsers = Number(data?.pending_users ?? 0);
        setBadgeCount(unreadNotices + (pendingUsers > 0 ? 1 : 0));
      } else {
        const res = await fetch(`${API_BASE_URL}/api/alumni/notices/unread-count`, {
          headers: authHeaders(),
        });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        setBadgeCount(Number(data?.unread ?? 0));
      }
    } catch {
      // silent
    }
  }, [isAdmin]);

  useEffect(() => {
    refreshBadge();
  }, [refreshBadge]);

  useEffect(() => {
    const onFocus = () => refreshBadge();
    const onVis = () => { if (document.visibilityState === "visible") refreshBadge(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refreshBadge]);

  const updatePanelPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPanelStyle({
      top: rect.bottom + 8,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
    window.addEventListener("scroll", updatePanelPosition, true);
    window.addEventListener("resize", updatePanelPosition);
    return () => {
      window.removeEventListener("scroll", updatePanelPosition, true);
      window.removeEventListener("resize", updatePanelPosition);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const handleClose = useCallback(() => {
    setOpen(false);
    // Refresh badge after closing so count reflects any reads done inside panel
    setTimeout(refreshBadge, 300);
  }, [refreshBadge]);

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  const displayCount = badgeCount > 99 ? "99+" : String(badgeCount);

  const dropdown =
    open &&
    createPortal(
      <motion.div
        ref={panelRef}
        initial={{ opacity: 0, y: -8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.96 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        style={{
          position: "fixed",
          top: panelStyle.top,
          right: panelStyle.right,
          zIndex: 9999,
        }}
        className="w-[min(100vw-1rem,24rem)] overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xl sm:w-96"
      >
        {isAdmin ? (
          <AdminNotificationPanel onClose={handleClose} onNavigate={handleNavigate} />
        ) : (
          <AlumniNotificationPanel onClose={handleClose} onNavigate={handleNavigate} />
        )}
      </motion.div>,
      document.body
    );

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "relative rounded-md transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
          compact ? "p-1" : "p-2",
          badgeCount > 0 && "ring-2 ring-amber-400/90 ring-offset-2 ring-offset-black/40"
        )}
        title={badgeCount > 0 ? `Notifications — ${badgeCount} unread` : "Notifications"}
        aria-label={badgeCount > 0 ? `Notifications, ${badgeCount} unread` : "Notifications, no unread"}
      >
        <Bell className={cn("shrink-0 text-white drop-shadow-sm", compact ? "h-[18px] w-[18px]" : "h-5 w-5")} />
        {badgeCount > 0 ? (
          <span
            className={cn(
              "absolute flex items-center justify-center rounded-full bg-destructive font-bold text-destructive-foreground shadow-md ring-2 ring-white/30",
              compact
                ? "-right-1 -top-1 h-4 min-w-4 px-0.5 text-[9px] leading-none"
                : "-right-0.5 -top-0.5 min-h-[18px] min-w-[18px] px-1 text-[10px]"
            )}
          >
            {displayCount}
          </span>
        ) : null}
      </button>
      {dropdown}
    </div>
  );
};

export default NotificationDropdown;
