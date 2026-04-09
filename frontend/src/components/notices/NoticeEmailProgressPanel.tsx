import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  campaign?: CampaignStatus | null;
  quotaRemaining?: number;
  grouped?: Record<string, number>;
  onContinuePending?: () => void;
  onResendFailed?: () => void;
  onDismiss?: () => void;
  errorMessage?: string | null;
};

function clampPercent(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

export default function NoticeEmailProgressPanel({
  open,
  campaign,
  quotaRemaining,
  grouped,
  onContinuePending,
  onResendFailed,
  onDismiss,
  errorMessage,
}: Props) {
  const total = Number(campaign?.total_eligible_verified || 0);
  const done = Number(campaign?.sent_count || 0) + Number(campaign?.failed_count || 0);
  const targetProgress = total > 0 ? Math.round((done / total) * 100) : 0;
  const isCompleted = String(campaign?.status || "").toLowerCase() === "completed";
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    if (!open) return;
    if (isCompleted) {
      setDisplayProgress(100);
      return;
    }
    setDisplayProgress((prev) => {
      if (prev === 0 && targetProgress === 0) return 0;
      return clampPercent(prev);
    });
  }, [open, isCompleted, targetProgress]);

  useEffect(() => {
    if (!open) return;
    const target = isCompleted ? 100 : clampPercent(targetProgress);
    if (displayProgress === target) return;

    const t = setInterval(() => {
      setDisplayProgress((prev) => {
        const delta = target - prev;
        if (Math.abs(delta) <= 1) return target;
        // Smooth approach: larger jump when far, tiny jump near target.
        const step = Math.max(1, Math.ceil(Math.abs(delta) * 0.12));
        const next = prev + Math.sign(delta) * step;
        return clampPercent(next);
      });
    }, 80);

    return () => clearInterval(t);
  }, [open, targetProgress, isCompleted, displayProgress]);

  const statusLabel = useMemo(() => {
    const raw = String(campaign?.status || "sending").replace(/_/g, " ");
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [campaign?.status]);

  if (!open) return null;

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="p-4 sm:p-5">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Email Sending Progress</p>
              <p className="text-xs text-muted-foreground">Digital live status for current campaign</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-extrabold leading-none text-primary">{displayProgress}%</p>
              <p className="mt-1 text-xs text-muted-foreground">{statusLabel}</p>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <Progress value={displayProgress} />

          <div className="flex flex-wrap gap-2">
            <Badge variant="default">Sent: {campaign?.sent_count ?? 0}</Badge>
            <Badge variant="destructive">Failed: {campaign?.failed_count ?? 0}</Badge>
            <Badge variant="secondary">Pending: {campaign?.pending_count ?? 0}</Badge>
            <Badge variant="outline">Skipped: {campaign?.skipped_count ?? 0}</Badge>
            <Badge variant="outline">Quota Remaining: {quotaRemaining ?? 0}</Badge>
          </div>

          {grouped && Object.keys(grouped).length ? (
            <div className="rounded-lg border bg-background/60 p-3 text-xs text-muted-foreground">
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
            <Button type="button" onClick={onDismiss}>
              Hide Panel
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
