import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { computeElectionStage } from "@/utils/electionStatus";
import { Radio, Send, ArrowRight, X } from "lucide-react";
import { API_BASE_URL } from "@/api-production/api.js";

interface ActiveElection {
  id: string;
  title: string;
  stage: "applications_open" | "voting_live";
  countdownTarget: Date | null;
  countdownLabel: string;
}

const ACTIVE_ELECTIONS_CACHE_KEY = "hpc:active-elections-cache";
const ACTIVE_ELECTIONS_DISMISSED_IDS_KEY = "hpc:active-elections-dismissed-ids";

function readCachedActiveElections(): ActiveElection[] {
  try {
    const raw = sessionStorage.getItem(ACTIVE_ELECTIONS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<{
      id?: string;
      title?: string;
      stage?: "applications_open" | "voting_live";
      countdownTarget?: string | null;
      countdownLabel?: string;
    }>;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item) =>
          item &&
          typeof item.id === "string" &&
          typeof item.title === "string" &&
          (item.stage === "applications_open" || item.stage === "voting_live")
      )
      .map((item) => ({
        id: item.id as string,
        title: item.title as string,
        stage: item.stage as "applications_open" | "voting_live",
        countdownTarget: item.countdownTarget ? new Date(item.countdownTarget) : null,
        countdownLabel: typeof item.countdownLabel === "string" ? item.countdownLabel : "",
      }));
  } catch {
    return [];
  }
}

function writeCachedActiveElections(items: ActiveElection[]): void {
  try {
    sessionStorage.setItem(
      ACTIVE_ELECTIONS_CACHE_KEY,
      JSON.stringify(
        items.map((item) => ({
          ...item,
          countdownTarget: item.countdownTarget ? item.countdownTarget.toISOString() : null,
        }))
      )
    );
  } catch {
    /* ignore */
  }
}

function readDismissedIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(ACTIVE_ELECTIONS_DISMISSED_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return new Set();
  }
}

function writeDismissedIds(ids: Set<string>): void {
  try {
    sessionStorage.setItem(ACTIVE_ELECTIONS_DISMISSED_IDS_KEY, JSON.stringify(Array.from(ids).slice(-30)));
  } catch {
    /* ignore */
  }
}

function getTimeLeft(target: Date) {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return null;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  parts.push(`${h}h ${m}m ${s}s`);
  return parts.join(" ");
}

export default function ActiveElectionBanner() {
  const [elections, setElections] = useState<ActiveElection[]>(() => readCachedActiveElections());
  const [dismissed, setDismissed] = useState<Set<string>>(() => readDismissedIds());
  const [, setTick] = useState(0);

  useEffect(() => {
    const fetchElections = async () => {
      const res = await fetch(`${API_BASE_URL}/api/public/elections`);
      const data = await res.json().catch(() => []);

      if (!Array.isArray(data)) return;

      const active: ActiveElection[] = [];
      for (const e of data) {
        const info = computeElectionStage(e);
        if (info.stage === "applications_open" || info.stage === "voting_live") {
          active.push({
            id: e.id,
            title: e.title,
            stage: info.stage,
            countdownTarget: info.countdownTarget,
            countdownLabel: info.countdownLabel,
          });
        }
      }
      setElections(active);
      writeCachedActiveElections(active);
    };
    fetchElections();
  }, []);

  useEffect(() => {
    if (elections.length === 0) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [elections.length]);

  const visible = elections.filter((e) => !dismissed.has(e.id));
  if (visible.length === 0) return null;

  return (
    <>
      {visible.map((e) => {
        const isVoting = e.stage === "voting_live";
        const timeStr = e.countdownTarget ? getTimeLeft(e.countdownTarget) : null;

        return (
          <div
            key={e.id}
            className={`w-full text-sm ${
              isVoting
                ? "bg-destructive text-destructive-foreground animate-pulse"
                : "bg-primary text-primary-foreground"
            }`}
          >
            <div className="flex w-full items-center justify-between px-2.5 py-2 sm:px-3 lg:px-4">
              <Link
                to="/elections"
                className="flex items-center gap-2 flex-1 min-w-0 hover:underline"
              >
                {isVoting ? (
                  <Radio className="w-4 h-4 shrink-0" />
                ) : (
                  <Send className="w-4 h-4 shrink-0" />
                )}
                <span className="font-semibold truncate">
                  {isVoting ? "🔴 Voting Live" : "📋 Applications Open"}
                </span>
                <span className="hidden sm:inline text-xs opacity-90 truncate">
                  — {e.title}
                </span>
                {timeStr && (
                  <span className="hidden md:inline text-xs font-mono opacity-80">
                    • {e.countdownLabel}: {timeStr}
                  </span>
                )}
                <ArrowRight className="w-3.5 h-3.5 shrink-0 ml-auto opacity-70" />
              </Link>
              <button
                onClick={(ev) => {
                  ev.preventDefault();
                  setDismissed((prev) => {
                    const next = new Set(prev);
                    next.add(e.id);
                    writeDismissedIds(next);
                    return next;
                  });
                }}
                className="p-1 rounded hover:bg-white/20 transition-colors shrink-0 ml-2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}
