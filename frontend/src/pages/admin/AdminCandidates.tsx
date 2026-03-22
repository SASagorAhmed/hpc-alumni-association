import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Check, X, Edit, Trash2, User, RefreshCw } from "lucide-react";
import { useElections, useCandidates, useElectionPosts, useCreateCandidate, useUpdateCandidate, useDeleteCandidate } from "@/hooks/useElections";
import { CANDIDATE_STATUSES } from "@/constants/electionPosts";

const AdminCandidates = () => {
  const { data: elections } = useElections();
  const [selectedElection, setSelectedElection] = useState<string | null>(null);
  const { data: candidates, isLoading, refetch } = useCandidates(selectedElection);
  const { data: posts } = useElectionPosts(selectedElection);
  const updateCandidate = useUpdateCandidate();
  const deleteCandidate = useDeleteCandidate();

  const [addOpen, setAddOpen] = useState(false);

  // Auto-select if only one election exists
  useEffect(() => {
    if (!selectedElection && elections?.length) {
      setSelectedElection(elections[0].id);
    }
  }, [elections, selectedElection]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!selectedElection) return;
    const interval = setInterval(() => refetch(), 30000);
    return () => clearInterval(interval);
  }, [selectedElection, refetch]);

  const getPostName = (postId: string) => posts?.find(p => p.id === postId)?.post_name || "Unknown";

  const grouped = (status: string) => candidates?.filter(c => c.status === status) || [];

  // Group candidates by post within a status
  const groupedByPost = (status: string) => {
    const items = grouped(status);
    const map = new Map<string, typeof items>();
    for (const c of items) {
      const list = map.get(c.post_id) || [];
      list.push(c);
      map.set(c.post_id, list);
    }
    return Array.from(map.entries()).map(([postId, cands]) => ({
      postId,
      postName: getPostName(postId),
      candidates: cands,
    }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Candidate Management</h1>
          <p className="text-sm text-muted-foreground">Review applications, manage candidates</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedElection || ""} onValueChange={v => setSelectedElection(v)}>
            <SelectTrigger className="w-48 sm:w-64"><SelectValue placeholder="Select Election" /></SelectTrigger>
            <SelectContent>{elections?.map(e => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}</SelectContent>
          </Select>
          {selectedElection && (
            <>
              <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => refetch()} title="Refresh">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Add</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Add Candidate Manually</DialogTitle></DialogHeader>
                  <ManualCandidateForm electionId={selectedElection} posts={posts || []} onClose={() => setAddOpen(false)} />
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {!selectedElection ? (
        <Card><CardContent className="p-6"><div className="h-48 rounded-lg bg-muted flex items-center justify-center"><p className="text-sm text-muted-foreground">Select an election to manage candidates</p></div></CardContent></Card>
      ) : isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="pending">Pending ({grouped("pending").length})</TabsTrigger>
            <TabsTrigger value="approved_unpublished">Approved ({grouped("approved_unpublished").length})</TabsTrigger>
            <TabsTrigger value="published">Published ({grouped("published").length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({grouped("rejected").length})</TabsTrigger>
          </TabsList>

          {["pending", "approved_unpublished", "published", "rejected"].map(status => (
            <TabsContent key={status} value={status}>
              {grouped(status).length === 0 ? (
                <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No {CANDIDATE_STATUSES.find(s => s.value === status)?.label} candidates</CardContent></Card>
              ) : (
                <div className="space-y-4">
                  {groupedByPost(status).map(group => (
                    <div key={group.postId} className="space-y-2">
                      <h3 className="text-sm font-semibold text-muted-foreground px-1">{group.postName}</h3>
                      {group.candidates.map(c => (
                        <CandidateRow
                          key={c.id}
                          candidate={c}
                          postName={group.postName}
                          posts={posts || []}
                          onApprove={() => updateCandidate.mutate({ id: c.id, election_id: selectedElection!, status: "approved_unpublished" })}
                          onPublish={() => updateCandidate.mutate({ id: c.id, election_id: selectedElection!, status: "published" })}
                          onReject={() => updateCandidate.mutate({ id: c.id, election_id: selectedElection!, status: "rejected" })}
                          onDelete={() => { if (confirm("Delete this candidate?")) deleteCandidate.mutate({ id: c.id, election_id: selectedElection! }); }}
                          onUpdate={(values) => updateCandidate.mutate({ id: c.id, election_id: selectedElection!, ...values })}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};

// ── Candidate Row ────────────────────────────────────────

function CandidateRow({ candidate: c, postName, posts, onApprove, onPublish, onReject, onDelete, onUpdate }: {
  candidate: any; postName: string; posts: any[];
  onApprove: () => void; onPublish: () => void; onReject: () => void;
  onDelete: () => void; onUpdate: (v: any) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: c.name, batch: c.batch || "", manifesto: c.manifesto || "",
    candidate_number: c.candidate_number?.toString() || "", post_id: c.post_id,
    phone: c.phone || "", email: c.email || "",
  });

  return (
    <Card>
      <CardContent className="p-3 sm:p-4">
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-xs">Name</Label><Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label className="text-xs">Batch</Label><Input value={editForm.batch} onChange={e => setEditForm(f => ({ ...f, batch: e.target.value }))} /></div>
              <div><Label className="text-xs">Candidate #</Label><Input type="number" value={editForm.candidate_number} onChange={e => setEditForm(f => ({ ...f, candidate_number: e.target.value }))} /></div>
              <div><Label className="text-xs">Post</Label>
                <Select value={editForm.post_id} onValueChange={v => setEditForm(f => ({ ...f, post_id: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{posts.map(p => <SelectItem key={p.id} value={p.id}>{p.post_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Phone</Label><Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><Label className="text-xs">Email</Label><Input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs">About (candidate)</Label><Textarea value={editForm.manifesto} onChange={e => setEditForm(f => ({ ...f, manifesto: e.target.value }))} rows={2} /></div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => {
                onUpdate({
                  name: editForm.name, batch: editForm.batch || null, manifesto: editForm.manifesto || null,
                  candidate_number: editForm.candidate_number ? parseInt(editForm.candidate_number) : null,
                  post_id: editForm.post_id, phone: editForm.phone || null, email: editForm.email || null,
                });
                setEditing(false);
              }}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                {c.photo_url ? <img src={c.photo_url} className="w-10 h-10 rounded-full object-cover" /> : <User className="w-5 h-5 text-muted-foreground" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{c.name}</span>
                  {c.candidate_number && <Badge variant="secondary" className="text-xs">#{c.candidate_number}</Badge>}
                  {c.is_manual && <Badge variant="outline" className="text-xs">Manual</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{postName} · Batch: {c.batch || "—"}</p>
                {c.phone && <p className="text-xs text-muted-foreground">📞 {c.phone} {c.email && `· ✉️ ${c.email}`}</p>}
                {c.manifesto && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.manifesto}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
              {c.status === "pending" && (
                <>
                  <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-300 h-8" onClick={onApprove}><Check className="w-3.5 h-3.5 mr-1" /> Approve</Button>
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30 h-8" onClick={onReject}><X className="w-3.5 h-3.5 mr-1" /> Reject</Button>
                </>
              )}
              {c.status === "approved_unpublished" && (
                <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-300 h-8" onClick={onPublish}><Check className="w-3.5 h-3.5 mr-1" /> Publish</Button>
              )}
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(true)}><Edit className="w-3.5 h-3.5" /></Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onDelete}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Manual Candidate Form ────────────────────────────────

function ManualCandidateForm({ electionId, posts, onClose }: { electionId: string; posts: any[]; onClose: () => void }) {
  const createCandidate = useCreateCandidate();
  const [form, setForm] = useState({
    name: "", batch: "", post_id: "", candidate_number: "", manifesto: "", phone: "", email: "", status: "approved_unpublished",
  });

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.post_id) return;
    await createCandidate.mutateAsync({
      election_id: electionId,
      post_id: form.post_id,
      name: form.name,
      batch: form.batch || undefined,
      candidate_number: form.candidate_number ? parseInt(form.candidate_number) : undefined,
      manifesto: form.manifesto || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      is_manual: true,
      status: form.status,
    });
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
        <div><Label>Batch</Label><Input value={form.batch} onChange={e => setForm(f => ({ ...f, batch: e.target.value }))} /></div>
        <div><Label>Post *</Label>
          <Select value={form.post_id} onValueChange={v => setForm(f => ({ ...f, post_id: v }))}>
            <SelectTrigger><SelectValue placeholder="Select post" /></SelectTrigger>
            <SelectContent>{posts.map(p => <SelectItem key={p.id} value={p.id}>{p.post_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Candidate #</Label><Input type="number" value={form.candidate_number} onChange={e => setForm(f => ({ ...f, candidate_number: e.target.value }))} /></div>
        <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
        <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
      </div>
      <div><Label>About (candidate)</Label><Textarea value={form.manifesto} onChange={e => setForm(f => ({ ...f, manifesto: e.target.value }))} rows={3} /></div>
      <div><Label>Initial Status</Label>
        <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="approved_unpublished">Approved (Unpublished)</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="pending">Pending Review</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={handleSubmit} disabled={createCandidate.isPending} className="w-full">{createCandidate.isPending ? "Adding..." : "Add Candidate"}</Button>
    </div>
  );
}

export default AdminCandidates;
