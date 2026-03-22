import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, User, BarChart3, Eye, EyeOff, Clock } from "lucide-react";
import type { LiveResultSettings } from "@/constants/electionPosts";
import { parseLiveResultSettings } from "./LiveResultSettings";

interface Candidate {
  id: string;
  name: string;
  photo_url: string | null;
  candidate_number: number | null;
  batch: string | null;
  post_id: string;
}

interface Props {
  post: { id: string; post_name: string; winners_count: number | null };
  candidates: Candidate[];
  voteCounts: Record<string, number>;
  postTotal: number;
  settings: LiveResultSettings;
  isAdmin?: boolean;
}

export default function LiveResultDisplay({ post, candidates, voteCounts, postTotal, settings, isAdmin }: Props) {
  const s = settings;
  const effectiveMode = s.mode;

  const sorted = useMemo(() => {
    return [...candidates].sort((a, b) => (voteCounts[b.id] || 0) - (voteCounts[a.id] || 0));
  }, [candidates, voteCounts]);

  // If hidden and not admin, show nothing
  if (effectiveMode === "hidden" && !isAdmin) return null;
  // If admin_only and not admin, show placeholder
  if (effectiveMode === "admin_only" && !isAdmin) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <EyeOff className="w-4 h-4" />
            Results will be published after voting ends
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxVotes = Math.max(...sorted.map(c => voteCounts[c.id] || 0), 1);
  const showCounts = effectiveMode === "live" || effectiveMode === "admin_only" ? s.show_vote_count : false;
  const showPercentage = s.show_percentage;
  const showRanking = effectiveMode === "live" || effectiveMode === "admin_only" ? s.show_ranking : false;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          {post.post_name}
          <Badge variant="secondary" className="text-[10px]">
            Total: {postTotal} vote{postTotal !== 1 ? "s" : ""}
          </Badge>
          {s.frozen && (
            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
              <Clock className="w-3 h-3 mr-0.5" /> Paused
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No votes yet</p>
        ) : (
          sorted.map((c, i) => {
            const vc = voteCounts[c.id] || 0;
            const pct = postTotal > 0 ? Math.round((vc / postTotal) * 100) : 0;
            const isLeading = i === 0 && vc > 0;

            return (
              <div
                key={c.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  isLeading ? "border-primary/40 bg-primary/5" : "border-border"
                }`}
              >
                {/* Rank */}
                {showRanking && (
                  <span className={`text-lg font-bold w-6 text-center ${
                    isLeading ? "text-primary" : "text-muted-foreground"
                  }`}>
                    {i === 0 && vc > 0 ? "🥇" : i === 1 && vc > 0 ? "🥈" : i === 2 && vc > 0 ? "🥉" : `${i + 1}`}
                  </span>
                )}

                {/* Photo */}
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  {c.photo_url ? (
                    <img src={c.photo_url} className="w-9 h-9 rounded-full object-cover" alt={c.name} />
                  ) : (
                    <User className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>

                {/* Info + progress */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm ${isLeading ? "text-primary" : ""}`}>{c.name}</span>
                    {c.candidate_number && <Badge variant="outline" className="text-[10px]">#{c.candidate_number}</Badge>}
                    {isLeading && <Trophy className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  {showPercentage && (
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={pct} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                    </div>
                  )}
                </div>

                {/* Vote count */}
                {showCounts && (
                  <div className="text-right shrink-0">
                    <span className="text-lg font-bold">{vc}</span>
                    <span className="text-xs text-muted-foreground ml-1">votes</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
