import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotices, NOTICE_TYPES } from "@/hooks/useNotices";
import {
  FileText, Search, Pin, AlertTriangle, Image as ImageIcon,
  ExternalLink, Calendar,
} from "lucide-react";
import { format } from "date-fns";

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
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Notices</h1>
        <p className="text-sm text-muted-foreground">Official notices and announcements</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search notices..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {NOTICE_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No notices available</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Pinned Notices */}
          {pinned.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Pin className="w-3.5 h-3.5" /> Pinned Notices
              </h2>
              {pinned.map((n) => (
                <NoticeCard key={n.id} notice={n} />
              ))}
            </div>
          )}

          {/* Regular Notices */}
          {regular.length > 0 && (
            <div className="space-y-3">
              {pinned.length > 0 && (
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  All Notices
                </h2>
              )}
              {regular.map((n) => (
                <NoticeCard key={n.id} notice={n} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NoticeCard({ notice: n }: { notice: ReturnType<typeof useNotices>["notices"][0] }) {
  return (
    <Link to={`/notices/${n.id}`}>
      <Card className={`hover:border-primary/30 transition-colors ${n.urgent ? "border-destructive/40" : ""}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {n.image_url ? (
              <img
                src={n.image_url}
                alt=""
                className="w-16 h-16 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-foreground">{n.title}</h3>
                {n.pinned && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <Pin className="w-3 h-3" /> Pinned
                  </Badge>
                )}
                {n.urgent && (
                  <Badge variant="destructive" className="text-[10px] gap-1">
                    <AlertTriangle className="w-3 h-3" /> Urgent
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px] capitalize">{n.notice_type}</Badge>
              </div>
              {(n.summary || n.content) && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {n.summary || n.content}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                {n.created_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(n.created_at), "dd MMM yyyy")}
                  </span>
                )}
                {n.attachment_url && (
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" /> PDF
                  </span>
                )}
                {n.external_link && (
                  <span className="flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Link
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
