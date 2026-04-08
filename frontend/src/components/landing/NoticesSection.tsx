import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Megaphone, ArrowRight, Pin, AlertTriangle, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { API_BASE_URL } from "@/api-production/api.js";

type PublicNotice = {
  id: string;
  title: string;
  summary: string | null;
  content: string | null;
  notice_type: string | null;
  urgent?: boolean | number | null;
  pinned?: boolean | number | null;
  image_url?: string | null;
  created_at: string | null;
};

interface Props {
  content?: Record<string, unknown>;
}

const NoticesSection = ({ content }: Props) => {
  const [items, setItems] = useState<PublicNotice[]>([]);
  const [loading, setLoading] = useState(true);

  const sectionLabel = (content?.sectionLabel as string) || "ANNOUNCEMENTS";
  const heading = (content?.heading as string) || "Latest notices";
  const description =
    (content?.description as string) ||
    "Official updates from the association. Notices marked “Public” in the admin panel appear here for everyone.";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/public/notices?limit=6&landing=1`, { method: "GET" });
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as PublicNotice[];
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isUrgent = (n: PublicNotice) => Boolean(n.urgent);
  const isPinned = (n: PublicNotice) => Boolean(n.pinned);

  return (
    <section id="notices" className="relative border-t border-border/60 bg-muted/15 py-14 md:py-16">
      <div className="layout-container">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="max-w-2xl">
            <p className="fs-eyebrow mb-2 font-semibold tracking-wider text-primary">{sectionLabel}</p>
            <h2 className="fs-title mb-3 font-bold tracking-tight text-foreground">{heading}</h2>
            <p className="fs-body text-pretty text-justify text-muted-foreground hyphens-auto">{description}</p>
          </div>
          <Link
            to="/notices"
            className="fs-button-text inline-flex shrink-0 items-center gap-2 self-start rounded-md border border-border bg-card px-4 py-2.5 font-semibold text-primary shadow-sm transition-all hover:border-primary/40 hover:bg-muted/50 sm:self-auto"
          >
            View all notices
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </motion.div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-xl border border-border bg-muted/40" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
            <Megaphone className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden />
            <p className="fs-ui font-medium text-foreground">No public notices yet</p>
            <p className="mt-1 fs-ui text-muted-foreground">
              When administrators publish a notice with audience <span className="font-medium text-foreground">Public</span>, it will
              show here. Alumni-only updates stay in the dashboard after you log in.
            </p>
            <Link
              to="/notices"
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              Open notices page <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((n, idx) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: idx * 0.05 }}
              >
                <Link
                  to={`/notices/${n.id}`}
                  className={`group flex h-full flex-col overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-all hover:border-primary/35 hover:shadow-md ${
                    isUrgent(n) ? "border-destructive/35" : "border-border"
                  }`}
                >
                  {n.image_url ? (
                    <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
                      <img src={n.image_url} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                    </div>
                  ) : (
                    <div className="flex aspect-[16/9] w-full items-center justify-center bg-primary/5">
                      <FileText className="h-10 w-10 text-primary/40" aria-hidden />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      {isPinned(n) ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 fs-caption font-medium uppercase tracking-wide text-muted-foreground">
                          <Pin className="h-3 w-3" /> Pinned
                        </span>
                      ) : null}
                      {isUrgent(n) ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-destructive/15 px-2 py-0.5 fs-caption font-semibold uppercase tracking-wide text-destructive">
                          <AlertTriangle className="h-3 w-3" /> Urgent
                        </span>
                      ) : null}
                      {n.notice_type ? (
                        <span className="rounded-full border border-border px-2 py-0.5 fs-caption capitalize text-muted-foreground">
                          {n.notice_type}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-primary">{n.title}</h3>
                    {(n.summary || n.content) && (
                      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{n.summary || n.content}</p>
                    )}
                    {n.created_at ? (
                      <p className="mt-auto flex items-center gap-1 pt-3 fs-caption text-muted-foreground">
                        <Calendar className="h-3 w-3 shrink-0" />
                        {format(new Date(n.created_at), "d MMM yyyy")}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default NoticesSection;
