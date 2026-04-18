import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Vote, CheckCircle, Trophy, User, Send } from "lucide-react";
import { useElections, useElection, useElectionPosts, useCandidates, useUserVotes, useCastVote, useCreateCandidate, useWinners, useVoteCounts } from "@/hooks/useElections";
import { useAuth } from "@/contexts/AuthContext";
import type { LiveResultSettings } from "@/constants/electionPosts";
import { parseLiveResultSettings } from "@/components/elections/LiveResultSettings";
import LiveResultDisplay from "@/components/elections/LiveResultDisplay";
import ElectionCountdown from "@/components/elections/ElectionCountdown";
import { computeElectionStage } from "@/utils/electionStatus";
import AutoRepairBoundary from "@/components/ui/AutoRepairBoundary";

const Elections = () => {
  const { data: elections, isLoading } = useElections();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Filter: only show non-draft elections to alumni
  const visibleElections = elections?.filter(e => e.status !== "draft") || [];

  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Elections</h1>
        <p className="text-sm text-muted-foreground">View and participate in alumni elections</p>
      </div>

      {selectedId ? (
        <AutoRepairBoundary title="Election detail">
          <ElectionDetail electionId={selectedId} onBack={() => setSelectedId(null)} />
        </AutoRepairBoundary>
      ) : isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : !visibleElections.length ? (
        <Card><CardContent className="p-8 text-center"><p className="text-sm text-muted-foreground">No active elections at the moment</p></CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visibleElections.map(e => {
            const stageInfo = computeElectionStage(e);
            return (
              <Card key={e.id} className="cursor-pointer hover:shadow-md transition-shadow group" onClick={() => setSelectedId(e.id)}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Vote className="w-4 h-4 text-primary" />
                    {e.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={`text-[11px] ${stageInfo.color}`}>
                      {stageInfo.label}
                    </Badge>
                    {e.term_year && <span className="text-xs text-muted-foreground">{e.term_year}</span>}
                  </div>
                  {e.description && <p className="text-sm text-muted-foreground line-clamp-2">{e.description}</p>}
                  <ElectionCountdown election={e} compact />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Election Detail ──────────────────────────────────────

function ElectionDetail({ electionId, onBack }: { electionId: string; onBack: () => void }) {
  const { data: election } = useElection(electionId);
  const { data: posts } = useElectionPosts(electionId);
  const { data: candidates } = useCandidates(electionId);
  const { data: userVotes } = useUserVotes(electionId);
  const { data: winners } = useWinners(electionId);
  const { user } = useAuth();

  const liveSettings = useMemo(() => parseLiveResultSettings((election as any)?.live_result_settings), [election]);
  const stageInfo = election ? computeElectionStage(election) : null;
  const isVoting = stageInfo?.stage === "voting_live";
  const shouldPoll = isVoting && liveSettings.mode !== "hidden" && !liveSettings.frozen;
  const pollInterval = shouldPoll ? liveSettings.update_interval * 1000 : undefined;
  const { data: voteCounts } = useVoteCounts(electionId, pollInterval);

  if (!election || !stageInfo) return null;

  const e = election;
  const userCandidacy = candidates?.find(c => c.user_id === user?.id);
  const votedPostIds = new Set(userVotes?.map(v => v.post_id) || []);
  const winnerMap = new Map(winners?.map(w => [w.candidate_id, w]) || []);
  const showLiveResults = isVoting && liveSettings.mode !== "hidden";
  const isApplicationOpen = stageInfo.stage === "applications_open";

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack}>← Back to elections</Button>

      {/* Header Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 flex-wrap">
                <Vote className="w-5 h-5 text-primary" />
                {e.title}
              </CardTitle>
              {e.term_year && <p className="text-sm text-muted-foreground">Term: {e.term_year}</p>}
            </div>
            <Badge variant="outline" className={`text-xs shrink-0 ${stageInfo.color}`}>
              {stageInfo.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {e.description && <p className="text-sm text-muted-foreground">{e.description}</p>}

          {/* Single Countdown */}
          <ElectionCountdown election={e} />

          {/* Application CTA */}
          {isApplicationOpen && !userCandidacy && user?.approved && (
            <CandidateApplicationForm electionId={electionId} posts={posts || []} user={user} />
          )}

          {userCandidacy && (
            <div className="rounded-lg border border-sky-400/40 bg-sky-500/10 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <p className="text-sm font-medium text-sky-100">
                <CheckCircle className="mr-1 inline w-4 h-4" />
                You have applied as a candidate — Status: {userCandidacy.status}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Results */}
      {showLiveResults && voteCounts && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="gap-1 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white inline-block" /> Live Results
            </Badge>
            <span className="text-xs text-muted-foreground">
              Auto-refreshing every {liveSettings.update_interval}s
            </span>
          </div>
          {posts?.map(post => {
            const postCandidates = candidates?.filter(c => c.post_id === post.id && c.status === "published") || [];
            return (
              <AutoRepairBoundary key={post.id} title={`Live result: ${post.post_name}`}>
                <LiveResultDisplay
                  post={post}
                  candidates={postCandidates}
                  voteCounts={voteCounts.candidateCounts}
                  postTotal={voteCounts.postTotals[post.id] || 0}
                  settings={liveSettings}
                  isAdmin={false}
                />
              </AutoRepairBoundary>
            );
          })}
        </div>
      )}

      {/* Post-wise Candidates + Voting */}
      {posts?.map(post => {
        const postCandidates = candidates?.filter(c => c.post_id === post.id && c.status === "published") || [];
        const hasVoted = votedPostIds.has(post.id);

        if (postCandidates.length === 0) return null;

        return (
          <Card key={post.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{post.post_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {postCandidates.map(c => {
                  const w = winnerMap.get(c.id);
                  return (
                    <div
                      key={c.id}
                      className={`flex items-center justify-between rounded-lg border p-3 ${w ? "border-amber-400/55 bg-amber-500/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" : "border-border"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="hpc-alumni-dashboard-glass-skeleton flex h-10 w-10 shrink-0 items-center justify-center rounded-full border">
                          {c.photo_url ? <img src={c.photo_url} className="h-10 w-10 rounded-full object-cover" alt={c.name} /> : <User className="h-5 w-5 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">{c.name}</span>
                            {c.candidate_number && <Badge variant="secondary" className="text-xs">#{c.candidate_number}</Badge>}
                            {w && <Trophy className="h-4 w-4 text-amber-300" />}
                          </div>
                          <p className="text-xs text-muted-foreground">Batch: {c.batch || "—"}</p>
                          {c.manifesto && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.manifesto}</p>}
                          {w?.congratulation_message && <p className="mt-1 text-xs italic text-amber-100/90">{w.congratulation_message}</p>}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {stageInfo.stage === "results_published" && w && (
                          <Badge className="border-amber-400/50 bg-amber-500/15 text-amber-50">Winner ({w.vote_count} votes)</Badge>
                        )}
                        {isVoting && !hasVoted && user?.approved && (
                          <VoteButton electionId={electionId} postId={post.id} candidateId={c.id} />
                        )}
                        {hasVoted && (
                          <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">✓ Voted</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Message when no candidates yet */}
      {posts && posts.length > 0 && candidates?.filter(c => c.status === "published").length === 0 && (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Candidate list has not been published yet.
        </CardContent></Card>
      )}
    </div>
  );
}

// ── Vote Button ──────────────────────────────────────────

function VoteButton({ electionId, postId, candidateId }: { electionId: string; postId: string; candidateId: string }) {
  const castVote = useCastVote();
  const [confirming, setConfirming] = useState(false);

  return confirming ? (
    <div className="flex gap-1">
      <Button size="sm" className="h-8" onClick={() => { castVote.mutate({ election_id: electionId, post_id: postId, candidate_id: candidateId }); setConfirming(false); }} disabled={castVote.isPending}>
        Confirm
      </Button>
      <Button size="sm" variant="ghost" className="h-8" onClick={() => setConfirming(false)}>Cancel</Button>
    </div>
  ) : (
    <Button size="sm" variant="outline" className="h-8 text-primary" onClick={() => setConfirming(true)}>
      <Vote className="w-3.5 h-3.5 mr-1" /> Vote
    </Button>
  );
}

// ── Candidate Application Form ───────────────────────────

function CandidateApplicationForm({ electionId, posts, user }: { electionId: string; posts: any[]; user: any }) {
  const createCandidate = useCreateCandidate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ post_id: "", manifesto: "", phone: "", email: "" });

  const handleSubmit = async () => {
    if (!form.post_id) return;
    await createCandidate.mutateAsync({
      election_id: electionId,
      post_id: form.post_id,
      user_id: user.id,
      name: user.name,
      batch: user.batch,
      manifesto: form.manifesto || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      is_manual: false,
      status: "pending",
    });
    setOpen(false);
    setForm({ post_id: "", manifesto: "", phone: "", email: "" });
  };

  const openPosts = posts.filter(p => p.is_open_for_application && !p.admin_nomination_only);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Send className="w-3.5 h-3.5" /> Apply as Candidate</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Apply as Candidate</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="hpc-alumni-dashboard-glass-empty rounded-lg border p-3 text-sm text-foreground/95">
            <p>
              <strong>Name:</strong> {user.name}
            </p>
            <p>
              <strong>Batch:</strong> {user.batch}
            </p>
          </div>
          <div><Label>Select Post *</Label>
            <Select value={form.post_id} onValueChange={v => setForm(f => ({ ...f, post_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Choose a post" /></SelectTrigger>
              <SelectContent>{openPosts.map(p => <SelectItem key={p.id} value={p.id}>{p.post_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Manifesto / Statement</Label><Textarea value={form.manifesto} onChange={e => setForm(f => ({ ...f, manifesto: e.target.value }))} rows={3} placeholder="Why should people vote for you?" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Phone (optional)</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><Label>Email (optional)</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          </div>
          <Button onClick={handleSubmit} disabled={createCandidate.isPending} className="w-full">{createCandidate.isPending ? "Submitting..." : "Submit Application"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default Elections;
