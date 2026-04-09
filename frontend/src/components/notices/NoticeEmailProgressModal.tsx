import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type CampaignStatus = {
  id: string;
  status: string;
  sent_count: number;
  failed_count: number;
  pending_count: number;
  skipped_count: number;
  total_eligible_verified: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign?: CampaignStatus | null;
  quotaRemaining?: number;
  grouped?: Record<string, number>;
  onContinuePending?: () => void;
  onResendFailed?: () => void;
  errorMessage?: string | null;
};

export default function NoticeEmailProgressModal({
  open,
  onOpenChange,
  campaign,
  quotaRemaining,
  grouped,
  onContinuePending,
  onResendFailed,
  errorMessage,
}: Props) {
  const total = Number(campaign?.total_eligible_verified || 0);
  const done = Number(campaign?.sent_count || 0) + Number(campaign?.failed_count || 0);
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Notice Email Sending Progress</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {errorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold text-foreground">{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="default">Sent: {campaign?.sent_count ?? 0}</Badge>
            <Badge variant="destructive">Failed: {campaign?.failed_count ?? 0}</Badge>
            <Badge variant="secondary">Pending: {campaign?.pending_count ?? 0}</Badge>
            <Badge variant="outline">Skipped: {campaign?.skipped_count ?? 0}</Badge>
            <Badge variant="outline">Quota Remaining: {quotaRemaining ?? 0}</Badge>
          </div>

          {grouped ? (
            <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
              <p>Current bucket counts</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {Object.entries(grouped).map(([k, v]) => (
                  <Badge key={k} variant="outline">
                    {k}: {v}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={onContinuePending}>
              Continue Pending
            </Button>
            <Button type="button" variant="outline" onClick={onResendFailed}>
              Resend Failed
            </Button>
            <Button type="button" onClick={() => onOpenChange(false)}>
              Minimize
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
