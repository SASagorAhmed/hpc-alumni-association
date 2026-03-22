import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical, Settings2, CheckCircle2, Circle, ArrowRight, Users, Trophy } from "lucide-react";
import { useElections, useCreateElection, useUpdateElection, useDeleteElection, useElectionPosts, useCreateElectionPost, useDeleteElectionPost } from "@/hooks/useElections";
import { DEFAULT_ELECTION_POSTS, ELECTION_TYPES, RESULT_VISIBILITY_OPTIONS } from "@/constants/electionPosts";
import { useToast } from "@/hooks/use-toast";
import LiveResultSettingsPanel, { parseLiveResultSettings } from "@/components/elections/LiveResultSettings";
import ElectionCountdown from "@/components/elections/ElectionCountdown";
import { computeElectionStage, ADMIN_STATUS_OPTIONS, type ElectionStage } from "@/utils/electionStatus";
import { DateTimePicker } from "@/components/ui/date-time-picker";

// ── Timeline Stages ──────────────────────────────────────
const TIMELINE_STAGES: { key: ElectionStage; label: string }[] = [
  { key: "draft", label: "Draft" },
  { key: "applications_open", label: "Applications" },
  { key: "applications_closed", label: "Review" },
  { key: "voting_live", label: "Voting" },
  { key: "results_published", label: "Results" },
];

function stageIndex(stage: ElectionStage): number {
  const map: Record<string, number> = {
    draft: 0,
    applications_opening_soon: 0,
    applications_open: 1,
    applications_closed: 2,
    candidates_published: 2,
    voting_soon: 2,
    voting_live: 3,
    voting_closed: 3,
    results_published: 4,
  };
  return map[stage] ?? 0;
}

