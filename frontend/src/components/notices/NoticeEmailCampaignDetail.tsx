import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

type RecipientRow = {
  id: string;
  email: string;
  status: string;
  failed_reason?: string | null;
  sent_at?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string | null;
  recipients: RecipientRow[];
  loading?: boolean;
  errorMessage?: string | null;
};

export default function NoticeEmailCampaignDetail({ open, onOpenChange, campaignId, recipients, loading, errorMessage }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-0 max-w-3xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Campaign Detail {campaignId ? `· ${campaignId.slice(0, 8)}` : ""}</DialogTitle>
          <DialogDescription>
            Review recipient-level delivery status, failures, and current campaign progress details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {errorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive break-words">
              {errorMessage}
            </div>
          ) : null}
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading recipient records...</p>
          ) : recipients.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recipient records yet.</p>
          ) : (
            recipients.map((row) => (
              <div key={row.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{row.email}</p>
                  {row.failed_reason ? (
                    <p className="text-xs text-destructive break-words">Reason: {row.failed_reason}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{row.status}</Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
