import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, X, Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE_URL } from "@/api-production/api.js";
import { saveNavScrollRestore } from "@/lib/navScrollRestore";

interface TopNotice {
  id: string;
  title: string;
  summary: string | null;
  urgent: boolean;
}

export default function TopNoticeBar() {
  const [notice, setNotice] = useState<TopNotice | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const loadTopNotice = async () => {
      const res = await window.fetch(`${API_BASE_URL}/api/public/notices/top`, { method: "GET" });
      if (!res.ok) return;
      const data = (await res.json()) as TopNotice | null;
      if (data) setNotice(data);
    };
    loadTopNotice();
  }, []);

  if (!notice || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className={`w-full text-sm ${
          notice.urgent
            ? "bg-destructive text-destructive-foreground"
            : "bg-primary text-primary-foreground"
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-2">
          <Link
            to={`/notices/${notice.id}`}
            className="flex items-center gap-2 flex-1 min-w-0 hover:underline"
            onClick={() => saveNavScrollRestore()}
          >
            {notice.urgent ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : (
              <Bell className="w-4 h-4 shrink-0" />
            )}
            <span className="font-medium truncate">{notice.title}</span>
            {notice.summary && (
              <span className="hidden sm:inline text-xs opacity-80 truncate">
                — {notice.summary}
              </span>
            )}
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded hover:bg-white/20 transition-colors shrink-0 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
