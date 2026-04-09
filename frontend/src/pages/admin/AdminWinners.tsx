import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trophy, Award, Trash2, User, BarChart3 } from "lucide-react";
import { useElections, useUpdateElection, useElectionPosts, useCandidates, useAllVotes, useWinners, useDeclareWinner, useDeleteWinner, useVoteCounts } from "@/hooks/useElections";
import { ELECTION_STATUSES } from "@/constants/electionPosts";
import { parseLiveResultSettings } from "@/components/elections/LiveResultSettings";
import LiveResultDisplay from "@/components/elections/LiveResultDisplay";

const AdminWinners = () => {
  const { data: elections } = useElections();
  const [selectedElection, setSelectedElection] = useState<string | null>(null);
  const { data: posts } = useElectionPosts(selectedElection);
  const { data: candidates } = useCandidates(selectedElection);
  const { data: votes } = useAllVotes(selectedElection);
  const { data: winners } = useWinners(selectedElection);
  const updateElection = useUpdateElection();
  const declareWinner = useDeclareWinner();
  const deleteWinner = useDeleteWinner();

  const election = elections?.find(e => e.id === selectedElection);
  const liveSettings = parseLiveResultSettings((election as any)?.live_result_settings);
  const isVoting = election?.status === "voting";
  const pollInterval = isVoting && !liveSettings.frozen ? liveSettings.update_interval * 1000 : undefined;
  const { data: liveCounts } = useVoteCounts(selectedElection, pollInterval);

  // Compute vote counts
  const voteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    votes?.forEach(v => {
      counts[v.candidate_id] = (counts[v.candidate_id] || 0) + 1;
    });
    return counts;
  }, [votes]);

  const totalVotes = votes?.length || 0;
  const winnerIds = new Set(winners?.map(w => w.candidate_id) || []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Results & Winners</h1>
          <p className="text-sm text-muted-foreground">Review results, declare and publish winners</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Select value={selectedElection || ""} onValueChange={v => setSelectedElection(v)}>
            <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Select Election" /></SelectTrigger>
            <SelectContent>{elections?.map(e => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}</SelectContent>
          </Select>
          {election && election.status !== "results_published" && (
            <Button size="sm" variant="default" className="w-full sm:w-auto" onClick={() => updateElection.mutate({ id: election.id, status: "results_published" })}>
              <Award className="w-3.5 h-3.5 mr-1" /> Publish Results
            </Button>
          )}
        </div>
      </div>

      {!selectedElection ? (
        <Card><CardContent className="p-6"><div className="h-48 rounded-lg bg-muted flex items-center justify-center"><p className="text-sm text-muted-foreground">Select an election to view results</p></div></CardContent></Card>
      ) : (
        <>
          {/* Live Monitoring Badge */}
          {isVoting && liveCounts && (
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="default" className="gap-1 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-white inline-block" /> Live Monitoring
              </Badge>
              <span className="text-xs text-muted-foreground">
                Refreshing every {liveSettings.update_interval}s · {liveCounts.totalVotes} total votes
              </span>
            </div>
          )}

          {/* Summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{totalVotes}</p>
              <p className="text-xs text-muted-foreground">Total Votes</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{posts?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Posts</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{winners?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Winners Declared</p>
            </CardContent></Card>
          </div>

          {/* Post-wise Results */}
          {posts?.map(post => {
            const postCandidates = candidates?.filter(c => c.post_id === post.id && (c.status === "published" || c.status === "approved_unpublished")) || [];
            const sorted = [...postCandidates].sort((a, b) => (voteCounts[b.id] || 0) - (voteCounts[a.id] || 0));
            const postWinners = winners?.filter(w => w.post_id === post.id) || [];

            return (
              <Card key={post.id}>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    {post.post_name}
                    <Badge variant="secondary" className="text-xs">{post.winners_count} seat{post.winners_count > 1 ? "s" : ""}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sorted.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No candidates for this post</p>
                  ) : (
                    <div className="space-y-2">
                      {sorted.map((c, i) => {
                        const vc = voteCounts[c.id] || 0;
                        const isWinner = winnerIds.has(c.id);
                        const pw = postWinners.find(w => w.candidate_id === c.id);

                        return (
                          <div key={c.id} className={`flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border ${isWinner ? "border-yellow-400 bg-yellow-50" : "border-border"}`}>
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold text-muted-foreground w-6">{i + 1}</span>
                              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                                {c.photo_url ? <img src={c.photo_url} className="w-9 h-9 rounded-full object-cover" /> : <User className="w-4 h-4 text-muted-foreground" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{c.name}</span>
                                  {c.candidate_number && <Badge variant="outline" className="text-xs">#{c.candidate_number}</Badge>}
                                  {isWinner && <Trophy className="w-4 h-4 text-yellow-600" />}
                                </div>
                                <p className="text-xs text-muted-foreground">Batch: {c.batch || "—"}</p>
                              </div>
                            </div>
                            <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-normal">
                              <div className="text-right">
                                <span className="text-lg font-bold">{vc}</span>
                                <span className="text-xs text-muted-foreground ml-1">votes</span>
                              </div>
                              {isWinner ? (
                                <Button size="sm" variant="outline" className="text-destructive h-8" onClick={() => {
                                  if (pw && confirm("Remove winner?")) deleteWinner.mutate({ id: pw.id, election_id: selectedElection! });
                                }}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              ) : (
                                <DeclareWinnerButton
                                  electionId={selectedElection!}
                                  postId={post.id}
                                  candidateId={c.id}
                                  voteCount={vc}
                                  onDeclare={declareWinner.mutate}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
};

function DeclareWinnerButton({ electionId, postId, candidateId, voteCount, onDeclare }: {
  electionId: string; postId: string; candidateId: string; voteCount: number;
  onDeclare: (v: any) => void;
}) {
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);

  return open ? (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      <Input placeholder="Winner congratulations" value={msg} onChange={e => setMsg(e.target.value)} className="h-8 w-full text-xs sm:w-48" />
      <Button size="sm" className="h-8" onClick={() => {
        onDeclare({ election_id: electionId, post_id: postId, candidate_id: candidateId, congratulation_message: msg || undefined, vote_count: voteCount });
        setOpen(false);
        setMsg("");
      }}>
        <Trophy className="w-3.5 h-3.5 mr-1" /> Declare
      </Button>
      <Button size="sm" variant="ghost" className="h-8" onClick={() => setOpen(false)}>Cancel</Button>
    </div>
  ) : (
    <Button size="sm" variant="outline" className="h-8 text-yellow-700 border-yellow-300" onClick={() => setOpen(true)}>
      <Trophy className="w-3.5 h-3.5 mr-1" /> Declare Winner
    </Button>
  );
}

export default AdminWinners;
