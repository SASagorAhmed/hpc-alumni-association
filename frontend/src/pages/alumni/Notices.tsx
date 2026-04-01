import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotices, NOTICE_TYPES } from "@/hooks/useNotices";
import { FileText, Search, Pin, AlertTriangle, ExternalLink, Calendar, Megaphone } from "lucide-react";
import { format } from "date-fns";
import { saveNavScrollRestore } from "@/lib/navScrollRestore";
import { cn } from "@/lib/utils";

export default function Notices() {
  const { notices, loading } = useNotices(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  const filtered = notices.filter((n) => {
    const matchSearch = n.title.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || n.notice_type === typeFilter;
    const matchPinned = !showPinnedOnly || n.pinned;
    return matchSearch && matchType && matchPinned;
  });

  const pinned = filtered.filter((n) => n.pinned);
  const regular = filtered.filter((n) => !n.pinned);

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10">
      <header className="border-b border-border/80 pb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Communications</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Notices</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Official announcements from the association—pinned items appear first. Use the filters to narrow by type.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <Megaphone className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>
              Showing <strong className="text-foreground">{filtered.length}</strong>
              {notices.length !== filtered.length ? ` of ${notices.length}` : ""} published notice
              {notices.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </header>

      <Card className="overflow-hidden border-border/80 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by title…"
                className="h-10 border-border/80 bg-background pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-10 w-full border-border/80 bg-background lg:w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {NOTICE_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex h-10 items-center gap-2 rounded-md border border-border/80 bg-muted/20 px-3 lg:shrink-0">
              <Checkbox
                id="notices-pinned-only"
                checked={showPinnedOnly}
                onCheckedChange={(c) => setShowPinnedOnly(c === true)}
              />
              <Label htmlFor="notices-pinned-only" className="cursor-pointer text-sm font-normal leading-none">
                Pinned only
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-border/60 bg-muted/30" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-muted/10">
          <CardContent className="flex flex-col items-center px-6 py-14 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
              <FileText className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-base font-medium text-foreground">No notices match your filters</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Try clearing search or choose “All types”. New items will appear here once administrators publish them.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {pinned.length > 0 && (
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Pin className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                Pinned
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {pinned.map((n) => (
                  <NoticeCard key={n.id} notice={n} />
                ))}
              </div>
            </section>
          )}

          {regular.length > 0 && (
            <section className="space-y-4">
              {pinned.length > 0 ? (
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">All notices</h2>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                {regular.map((n) => (
                  <NoticeCard key={n.id} notice={n} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function NoticeCard({ notice: n }: { notice: ReturnType<typeof useNotices>["notices"][0] }) {
  return (
    <Link to={`/notices/${n.id}`} onClick={() => saveNavScrollRestore()} className="group block h-full min-h-0 outline-none">
      <Card
        className={cn(
          "h-full border-border/80 shadow-sm transition-all duration-200 hover:border-primary/35 hover:shadow-md",
          n.urgent && "border-destructive/30 hover:border-destructive/45"
        )}
      >
        <CardContent className="flex gap-4 p-4 sm:p-5">
          {n.image_url ? (
            <img
              src={n.image_url}
              alt=""
              className="h-20 w-20 shrink-0 rounded-xl object-cover shadow-inner sm:h-24 sm:w-24"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 sm:h-24 sm:w-24">
              <FileText className="h-8 w-8 text-primary/60" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {n.pinned && (
                <Badge variant="secondary" className="gap-0.5 text-[10px] font-medium">
                  <Pin className="h-3 w-3" /> Pinned
                </Badge>
              )}
              {n.urgent && (
                <Badge variant="destructive" className="gap-0.5 text-[10px] font-medium">
                  <AlertTriangle className="h-3 w-3" /> Urgent
                </Badge>
              )}
              <Badge variant="outline" className="border-border/80 text-[10px] font-normal capitalize text-muted-foreground">
                {n.notice_type}
              </Badge>
            </div>
            <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary sm:text-[15px]">
              {n.title}
            </h3>
            {(n.summary || n.content) && (
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{n.summary || n.content}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              {n.created_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 shrink-0" />
                  {format(new Date(n.created_at), "d MMM yyyy")}
                </span>
              )}
              {n.attachment_url && (
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3 shrink-0" /> PDF attached
                </span>
              )}
              {n.external_link && (
                <span className="flex items-center gap-1">
                  <ExternalLink className="h-3 w-3 shrink-0" /> External link
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
