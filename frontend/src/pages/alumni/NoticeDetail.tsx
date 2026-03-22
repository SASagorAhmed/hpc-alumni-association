import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/api-production/api.js";
import {
  ArrowLeft, Pin, AlertTriangle, Calendar, FileText,
  ExternalLink, Download, Image as ImageIcon, Link2,
} from "lucide-react";
import { format } from "date-fns";
import type { Notice } from "@/hooks/useNotices";

export default function NoticeDetail() {
  const { id } = useParams<{ id: string }>();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      const res = await fetch(`${API_BASE_URL}/api/public/notices/${id}`, { method: "GET" });
      if (!res.ok) {
        setNotice(null);
        setLoading(false);
        return;
      }
      const data = (await res.json()) as Notice | null;
      if (data) setNotice(data);
      setLoading(false);
    };
    fetch();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  if (!notice) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-muted-foreground mb-4">Notice not found.</p>
        <Link to="/notices">
          <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back to Notices</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link to="/notices" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Notices
      </Link>

      <Card>
        <CardContent className="p-6 space-y-5">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {notice.pinned && (
                <Badge variant="secondary" className="gap-1"><Pin className="w-3 h-3" /> Pinned</Badge>
              )}
              {notice.urgent && (
                <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" /> Urgent</Badge>
              )}
              <Badge variant="outline" className="capitalize">{notice.notice_type}</Badge>
            </div>
            <h1 className="text-xl font-bold text-foreground">{notice.title}</h1>
            {notice.created_at && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {format(new Date(notice.created_at), "dd MMMM yyyy, hh:mm a")}
              </p>
            )}
          </div>

          {/* Image */}
          {notice.image_url && (
            <div className="rounded-lg overflow-hidden border">
              <img src={notice.image_url} alt={notice.title} className="w-full max-h-96 object-contain bg-muted" />
            </div>
          )}

          {/* Content */}
          {notice.content && (
            <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
              {notice.content}
            </div>
          )}

          {/* Attachments */}
          {notice.attachment_url && (
            <div className="rounded-lg border p-4 bg-muted/30">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-primary" /> Attachment
              </h3>
              <a
                href={notice.attachment_url}
                download={`${notice.title}.pdf`}
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Download className="w-4 h-4" /> Download PDF
              </a>
            </div>
          )}

          {/* Linked Document */}
          {notice.linked_document_id && (
            <div className="rounded-lg border p-4 bg-muted/30">
              <Link to="/documents" className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium">
                <Link2 className="w-4 h-4" /> View Linked Document
              </Link>
            </div>
          )}

          {/* External Link */}
          {notice.external_link && (
            <a
              href={notice.external_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="w-4 h-4" /> Open External Link
            </a>
          )}

          {/* Expiry Info */}
          {notice.expiry_date && (
            <p className="text-xs text-muted-foreground">
              Expires: {format(new Date(notice.expiry_date), "dd MMM yyyy, hh:mm a")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
