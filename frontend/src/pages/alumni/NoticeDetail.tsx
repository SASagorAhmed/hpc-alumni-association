import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/api-production/api.js";
import {
  ArrowLeft,
  Pin,
  AlertTriangle,
  Calendar,
  FileText,
  ExternalLink,
  Download,
  Link2,
} from "lucide-react";
import { format } from "date-fns";
import type { Notice } from "@/hooks/useNotices";
import { getAuthToken } from "@/lib/authToken";

export default function NoticeDetail() {
  const { id } = useParams<{ id: string }>();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const run = async () => {
      const token = getAuthToken();
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE_URL}/api/alumni/notices/${id}`, { headers });
      if (!res.ok) {
        setNotice(null);
        setLoading(false);
        return;
      }
      const data = (await res.json()) as Notice | null;
      if (data) {
        setNotice(data);
        // Mark as read in DB (fire-and-forget)
        fetch(`${API_BASE_URL}/api/alumni/notices/${id}/read`, {
          method: "POST",
          headers,
        }).catch(() => {/* best effort */});
      }
      setLoading(false);
    };
    run();
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-8">
        <div className="h-4 w-40 animate-pulse rounded bg-muted/60" />
        <div className="h-48 animate-pulse rounded-xl border border-border/60 bg-muted/30" />
        <div className="h-24 animate-pulse rounded-lg bg-muted/30" />
      </div>
    );
  }

  if (!notice) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="text-muted-foreground">This notice could not be found or is no longer published.</p>
        <Button asChild variant="outline" className="mt-6" size="sm">
          <Link to="/notices">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to notices
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <div className="flex flex-col gap-4 border-b border-border/80 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit gap-1 text-muted-foreground hover:text-foreground">
          <Link to="/notices">
            <ArrowLeft className="h-4 w-4" /> Notices
          </Link>
        </Button>
      </div>

      <article>
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {notice.pinned && (
              <Badge variant="secondary" className="gap-1 font-medium">
                <Pin className="h-3 w-3" /> Pinned
              </Badge>
            )}
            {notice.urgent && (
              <Badge variant="destructive" className="gap-1 font-medium">
                <AlertTriangle className="h-3 w-3" /> Urgent
              </Badge>
            )}
            <Badge variant="outline" className="border-border/80 font-normal capitalize text-muted-foreground">
              {notice.notice_type}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{notice.title}</h1>
          {notice.created_at && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0 opacity-80" />
              <time dateTime={notice.created_at}>{format(new Date(notice.created_at), "d MMMM yyyy '·' h:mm a")}</time>
            </p>
          )}
        </header>

        <Card className="mt-8 overflow-hidden border-border/80 shadow-sm">
          <CardContent className="space-y-6 p-6 sm:p-8">
            {notice.image_url && (
              <div className="-mx-6 overflow-hidden border-b border-border/80 bg-muted/20 sm:-mx-8">
                <img
                  src={notice.image_url}
                  alt=""
                  className="mx-auto max-h-[min(420px,50vh)] w-full object-contain"
                />
              </div>
            )}

            {notice.summary && (
              <p className="border-l-4 border-primary/40 bg-primary/[0.04] py-2 pl-4 text-sm leading-relaxed text-foreground/90">
                {notice.summary}
              </p>
            )}

            {notice.content && (
              <div className="prose prose-sm max-w-none text-foreground prose-p:leading-relaxed prose-headings:font-semibold dark:prose-invert">
                <div className="whitespace-pre-wrap text-[15px] leading-relaxed">{notice.content}</div>
              </div>
            )}

            {(notice.attachment_url || notice.linked_document_id || notice.external_link) && (
              <div className="space-y-3 border-t border-border/80 pt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resources</p>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {notice.attachment_url && (
                    <a
                      href={notice.attachment_url}
                      download={`${notice.title}.pdf`}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-primary shadow-sm transition-colors hover:bg-muted/50"
                    >
                      <Download className="h-4 w-4" /> Download attachment
                    </a>
                  )}
                  {notice.linked_document_id && (
                    <Button asChild variant="outline" className="gap-2">
                      <Link to="/documents">
                        <Link2 className="h-4 w-4" /> Documents library
                      </Link>
                    </Button>
                  )}
                  {notice.external_link && (
                    <Button asChild variant="outline" className="gap-2">
                      <a href={notice.external_link} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" /> Open link
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {notice.expiry_date && (
              <p className="text-xs text-muted-foreground">
                <FileText className="mr-1 inline h-3 w-3 align-text-bottom opacity-70" />
                Valid until {format(new Date(notice.expiry_date), "d MMM yyyy, h:mm a")}
              </p>
            )}
          </CardContent>
        </Card>
      </article>
    </div>
  );
}
