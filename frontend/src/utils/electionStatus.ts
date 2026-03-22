/**
 * Computes the effective election stage from dates + manual status.
 * Time-based transitions happen automatically; admin can override via manual status.
 */

export type ElectionStage =
  | "draft"
  | "applications_opening_soon"
  | "applications_open"
  | "applications_closed"
  | "candidates_published"
  | "voting_soon"
  | "voting_live"
  | "voting_closed"
  | "results_published";

export interface ElectionStageInfo {
  stage: ElectionStage;
  label: string;
  color: string;
  countdownTarget: Date | null;
  countdownLabel: string;
}

const STAGE_META: Record<ElectionStage, { label: string; color: string }> = {
  draft:                    { label: "Draft",                color: "bg-muted text-muted-foreground" },
  applications_opening_soon:{ label: "Opening Soon",        color: "bg-blue-50 text-blue-700 border-blue-200" },
  applications_open:        { label: "Applications Open",   color: "bg-blue-100 text-blue-700 border-blue-300" },
  applications_closed:      { label: "Under Review",        color: "bg-amber-50 text-amber-700 border-amber-200" },
  candidates_published:     { label: "Candidates Published",color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  voting_soon:              { label: "Voting Soon",         color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  voting_live:              { label: "Voting Live",         color: "bg-red-50 text-red-700 border-red-200" },
  voting_closed:            { label: "Closed",              color: "bg-muted text-muted-foreground" },
  results_published:        { label: "Results Published",   color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
};

export function computeElectionStage(election: {
  status: string;
  application_start: string | null;
  application_end: string | null;
  voting_start: string | null;
  voting_end: string | null;
}): ElectionStageInfo {
  const now = new Date();
  const appStart = election.application_start ? new Date(election.application_start) : null;
  const appEnd = election.application_end ? new Date(election.application_end) : null;
  const voteStart = election.voting_start ? new Date(election.voting_start) : null;
  const voteEnd = election.voting_end ? new Date(election.voting_end) : null;

  // If admin manually set results_published, respect it
  if (election.status === "results_published") {
    return buildInfo("results_published", null, "");
  }

  // If admin manually set draft, respect it
  if (election.status === "draft") {
    if (appStart && appStart > now) {
      return buildInfo("draft", appStart, "Applications open in");
    }
    return buildInfo("draft", null, "");
  }

  // Time-based auto computation
  // 1. Voting ended?
  if (voteEnd && now >= voteEnd) {
    return buildInfo("voting_closed", null, "");
  }

  // 2. Voting live?
  if (voteStart && now >= voteStart && (!voteEnd || now < voteEnd)) {
    return buildInfo("voting_live", voteEnd, "Voting ends in");
  }

  // 3. After application end, before voting start → review/published phase
  if (appEnd && now >= appEnd && (!voteStart || now < voteStart)) {
    // Check if admin has published candidates
    if (election.status === "published" || election.status === "candidates_published") {
      return buildInfo("candidates_published", voteStart, voteStart ? "Voting starts in" : "");
    }
    return buildInfo("applications_closed", voteStart, voteStart ? "Voting starts in" : "");
  }

  // 4. Application open?
  if (appStart && now >= appStart && (!appEnd || now < appEnd)) {
    return buildInfo("applications_open", appEnd, "Applications close in");
  }

  // 5. Before application start
  if (appStart && now < appStart) {
    return buildInfo("applications_opening_soon", appStart, "Applications open in");
  }

  // Fallback: map legacy status
  const legacyMap: Record<string, ElectionStage> = {
    application_open: "applications_open",
    application_closed: "applications_closed",
    candidate_review: "applications_closed",
    published: "candidates_published",
    voting: "voting_live",
    closed: "voting_closed",
    result_review: "voting_closed",
  };

  const mapped = legacyMap[election.status] || "draft";
  return buildInfo(mapped, null, "");
}

function buildInfo(stage: ElectionStage, target: Date | null, countdownLabel: string): ElectionStageInfo {
  const meta = STAGE_META[stage];
  return {
    stage,
    label: meta.label,
    color: meta.color,
    countdownTarget: target,
    countdownLabel,
  };
}

/**
 * Returns the database status value that maps to a computed stage.
 * Used when admin wants to manually advance/override.
 */
export const ADMIN_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "application_open", label: "Applications Open (Manual)" },
  { value: "published", label: "Candidates Published" },
  { value: "voting", label: "Voting Live (Manual)" },
  { value: "closed", label: "Closed (Manual)" },
  { value: "results_published", label: "Results Published" },
] as const;
