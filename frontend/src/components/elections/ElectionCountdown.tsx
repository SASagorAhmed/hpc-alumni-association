import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, Radio } from "lucide-react";
import { computeElectionStage, type ElectionStageInfo } from "@/utils/electionStatus";

interface ElectionCountdownProps {
  election: {
    status: string;
    application_start: string | null;
    application_end: string | null;
    voting_start: string | null;
    voting_end: string | null;
  };
  compact?: boolean;
}

function getTimeLeft(target: Date) {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

const ElectionCountdown = ({ election, compact = false }: ElectionCountdownProps) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const info = computeElectionStage(election);

  // Live badge for voting
  if (info.stage === "voting_live") {
    const timeLeft = info.countdownTarget ? getTimeLeft(info.countdownTarget) : null;
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className="bg-red-500/10 text-red-600 border-red-500/20 gap-1.5 px-2.5 py-1 text-xs animate-pulse">
          <Radio className="w-3 h-3" /> Voting Live
        </Badge>
        {timeLeft && (
          <span className="text-xs text-muted-foreground font-medium">
            Ends in {formatTime(timeLeft)}
          </span>
        )}
      </div>
    );
  }

  // Completed states
  if (info.stage === "voting_closed" || info.stage === "results_published") {
    return (
      <Badge variant="secondary" className="gap-1 text-xs">
        <Clock className="w-3 h-3" /> {info.label}
      </Badge>
    );
  }

  // Countdown for other stages
  if (!info.countdownTarget) return null;
  const timeLeft = getTimeLeft(info.countdownTarget);
  if (!timeLeft) return null;

  if (compact) {
    return (
      <p className="text-xs text-primary font-medium flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {info.countdownLabel}: {formatTime(timeLeft)}
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        {info.countdownLabel}
      </p>
      <div className="flex gap-1.5">
        {[
          { value: timeLeft.days, label: "D" },
          { value: timeLeft.hours, label: "H" },
          { value: timeLeft.minutes, label: "M" },
          { value: timeLeft.seconds, label: "S" },
        ].map(item => (
          <div key={item.label} className="flex flex-col items-center rounded-md border border-border bg-muted/50 px-2 py-1 min-w-[40px]">
            <span className="text-sm font-bold text-foreground font-mono">
              {String(item.value).padStart(2, "0")}
            </span>
            <span className="text-[9px] text-muted-foreground uppercase">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

function formatTime(t: { days: number; hours: number; minutes: number; seconds: number }) {
  const parts: string[] = [];
  if (t.days > 0) parts.push(`${t.days}d`);
  parts.push(`${t.hours}h`);
  parts.push(`${t.minutes}m`);
  parts.push(`${t.seconds}s`);
  return parts.join(" ");
}

export default ElectionCountdown;
