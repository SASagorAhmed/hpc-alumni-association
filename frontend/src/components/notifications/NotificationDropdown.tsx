import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Pin, AlertTriangle, FileText, Megaphone, Info, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminNotificationRoutes } from "@/contexts/AdminViewAsAlumniContext";
import { API_BASE_URL } from "@/api-production/api.js";

interface Notice {
  id: string;
  title: string;
  summary: string | null;
  notice_type: string | null;
  urgent: boolean | null;
  pinned: boolean | null;
  created_at: string | null;
}

const LAST_SEEN_KEY = "hpc_notifications_last_seen";

const getNoticeIcon = (type: string | null) => {
  switch (type) {
    case "urgent":
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    case "announcement":
      return <Megaphone className="w-4 h-4 text-blue-500" />;
    case "document":
      return <FileText className="w-4 h-4 text-amber-500" />;
    default:
      return <Info className="w-4 h-4 text-emerald-500" />;
  }
};

type NotificationDropdownProps = {
  /** Smaller trigger for compact headers (e.g. dashboard top bar) */
  compact?: boolean;
};

const NotificationDropdown = ({ compact }: NotificationDropdownProps) => {
  const [open, setOpen] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = useAdminNotificationRoutes(user);

  const getLastSeen = () => {
    const stored = localStorage.getItem(LAST_SEEN_KEY);
    return stored ? new Date(stored) : new Date(0);
  };

  const fetchNotices = async () => {
    setLoading(true);
    const res = await fetch(`${API_BASE_URL}/api/public/notices?limit=10`, { method: "GET" });
    const data = (await res.json()) as Notice[];

    setNotices(Array.isArray(data) ? data : []);
    const lastSeen = getLastSeen();
    const count = (Array.isArray(data) ? data : []).filter(
      (n) => n.created_at && new Date(n.created_at) > lastSeen
    ).length;
    setUnreadCount(count);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleOpen = () => {
    setOpen((prev) => {
      if (!prev) {
        // Mark as seen
        localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
        setUnreadCount(0);
        fetchNotices();
      }
      return !prev;
    });
  };

  const getRouteForNotice = (notice: Notice): string => {
    const prefix = isAdmin ? "/admin" : "";
    const typeRoutes: Record<string, string> = {
      election: `${prefix}/elections`,
      event: `${prefix}/events`,
      donation: `${prefix}/donations`,
      committee: `${prefix}/committee`,
      document: `${prefix}/documents`,
    };
    return typeRoutes[notice.notice_type || ""] || (isAdmin ? "/admin/notices" : `/notices/${notice.id}`);
  };

  const handleItemClick = (notice: Notice) => {
    setOpen(false);
    navigate(getRouteForNotice(notice));
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate(isAdmin ? "/admin/notices" : "/notices");
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className={`relative transition-colors hover:bg-white/10 ${compact ? "rounded p-0.5" : "rounded-lg p-2"}`}
        title="Notifications"
      >
        <Bell className={`text-white ${compact ? "h-3.5 w-3.5" : "h-5 w-5"}`} />
        {unreadCount > 0 && (
          <span
            className={`absolute flex items-center justify-center rounded-full bg-red-500 font-bold text-white shadow-sm animate-in zoom-in-50 ${
              compact
                ? "-right-px -top-px h-3 min-w-3 px-px text-[7px] leading-none"
                : "-right-0.5 -top-0.5 h-[18px] min-w-[18px] px-1 text-[10px]"
            }`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-border bg-muted/50">
              <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Latest announcements & notices</p>
            </div>

            {/* List */}
            <div className="max-h-[340px] overflow-y-auto divide-y divide-border">
              {loading ? (
                <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                  Loading…
                </div>
              ) : notices.length === 0 ? (
                <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                  No notifications yet
                </div>
              ) : (
                notices.map((notice) => {
                  const isNew = notice.created_at && new Date(notice.created_at) > getLastSeen();
                  return (
                    <button
                      key={notice.id}
                      onClick={() => handleItemClick(notice)}
                      className="w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors flex items-start gap-3 group"
                    >
                      {/* Icon */}
                      <div className="mt-0.5 shrink-0">
                        {getNoticeIcon(notice.notice_type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-semibold text-foreground truncate block">
                            {notice.title}
                          </span>
                          {notice.urgent && (
                            <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold uppercase bg-red-100 text-red-600 rounded">
                              Urgent
                            </span>
                          )}
                          {notice.pinned && (
                            <Pin className="w-3 h-3 text-amber-500 shrink-0" />
                          )}
                        </div>
                        {notice.summary && (
                          <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">
                            {notice.summary}
                          </p>
                        )}
                        {notice.created_at && (
                          <span className="text-[11px] text-muted-foreground/70 mt-1 block">
                            {formatDistanceToNow(new Date(notice.created_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border">
              <button
                onClick={handleViewAll}
                className="w-full text-center px-4 py-2.5 text-[13px] font-medium text-primary hover:bg-accent/50 transition-colors"
              >
                View All Notices
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationDropdown;
