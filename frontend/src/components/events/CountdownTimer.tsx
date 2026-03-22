import { useState, useEffect } from "react";
import { Clock, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CountdownTimerProps {
  startTime: string | null;
  endTime: string | null;
}

function getTimeLeft(target: Date) {
  const now = new Date().getTime();
  const diff = target.getTime() - now;
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds };
}

type EventStatus = "upcoming" | "live" | "completed";

function getEventStatus(startTime: string | null, endTime: string | null): EventStatus {
  const now = new Date();
  if (startTime && new Date(startTime) > now) return "upcoming";
  if (startTime && new Date(startTime) <= now && (!endTime || new Date(endTime) > now)) return "live";
  return "completed";
}

const CountdownTimer = ({ startTime, endTime }: CountdownTimerProps) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const status = getEventStatus(startTime, endTime);

  if (status === "completed") {
    return (
      <Badge variant="secondary" className="bg-muted text-muted-foreground gap-1.5 px-3 py-1.5 text-sm">
        <Clock className="w-3.5 h-3.5" /> Event Completed
      </Badge>
    );
  }

  if (status === "live") {
    const timeLeft = endTime ? getTimeLeft(new Date(endTime)) : null;
    return (
      <div className="space-y-1.5">
        <Badge className="bg-red-500/10 text-red-600 border-red-500/20 gap-1.5 px-3 py-1.5 text-sm animate-pulse">
          <Radio className="w-3.5 h-3.5" /> Event is Live
        </Badge>
        {timeLeft && (
          <p className="text-xs text-muted-foreground">
            Ends in: {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
          </p>
        )}
      </div>
    );
  }

  // upcoming
  const timeLeft = startTime ? getTimeLeft(new Date(startTime)) : null;
  if (!timeLeft) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Event starts in</p>
      <div className="flex gap-2">
        {[
          { value: timeLeft.days, label: "Days" },
          { value: timeLeft.hours, label: "Hrs" },
          { value: timeLeft.minutes, label: "Min" },
          { value: timeLeft.seconds, label: "Sec" },
        ].map((item) => (
          <div key={item.label} className="flex flex-col items-center rounded-lg border border-border bg-muted/50 px-3 py-2 min-w-[56px]">
            <span className="text-lg font-bold text-foreground font-mono-data">{String(item.value).padStart(2, "0")}</span>
            <span className="text-[10px] text-muted-foreground uppercase">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export { getEventStatus };
export default CountdownTimer;