function ElectionTimeline({ stage }: { stage: ElectionStage }) {
  const current = stageIndex(stage);
  return (
    <div className="flex items-center gap-0 w-full overflow-x-auto">
      {TIMELINE_STAGES.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1">
              {done ? (
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
              ) : active ? (
                <div className="w-5 h-5 rounded-full border-2 border-primary bg-primary/20 shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground/40 shrink-0" />
              )}
              <span className={`text-[10px] font-medium whitespace-nowrap ${active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground/60"}`}>
                {s.label}
              </span>
            </div>
            {i < TIMELINE_STAGES.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 rounded ${i < current ? "bg-primary" : "bg-muted"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────

const AdminElections = () => {
  const { data: elections, isLoading } = useElections();
  const createElection = useCreateElection();
  const updateElection = useUpdateElection();
  const deleteElection = useDeleteElection();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [form, setForm] = useState({ title: "", description: "", term_year: "", election_type: "general" });
  const resetForm = () => setForm({ title: "", description: "", term_year: "", election_type: "general" });

  const handleCreate = async () => {
    if (!form.title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    await createElection.mutateAsync({
      title: form.title,
      election_type: form.election_type,
      ...(form.description && { description: form.description }),
      ...(form.term_year && { term_year: form.term_year }),
    });
    resetForm();
    setCreateOpen(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Election Management</h1>
          <p className="text-sm text-muted-foreground">Create and manage elections — stages advance automatically by schedule</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" /> New Election</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Create Election</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Election Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Executive Committee Election 2027" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Brief description..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Term / Year</Label><Input value={form.term_year} onChange={e => setForm(f => ({ ...f, term_year: e.target.value }))} placeholder="2027–2029" /></div>
                <div><Label>Type</Label>
                  <Select value={form.election_type} onValueChange={v => setForm(f => ({ ...f, election_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ELECTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">You can configure schedule, posts, and settings after creation.</p>
              <Button onClick={handleCreate} disabled={createElection.isPending} className="w-full">
                {createElection.isPending ? "Creating..." : "Create Election"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : !elections?.length ? (
        <Card><CardContent className="p-8 text-center"><p className="text-sm text-muted-foreground">No elections yet. Create your first election to get started.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {elections.map(e => {
            const stageInfo = computeElectionStage(e);
            return (
              <Card key={e.id} className="overflow-hidden">
                <CardHeader className="cursor-pointer py-4" onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}>
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                        {e.title}
                        <Badge variant="outline" className={`text-[11px] ${stageInfo.color}`}>{stageInfo.label}</Badge>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {e.term_year || "No term"} · {ELECTION_TYPES.find(t => t.value === e.election_type)?.label || e.election_type}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <ElectionCountdown election={e} compact />
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={ev => { ev.stopPropagation(); if (confirm("Delete this election?")) deleteElection.mutate(e.id); }}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                      {expandedId === e.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </CardHeader>
                {expandedId === e.id && (
                  <CardContent className="space-y-6 border-t pt-5">
                    <ElectionManagePanel election={e} onUpdate={(values) => updateElection.mutate({ id: e.id, ...values })} stageInfo={stageInfo} />
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Management Panel ─────────────────────────────────────

function ElectionManagePanel({ election, onUpdate, stageInfo }: {
  election: any; onUpdate: (v: any) => void; stageInfo: any;
}) {
  const e = election;
  const navigate = useNavigate();
  const { data: posts } = useElectionPosts(e.id);
  const createPost = useCreateElectionPost();
  const deletePost = useDeleteElectionPost();
  const [customPost, setCustomPost] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const stage = stageInfo.stage as ElectionStage;
  const si = stageIndex(stage);

  // Date helpers
  const toDate = (iso: string | null) => iso ? new Date(iso) : null;
  const toISO = (d: Date | null) => d ? d.toISOString() : null;

  const [local, setLocal] = useState({
    status: e.status,
    application_start: toDate(e.application_start),
    application_end: toDate(e.application_end),
    voting_start: toDate(e.voting_start),
    voting_end: toDate(e.voting_end),
    result_visibility: e.result_visibility,
    live_result_settings: parseLiveResultSettings(e.live_result_settings),
  });

  const isDirty =
    local.status !== e.status ||
    toISO(local.application_start) !== (e.application_start || null) ||
    toISO(local.application_end) !== (e.application_end || null) ||
    toISO(local.voting_start) !== (e.voting_start || null) ||
    toISO(local.voting_end) !== (e.voting_end || null) ||
    local.result_visibility !== e.result_visibility ||
    JSON.stringify(local.live_result_settings) !== JSON.stringify(parseLiveResultSettings(e.live_result_settings));

  const handleSave = async () => {
    setSaving(true);
    onUpdate({
      status: local.status,
      result_visibility: local.result_visibility,
      application_start: toISO(local.application_start),
      application_end: toISO(local.application_end),
      voting_start: toISO(local.voting_start),
      voting_end: toISO(local.voting_end),
      live_result_settings: local.live_result_settings,
    });
    setSaving(false);
    toast({ title: "Election updated", description: "All changes saved successfully." });
  };

  const setDate = (key: string, val: Date | null) => setLocal(prev => ({ ...prev, [key]: val }));
  const set = (key: string, val: string) => setLocal(prev => ({ ...prev, [key]: val }));

  const existingNames = new Set(posts?.map((p: any) => p.post_name) || []);

  // Stage-aware locks
  const appDatesLocked = si >= 2; // after applications
  const voteDatesLocked = si >= 3; // during/after voting

  return (
    <div className="space-y-6">
      {/* Timeline Stepper */}
      <ElectionTimeline stage={stage} />

      {/* Quick Actions */}
      <QuickActions stage={stage} election={e} onUpdate={onUpdate} navigate={navigate} />

      {/* Save Bar */}
      {isDirty && (
        <div className="flex items-center justify-between p-3 rounded-lg border border-primary/30 bg-primary/5">
          <p className="text-sm font-medium text-primary">You have unsaved changes</p>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Now"}
          </Button>
        </div>
      )}

      {/* Status Override — collapsed by default for clean look */}
      <details className="group">
        <summary className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Settings2 className="w-3.5 h-3.5" />
          <span>Advanced: Manual Status Override</span>
        </summary>
        <div className="mt-2 sm:w-56">
          <Select value={local.status} onValueChange={v => set("status", v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ADMIN_STATUS_OPTIONS.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </details>

      <Separator />

      {/* Schedule — Stage-aware */}
      {si < 4 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Schedule</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Application Window</p>
              <DateTimePicker
                label="Start"
                date={local.application_start}
                onChange={d => setDate("application_start", d)}
                disabled={appDatesLocked}
              />
              <DateTimePicker
                label="End"
                date={local.application_end}
                onChange={d => setDate("application_end", d)}
                disabled={appDatesLocked}
              />
              {appDatesLocked && <p className="text-[10px] text-muted-foreground">🔒 Locked — applications period has passed</p>}
            </div>
            <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Voting Window</p>
              <DateTimePicker
                label="Start"
                date={local.voting_start}
                onChange={d => setDate("voting_start", d)}
                disabled={voteDatesLocked}
              />
              <DateTimePicker
                label="End"
                date={local.voting_end}
                onChange={d => setDate("voting_end", d)}
                disabled={voteDatesLocked}
              />
              {voteDatesLocked && <p className="text-[10px] text-muted-foreground">🔒 Locked — voting period is active or completed</p>}
            </div>
          </div>
        </div>
      )}

      <Separator />

      {/* Result Settings — show more prominently after voting */}
      <div className={si >= 3 ? "" : ""}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Result Visibility</Label>
            <Select value={local.result_visibility} onValueChange={v => set("result_visibility", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{RESULT_VISIBILITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4">
          <LiveResultSettingsPanel
            settings={local.live_result_settings}
            onUpdate={(settings) => setLocal(prev => ({ ...prev, live_result_settings: settings }))}
          />
        </div>
      </div>

      <Separator />

      {/* Posts */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Election Posts ({posts?.length || 0})</h3>
        <div className="grid sm:grid-cols-2 gap-1.5 mb-4">
          {DEFAULT_ELECTION_POSTS.map(name => {
            const exists = existingNames.has(name);
            return (
              <label key={name} className="flex items-center gap-2 text-sm p-2 rounded-md hover:bg-muted cursor-pointer transition-colors">
                <Checkbox
                  checked={exists}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      createPost.mutate({ election_id: e.id, post_name: name, display_order: posts?.length || 0 });
                    } else {
                      const post = posts?.find((p: any) => p.post_name === name);
                      if (post) deletePost.mutate({ id: post.id, election_id: e.id });
                    }
                  }}
                />
                <span className={exists ? "font-medium" : "text-muted-foreground"}>{name}</span>
              </label>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Add custom post..."
            value={customPost}
            onChange={ev => setCustomPost(ev.target.value)}
            onKeyDown={ev => {
              if (ev.key === "Enter" && customPost.trim()) {
                createPost.mutate({ election_id: e.id, post_name: customPost.trim(), display_order: posts?.length || 0 });
                setCustomPost("");
              }
            }}
          />
          <Button size="sm" variant="outline" onClick={() => {
            if (customPost.trim()) {
              createPost.mutate({ election_id: e.id, post_name: customPost.trim(), display_order: posts?.length || 0 });
              setCustomPost("");
            }
          }}><Plus className="w-3.5 h-3.5" /></Button>
        </div>

        {posts && posts.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-[11px] text-muted-foreground font-semibold uppercase mb-1.5">Selected Posts</p>
            {posts.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-medium">{p.post_name}</span>
                  <span className="text-xs text-muted-foreground">({p.winners_count} winner{p.winners_count > 1 ? "s" : ""})</span>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deletePost.mutate({ id: p.id, election_id: e.id })}>
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Save Button */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={!isDirty || saving} className="gap-1.5">
          {saving ? "Saving..." : "Save Now"}
        </Button>
      </div>
    </div>
  );
}

// ── Quick Actions ────────────────────────────────────────

function QuickActions({ stage, election, onUpdate, navigate }: {
  stage: ElectionStage; election: any; onUpdate: (v: any) => void; navigate: (path: string) => void;
}) {
  const actions: { label: string; icon: React.ReactNode; onClick: () => void; variant?: "default" | "outline" }[] = [];

  if (stage === "draft") {
    actions.push({
      label: "Start Applications",
      icon: <ArrowRight className="w-4 h-4" />,
      onClick: () => onUpdate({ status: "application_open" }),
    });
  }
  if (stage === "applications_closed" || stage === "candidates_published") {
    actions.push({
      label: "Manage Candidates",
      icon: <Users className="w-4 h-4" />,
      onClick: () => navigate("/admin/candidates"),
      variant: "outline",
    });
    if (stage === "applications_closed") {
      actions.push({
        label: "Publish Candidates",
        icon: <ArrowRight className="w-4 h-4" />,
        onClick: () => onUpdate({ status: "published" }),
      });
    }
  }
  if (stage === "voting_closed") {
    actions.push({
      label: "Review Winners",
      icon: <Trophy className="w-4 h-4" />,
      onClick: () => navigate("/admin/winners"),
      variant: "outline",
    });
    actions.push({
      label: "Publish Results",
      icon: <ArrowRight className="w-4 h-4" />,
      onClick: () => onUpdate({ status: "results_published" }),
    });
  }

  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a, i) => (
        <Button key={i} size="sm" variant={a.variant || "default"} className="gap-1.5" onClick={a.onClick}>
          {a.icon} {a.label}
        </Button>
      ))}
    </div>
  );
}

export default AdminElections;
