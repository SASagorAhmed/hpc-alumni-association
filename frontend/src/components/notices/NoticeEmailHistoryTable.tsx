import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

type CampaignRow = {
  id: string;
  notice_title?: string;
  status: string;
  sent_count: number;
  failed_count: number;
  pending_count: number;
  created_at: string;
  completed_at?: string | null;
};

type Props = {
  rows: CampaignRow[];
  onOpenDetail: (campaignId: string) => void;
};

export default function NoticeEmailHistoryTable({ rows, onOpenDetail }: Props) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Email Campaign History</h3>
          <Badge variant="outline">{rows.length} campaigns</Badge>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No campaign history yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{row.notice_title || "Untitled Notice"}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.created_at ? format(new Date(row.created_at), "dd MMM yyyy, h:mm a") : "—"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{row.status}</Badge>
                  <Badge variant="default">Sent {row.sent_count || 0}</Badge>
                  <Badge variant="destructive">Failed {row.failed_count || 0}</Badge>
                  <Badge variant="secondary">Pending {row.pending_count || 0}</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenDetail(row.id)}
                  >
                    Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
