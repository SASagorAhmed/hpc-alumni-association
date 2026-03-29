import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { API_BASE_URL } from "@/api-production/api.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Send,
  Building2,
  Loader2,
  X,
  UserPlus,
} from "lucide-react";
import { BOARD_SECTION_OPTIONS, type BoardSectionKey } from "@/components/committee/boardSections";
import { CommitteePhotoCropDialog } from "@/components/admin/CommitteePhotoCropDialog";
import { getAuthToken } from "@/lib/authToken";

const authHeaders = () => ({
  Authorization: `Bearer ${getAuthToken()}`,
});

const FIXED_COLLEGE_NAME = "Hamdard Public Collage";

interface CommitteeTerm {
  id: string;
  name: string;
  description: string | null;
  status: "draft" | "published";
  is_current: number;
}

interface CommitteePost {
  id: string;
  term_id: string;
  title: string;
  allows_multiple: number;
  is_highlight: number;
  display_order: number;
  board_section?: string | null;
  members?: CommitteeMember[];
}

function isPresidentLikeCommitteePost(p: CommitteePost | undefined): boolean {
  if (!p) return false;
  if (p.is_highlight === 1) return true;
  return /সভাপতি|president/i.test(String(p.title || ""));
}

/** Wishing message: 50 words max for every post (matches backend + public card). */
function getWishingMaxWordsForPostId(_postId: string, _posts: CommitteePost[] | undefined): number {
  return 50;
}

interface CommitteeMember {
  id: string;
  term_id: string | null;
  post_id: string | null;
  name: string;
  designation: string;
  category: string;
  batch: string | null;
  alumni_id: string | null;
  phone: string | null;
  email: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  candidate_number: string | null;
  college_name: string | null;
  institution: string | null;
  job_status: string | null;
  profession: string | null;
  about: string | null;
  wishing_message: string | null;
  winner_about: string | null;
  location: string | null;
  expertise: string | null;
  photo_url: string | null;
  display_order: number;
  is_active: boolean | number;
}

type DropdownOption = { id: string; value: string; persisted?: boolean };

const emptyMemberForm = {
  name: "",
  designation: "",
  category: "executive",
  batch: "",
  alumni_id: "",
  phone: "",
  email: "",
  facebook_url: "",
  instagram_url: "",
  linkedin_url: "",
  candidate_number: "",
  college_name: FIXED_COLLEGE_NAME,
  institution: "",
  job_status: "",
  profession: "",
  about: "",
  wishing_message: "",
  winner_about: "",
  location: "",
  expertise: "",
  photo_url: "",
  display_order: 0,
  is_active: true as boolean,
  post_id: "",
};

const WINNER_ABOUT_MAX_WORDS = 250;

const AdminCommittee = () => {
  const wordCount = (text: string) =>
    String(text || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;

  const qc = useQueryClient();
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [termDialogOpen, setTermDialogOpen] = useState(false);
  const [newTerm, setNewTerm] = useState({ name: "", description: "" });
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<CommitteePost | null>(null);
  const [postForm, setPostForm] = useState({
    title: "",
    allows_multiple: true,
    is_highlight: false,
    board_section: "committee_members" as BoardSectionKey,
  });
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<CommitteeMember | null>(null);
  const [memberForm, setMemberForm] = useState(emptyMemberForm);
  const [uploading, setUploading] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropFileName, setCropFileName] = useState("committee-photo.jpg");
  const [importOpen, setImportOpen] = useState(false);
  const [importTargetPost, setImportTargetPost] = useState<CommitteePost | null>(null);
  const [importAlumniId, setImportAlumniId] = useState("");

  // Profession options CRUD
  const [professionManageOpen, setProfessionManageOpen] = useState(false);
  const [newProfessionValue, setNewProfessionValue] = useState("");
  const [editingProfessionId, setEditingProfessionId] = useState<string | null>(null);
  const [editingProfessionValue, setEditingProfessionValue] = useState("");

  // Job status options CRUD
  const [jobStatusManageOpen, setJobStatusManageOpen] = useState(false);
  const [newJobStatusValue, setNewJobStatusValue] = useState("");
  const [editingJobStatusId, setEditingJobStatusId] = useState<string | null>(null);
  const [editingJobStatusValue, setEditingJobStatusValue] = useState("");

  const { data: terms = [], isLoading: loadingTerms } = useQuery({
    queryKey: ["admin-committee-terms"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/admin/committee/terms`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load terms");
      return res.json() as CommitteeTerm[];
    },
  });

  const { data: fullData, isLoading: loadingFull } = useQuery({
    queryKey: ["admin-committee-full", selectedTermId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/admin/committee/terms/${selectedTermId}/full`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load term detail");
      return res.json() as { term: CommitteeTerm; posts: CommitteePost[] };
    },
    enabled: !!selectedTermId,
  });

  const wishingMaxWordsForMemberForm = useMemo(
    () => getWishingMaxWordsForPostId(memberForm.post_id, fullData?.posts),
    [memberForm.post_id, fullData?.posts],
  );

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["admin-committee-terms"] });
    qc.invalidateQueries({ queryKey: ["admin-committee-full"] });
    qc.invalidateQueries({ queryKey: ["committee-active-public"] });
    qc.invalidateQueries({ queryKey: ["committee-terms-public"] });
    qc.invalidateQueries({ queryKey: ["committee-profession-options"] });
    qc.invalidateQueries({ queryKey: ["committee-job-status-options"] });
  };

  const { data: professionOptions = [] } = useQuery({
    queryKey: ["committee-profession-options"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/admin/committee/profession-options`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load professions");
      return res.json() as DropdownOption[];
    },
  });

  const { data: jobStatusOptions = [] } = useQuery({
    queryKey: ["committee-job-status-options"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/admin/committee/job-status-options`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load job statuses");
      return res.json() as DropdownOption[];
    },
  });

  const createTermMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/admin/committee/terms`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTerm.name, description: newTerm.description || null, status: "draft" }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      return res.json() as { id: string };
    },
    onSuccess: (d) => {
      toast({ title: "Term created" });
      setTermDialogOpen(false);
      setNewTerm({ name: "", description: "" });
      invalidateAll();
      setSelectedTermId(d.id);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const seedPostsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/admin/committee/terms/${selectedTermId}/seed-default-posts`, {
        method: "POST",
        headers: authHeaders(),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to seed");
    },
    onSuccess: () => {
      toast({ title: "Default posts added" });
      invalidateAll();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const backfillSectionsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/committee/terms/${selectedTermId}/backfill-board-sections`,
        { method: "POST", headers: authHeaders() }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Backfill failed");
      return body as { updated?: number };
    },
    onSuccess: (data) => {
      toast({
        title: "Sections updated",
        description: `Set board section from titles for ${data?.updated ?? 0} post(s).`,
      });
      invalidateAll();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const publishMutation = useMutation({
    mutationFn: async (setAsCurrent: boolean) => {
      const res = await fetch(`${API_BASE_URL}/api/admin/committee/terms/${selectedTermId}/publish`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ setAsCurrent: setAsCurrent }),
      });
      if (!res.ok) throw new Error("Publish failed");
    },
    onSuccess: () => {
      toast({ title: "Committee published" });
      invalidateAll();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const savePostMutation = useMutation({
    mutationFn: async () => {
      if (editingPost) {
        const res = await fetch(`${API_BASE_URL}/api/admin/committee/posts/${editingPost.id}`, {
          method: "PUT",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({
            title: postForm.title,
            allows_multiple: postForm.allows_multiple,
            is_highlight: postForm.is_highlight,
            board_section: postForm.board_section,
          }),
        });
        if (!res.ok) throw new Error("Update failed");
      } else if (selectedTermId) {
        const res = await fetch(`${API_BASE_URL}/api/admin/committee/posts`, {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({
            term_id: selectedTermId,
            title: postForm.title,
            allows_multiple: postForm.allows_multiple,
            is_highlight: postForm.is_highlight,
            board_section: postForm.board_section,
          }),
        });
        if (!res.ok) throw new Error("Create failed");
      }
    },
    onSuccess: () => {
      toast({ title: editingPost ? "Post updated" : "New post" });
      setPostDialogOpen(false);
      setEditingPost(null);
      invalidateAll();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deletePostMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/api/admin/committee/posts/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      toast({ title: "Post deleted" });
      invalidateAll();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const reorderPostsApi = async (posts: CommitteePost[]) => {
    const sorted = [...posts].sort((a, b) => a.display_order - b.display_order);
    const orders = sorted.map((p, i) => ({ id: p.id, display_order: i }));
    const res = await fetch(`${API_BASE_URL}/api/admin/committee/posts-reorder`, {
      method: "PUT",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ orders }),
    });
    if (!res.ok) throw new Error("Reorder failed");
    invalidateAll();
  };

  const movePost = async (posts: CommitteePost[], index: number, dir: -1 | 1) => {
    try {
      const sorted = [...posts].sort((a, b) => a.display_order - b.display_order);
      const j = index + dir;
      if (j < 0 || j >= sorted.length) return;
      [sorted[index], sorted[j]] = [sorted[j], sorted[index]];
      await reorderPostsApi(sorted);
    } catch (e) {
      toast({ title: "Reorder failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const setDraftMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/admin/committee/terms/${selectedTermId}`, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast({ title: "Saved as draft" });
      invalidateAll();
    },
  });

  const deleteTermMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/admin/committee/terms/${selectedTermId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast({ title: "Term deleted" });
      setSelectedTermId(null);
      invalidateAll();
    },
  });

  const uploadCommitteePhoto = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    setUploading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/uploads/committee`, {
        method: "POST",
        headers: authHeaders(),
        body: fd,
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Upload failed");
      return j.secure_url as string;
    } finally {
      setUploading(false);
    }
  };

  const saveMemberMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTermId || !memberForm.post_id) throw new Error("Select a post");
      if (wordCount(memberForm.wishing_message || "") > wishingMaxWordsForMemberForm) {
        throw new Error(`Wishing you: max ${wishingMaxWordsForMemberForm} words for this post`);
      }
      if (wordCount(memberForm.winner_about || "") > WINNER_ABOUT_MAX_WORDS) {
        throw new Error(`About winner: max ${WINNER_ABOUT_MAX_WORDS} words`);
      }
      const base = {
        ...memberForm,
        is_active: memberForm.is_active,
        designation: memberForm.designation || undefined,
        // Executive team should not store address/location, expertise, or about.
        location: null,
        expertise: null,
        about: null,
        college_name: FIXED_COLLEGE_NAME,
      };
      if (editingMember) {
        const res = await fetch(`${API_BASE_URL}/api/admin/committee/members/${editingMember.id}`, {
          method: "PUT",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ ...base, term_id: selectedTermId }),
        });
        if (!res.ok) {
          const b = await res.json().catch(() => ({}));
          throw new Error(b.error || "Update failed");
        }
      } else {
        const res = await fetch(`${API_BASE_URL}/api/admin/committee/members`, {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ ...base, term_id: selectedTermId, post_id: memberForm.post_id }),
        });
        if (!res.ok) {
          const b = await res.json().catch(() => ({}));
          throw new Error(b.error || "Create failed");
        }
      }
    },
    onSuccess: () => {
      toast({ title: editingMember ? "Member updated" : "Member added" });
      setMemberDialogOpen(false);
      setEditingMember(null);
      setMemberForm(emptyMemberForm);
      invalidateAll();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/api/admin/committee/members/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast({ title: "Member removed" });
      invalidateAll();
    },
  });

  const importFromAlumniMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTermId || !importTargetPost) throw new Error("Select a term and post");
      const aid = importAlumniId.trim();
      if (!aid) throw new Error("Enter Alumni ID (registration number from the alumni profile)");
      const res = await fetch(
        `${API_BASE_URL}/api/admin/committee/posts/${importTargetPost.id}/import-from-alumni`,
        {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ term_id: selectedTermId, alumni_id: aid }),
        }
      );
      const b = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(b.error || "Could not import member");
      return b;
    },
    onSuccess: () => {
      toast({
        title: "Imported from alumni profile",
        description: "Details were filled from the directory profile. They can still edit committee-only fields (e.g. wishing message).",
      });
      setImportOpen(false);
      setImportTargetPost(null);
      setImportAlumniId("");
      invalidateAll();
    },
    onError: (e: Error) => toast({ title: "Import failed", description: e.message, variant: "destructive" }),
  });

  const posts = fullData?.posts ? [...fullData.posts].sort((a, b) => a.display_order - b.display_order) : [];
  const term = fullData?.term;
  const selectedPost = posts.find((p) => p.id === memberForm.post_id);

  const getCommitteePhotoPreset = (post: CommitteePost | undefined) => {
    if (!post) {
      return { label: "Committee member", outputSize: 560 };
    }
    if (isPresidentLikeCommitteePost(post)) {
      return { label: "President", outputSize: 900 };
    }
    const section = String(post.board_section || "").trim();
    if (section === "governing_body") return { label: "Governing Body", outputSize: 760 };
    if (section === "executive_committee") return { label: "Executive Committee", outputSize: 680 };
    if (section === "committee_heads") return { label: "Committee Heads", outputSize: 620 };
    return { label: "Committee Members", outputSize: 560 };
  };
  const committeePhotoPreset = getCommitteePhotoPreset(selectedPost);

  const openAddPost = () => {
    setEditingPost(null);
    setPostForm({
      title: "",
      allows_multiple: true,
      is_highlight: false,
      board_section: "committee_members",
    });
    setPostDialogOpen(true);
  };
  const openEditPost = (p: CommitteePost) => {
    setEditingPost(p);
    const b = String(p.board_section || "").trim();
    const section: BoardSectionKey =
      b === "governing_body" ||
      b === "executive_committee" ||
      b === "committee_heads" ||
      b === "committee_members"
        ? b
        : "committee_members";
    setPostForm({
      title: p.title,
      allows_multiple: !!p.allows_multiple,
      is_highlight: !!p.is_highlight,
      board_section: section,
    });
    setPostDialogOpen(true);
  };

  const openAddMember = (postId?: string) => {
    setEditingMember(null);
    const nextPostId = postId || posts[0]?.id || "";
    const nextPostTitle = posts.find((p) => p.id === nextPostId)?.title || "";
    setMemberForm({ ...emptyMemberForm, post_id: nextPostId, designation: nextPostTitle });
    setMemberDialogOpen(true);
  };

  const openEditMember = (m: CommitteeMember) => {
    setEditingMember(m);
    setMemberForm({
      name: m.name,
      designation: m.designation,
      category: m.category,
      batch: m.batch ?? "",
      alumni_id: m.alumni_id ?? "",
      phone: m.phone ?? "",
      email: m.email ?? "",
      facebook_url: (m as any).facebook_url ?? "",
      instagram_url: (m as any).instagram_url ?? "",
      linkedin_url: (m as any).linkedin_url ?? "",
      candidate_number: m.candidate_number ?? "",
      college_name: m.college_name ?? FIXED_COLLEGE_NAME,
      institution: m.institution ?? "",
      job_status: m.job_status ?? "",
      profession: m.profession ?? "",
      about: m.about ?? "",
      wishing_message: (m as any).wishing_message ?? "",
      winner_about: (m as any).winner_about ?? "",
      location: m.location ?? "",
      expertise: m.expertise ?? "",
      photo_url: m.photo_url ?? "",
      display_order: m.display_order,
      is_active: !!m.is_active,
      post_id: m.post_id || "",
    });
    setMemberDialogOpen(true);
  };

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-8 pb-16">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-7 w-7 text-primary" />
              Alumni Committee
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Term → posts (titles can be in Bangla) → members. Draft, default posts, publish, and photo upload.
            </p>
          </div>
          <Button
            onClick={() => {
              setNewTerm({ name: "", description: "" });
              setTermDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> New term
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Terms</CardTitle>
              <CardDescription>Select one to manage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[480px] overflow-y-auto">
              {loadingTerms ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : terms.length === 0 ? (
                <p className="text-sm text-muted-foreground">No terms yet. Create one above.</p>
              ) : (
                terms.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTermId(t.id)}
                    className={`w-full text-left rounded-lg border p-3 transition-colors ${
                      selectedTermId === t.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="font-medium">{t.name}</div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <Badge variant={t.status === "published" ? "default" : "secondary"}>{t.status}</Badge>
                      {!!t.is_current && <Badge variant="outline">Active</Badge>}
          </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <div className="md:col-span-2 space-y-6">
            {!selectedTermId ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground text-sm">
                  Select a term on the left or create a new one.
                </CardContent>
              </Card>
            ) : loadingFull ? (
              <Card>
                <CardContent className="py-12 flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            ) : term ? (
              <>
                <Card>
                  <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      <CardTitle>{term.name}</CardTitle>
                      {term.description && (
                        <CardDescription className="mt-2 max-w-prose">{term.description}</CardDescription>
                      )}
        </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="default" size="sm" onClick={openAddPost}>
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add custom post
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => seedPostsMutation.mutate()}
                        disabled={seedPostsMutation.isPending || posts.length > 0}
                        title={
                          posts.length > 0
                            ? "Defaults can only load when there are no posts yet. Use Add custom post for more roles."
                            : "Insert the standard Bangla post list"
                        }
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1" />
                        Default posts
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!window.confirm(
                            "Set each post’s public section from its title? This overwrites board_section for all posts in this term (matched titles only; unknown titles become Committee Members)."
                          )) return;
                          backfillSectionsMutation.mutate();
                        }}
                        disabled={backfillSectionsMutation.isPending || !posts.length}
                        title="Fix legacy terms: governing / executive / heads / members from Bangla title rules"
                      >
                        Backfill sections
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => publishMutation.mutate(true)}
                        disabled={publishMutation.isPending}
                      >
                        <Send className="h-3.5 w-3.5 mr-1" />
                        Publish & set active
                      </Button>
                      {term.status === "published" && (
                        <Button variant="secondary" size="sm" onClick={() => setDraftMutation.mutate()}>
                          Draft
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (
                            window.confirm("Delete this term and all its posts and members?")
                          )
                            deleteTermMutation.mutate();
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                </Card>

            <Card>
                  <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="text-base">Posts</CardTitle>
                      <CardDescription className="mt-1 max-w-prose">
                        Each post is assigned to one of four public sections (Governing Body, Executive Committee, Committee Heads,
                        Committee Members). Titles can be Bangla or English; you can still add custom posts anytime.
                      </CardDescription>
                    </div>
                    <Button size="sm" variant="secondary" onClick={openAddPost}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add custom post
                    </Button>
                  </CardHeader>
              <CardContent className="p-0">
                    {posts.length === 0 ? (
                      <p className="p-6 text-sm text-muted-foreground">No posts yet. Use &quot;Default posts&quot; or add manually.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                            <TableHead className="w-20">Order</TableHead>
                            <TableHead className="min-w-[200px]">Post title</TableHead>
                            <TableHead className="min-w-[120px]">Section</TableHead>
                            <TableHead>Type</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                          {posts.map((p, idx) => (
                            <TableRow key={p.id}>
                              <TableCell className="font-mono text-xs">
                                <div className="flex items-center gap-1">
                                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => movePost(posts, idx, -1)}>
                                    <ArrowUp className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => movePost(posts, idx, 1)}>
                                    <ArrowDown className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell className="font-medium text-foreground leading-snug break-words whitespace-normal">
                                {p.title}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {BOARD_SECTION_OPTIONS.find((o) => o.value === (p.board_section as BoardSectionKey))?.label.split("(")[0].trim() ||
                                  p.board_section ||
                                  "—"}
                              </TableCell>
                          <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {p.allows_multiple ? (
                                    <Badge variant="secondary">Multiple</Badge>
                                  ) : (
                                    <Badge variant="outline">Single</Badge>
                                  )}
                                  {!!p.is_highlight && <Badge>Highlight</Badge>}
                                </div>
                          </TableCell>
                          <TableCell className="text-right">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditPost(p)}>
                                  <Pencil className="h-3.5 w-3.5" />
                              </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => deletePostMutation.mutate(p.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

                {posts.map((p) => (
                  <Card key={p.id}>
                    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
                      <div className="min-w-0 pr-2">
                        <CardTitle className="text-base leading-snug break-words">{p.title}</CardTitle>
                        <CardDescription>
                          {(p.members || []).length} member{(p.members || []).length === 1 ? "" : "s"} ·{" "}
                          {p.allows_multiple ? "Multiple members allowed" : "Only one active member"}
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          type="button"
                          onClick={() => {
                            setImportTargetPost(p);
                            setImportAlumniId("");
                            setImportOpen(true);
                          }}
                        >
                          <UserPlus className="h-3.5 w-3.5 mr-1" />
                          From alumni ID
                        </Button>
                        <Button size="sm" type="button" onClick={() => openAddMember(p.id)}>
                          <Plus className="h-3.5 w-3.5 mr-1" /> Add member
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {(p.members || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No members yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {(p.members || []).map((m) => (
                            <div
                              key={m.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 bg-muted/30"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-12 w-12 rounded-full overflow-hidden bg-muted shrink-0 border">
                                  {m.photo_url ? (
                                    <img src={m.photo_url} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">—</div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium truncate">{m.name}</div>
                                  <div className="text-xs font-medium text-primary/90 leading-snug break-words">{p.title}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {m.batch && `Batch ${m.batch}`}
                                    {m.alumni_id && ` · ID ${m.alumni_id}`}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => openEditMember(m)}>
                                  Edit
                                </Button>
                                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteMemberMutation.mutate(m.id)}>
                                  Delete
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Import committee member from alumni ID */}
      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open);
          if (!open) {
            setImportTargetPost(null);
            setImportAlumniId("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fill post from alumni ID</DialogTitle>
            <DialogDescription className="text-left">
              Post: <span className="font-medium text-foreground">{importTargetPost?.title || "—"}</span>. Enter the{" "}
              <strong>Alumni ID</strong> (registration number on the member&apos;s profile). Name, photo, contact, batch,
              profession, and social links are copied into this committee seat. The standard &quot;Congratulations…&quot; wishing
              block is filled automatically (except for posts in the <strong>Governing Body</strong> section—leave that blank or add
              manually). The alumni&apos;s profile will show this post under &quot;Committee designation&quot; for the current published
              term. Manual &quot;Add member&quot; is unchanged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="import-alumni-id">Alumni ID *</Label>
              <Input
                id="import-alumni-id"
                placeholder="e.g. A01118849"
                value={importAlumniId}
                onChange={(e) => setImportAlumniId(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={importFromAlumniMutation.isPending} onClick={() => importFromAlumniMutation.mutate()}>
              {importFromAlumniMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing…
                </>
              ) : (
                "Import"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Term dialog */}
      <Dialog open={termDialogOpen} onOpenChange={setTermDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New committee term</DialogTitle>
            <DialogDescription>e.g. 2025–2027</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
              <div>
              <Label>Name *</Label>
              <Input value={newTerm.name} onChange={(e) => setNewTerm({ ...newTerm, name: e.target.value })} placeholder="2025–2027" />
            </div>
              <div>
              <Label>Description (optional)</Label>
              <Textarea value={newTerm.description} onChange={(e) => setNewTerm({ ...newTerm, description: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTermDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => createTermMutation.mutate()} disabled={!newTerm.name.trim() || createTermMutation.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post dialog */}
      <Dialog open={postDialogOpen} onOpenChange={setPostDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPost ? "Edit post" : "New post"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Post title (Bangla or English)</Label>
              <Input value={postForm.title} onChange={(e) => setPostForm({ ...postForm, title: e.target.value })} />
            </div>
            <div>
              <Label>Section on public committee page</Label>
              <Select
                value={postForm.board_section}
                onValueChange={(v) => setPostForm({ ...postForm, board_section: v as BoardSectionKey })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                  <SelectContent>
                  {BOARD_SECTION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                  </SelectContent>
                </Select>
              </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="am"
                checked={postForm.allows_multiple}
                onCheckedChange={(c) => setPostForm({ ...postForm, allows_multiple: !!c })}
              />
              <Label htmlFor="am">Allow multiple members</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="hl"
                checked={postForm.is_highlight}
                onCheckedChange={(c) => setPostForm({ ...postForm, is_highlight: !!c })}
              />
              <Label htmlFor="hl">Highlight (president-style emphasis)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => savePostMutation.mutate()} disabled={!postForm.title.trim() || savePostMutation.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Member dialog */}
      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMember ? "Edit member" : "Add member"}</DialogTitle>
            <DialogDescription>Professional photo and batch are recommended.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>Post *</Label>
              <Select
                value={memberForm.post_id}
                onValueChange={(v) => {
                  const nextTitle = posts.find((p) => p.id === v)?.title || "";
                  setMemberForm({ ...memberForm, post_id: v, designation: nextTitle });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select post" />
                </SelectTrigger>
                <SelectContent>
                  {posts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Name *</Label>
                <Input value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} />
            </div>
              <div>
                <Label>Designation (fixed)</Label>
                <Input value={memberForm.designation} disabled />
              </div>
              <div>
                <Label>Batch *</Label>
                <Input value={memberForm.batch} onChange={(e) => setMemberForm({ ...memberForm, batch: e.target.value })} />
              </div>
              <div>
                <Label>Alumni ID</Label>
                <Input value={memberForm.alumni_id} onChange={(e) => setMemberForm({ ...memberForm, alumni_id: e.target.value })} />
              </div>
              <div>
                <Label>Candidate number</Label>
                <Input value={memberForm.candidate_number} onChange={(e) => setMemberForm({ ...memberForm, candidate_number: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={memberForm.phone} onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} />
              </div>
              <div>
                <Label>Facebook URL</Label>
                <Input value={memberForm.facebook_url || ""} onChange={(e) => setMemberForm({ ...memberForm, facebook_url: e.target.value })} />
              </div>
              <div>
                <Label>Instagram URL</Label>
                <Input value={memberForm.instagram_url || ""} onChange={(e) => setMemberForm({ ...memberForm, instagram_url: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>LinkedIn URL</Label>
                <Input value={memberForm.linkedin_url || ""} onChange={(e) => setMemberForm({ ...memberForm, linkedin_url: e.target.value })} />
              </div>
              <div className="col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="shrink-0">Profession</Label>
                  <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => setProfessionManageOpen(true)}>
                    Manage professions
                  </Button>
                </div>
                <Select value={memberForm.profession || ""} onValueChange={(v) => setMemberForm({ ...memberForm, profession: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select profession" />
                  </SelectTrigger>
                  <SelectContent>
                    {professionOptions.map((o) => (
                      <SelectItem key={o.id} value={o.value}>
                        {o.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <Label className="shrink-0">Photo</Label>
                <Input
                  type="file"
                  accept="image/*"
                  className="flex-1"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const localUrl = URL.createObjectURL(f);
                    setCropImageSrc(localUrl);
                    setCropFileName(f.name || "committee-photo.jpg");
                    setCropOpen(true);
                    e.currentTarget.value = "";
                  }}
                />
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              {memberForm.photo_url ? (
                <div className="col-span-2">
                  <div className="flex items-center gap-3 rounded-md border p-2">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-muted">
                      <img src={memberForm.photo_url} alt="Member" className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-muted-foreground">{memberForm.photo_url}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      title="Remove photo"
                      onClick={() => setMemberForm((prev) => ({ ...prev, photo_url: "" }))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Click X then Save to remove this photo from member profile (old cloud photo will be cleaned automatically).
                  </p>
                </div>
              ) : null}
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">
                  Photo is cropped before upload ({committeePhotoPreset.label}: {committeePhotoPreset.outputSize}x{committeePhotoPreset.outputSize}px square).
                </p>
              </div>
              <div className="col-span-2">
                <Label>Photo URL</Label>
                <Input value={memberForm.photo_url} onChange={(e) => setMemberForm({ ...memberForm, photo_url: e.target.value })} />
              </div>
              <Separator className="col-span-2" />
              <div>
                <Label>University name</Label>
                <Input value={memberForm.institution} onChange={(e) => setMemberForm({ ...memberForm, institution: e.target.value })} />
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <Label className="shrink-0">Job status</Label>
                  <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => setJobStatusManageOpen(true)}>
                    Manage job status
                  </Button>
                </div>
                <Select value={memberForm.job_status || ""} onValueChange={(v) => setMemberForm({ ...memberForm, job_status: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select job status" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobStatusOptions.map((o) => (
                      <SelectItem key={o.id} value={o.value}>
                        {o.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>College name (fixed)</Label>
                <Input value={FIXED_COLLEGE_NAME} disabled />
              </div>
              <div className="col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <Label>Wishing you</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Maximum 50 words; public committee cards show the full message up to this limit.
                    </p>
                  </div>
                  <span
                    className={`text-xs shrink-0 ${wordCount(memberForm.wishing_message || "") > wishingMaxWordsForMemberForm ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {wordCount(memberForm.wishing_message || "")}/{wishingMaxWordsForMemberForm} words
                  </span>
                </div>
                <Textarea
                  rows={4}
                  className="mt-1"
                  value={memberForm.wishing_message || ""}
                  onChange={(e) => setMemberForm({ ...memberForm, wishing_message: e.target.value })}
                  placeholder={`Wishing you (max ${wishingMaxWordsForMemberForm} words for selected post)`}
                />
                {wordCount(memberForm.wishing_message || "") > wishingMaxWordsForMemberForm ? (
                  <p className="mt-1 text-xs text-destructive">reduce word, max {wishingMaxWordsForMemberForm}</p>
                ) : null}
              </div>
              <div className="col-span-2">
                <div className="flex items-center justify-between">
                  <Label>About winner</Label>
                  <span
                    className={`text-xs ${wordCount(memberForm.winner_about || "") > WINNER_ABOUT_MAX_WORDS ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {wordCount(memberForm.winner_about || "")}/{WINNER_ABOUT_MAX_WORDS} words
                  </span>
                </div>
                <Textarea
                  rows={4}
                  value={memberForm.winner_about || ""}
                  onChange={(e) => setMemberForm({ ...memberForm, winner_about: e.target.value })}
                  placeholder={`About winner (max ${WINNER_ABOUT_MAX_WORDS} words)`}
                />
                {wordCount(memberForm.winner_about || "") > WINNER_ABOUT_MAX_WORDS ? (
                  <p className="mt-1 text-xs text-destructive">reduce word, max {WINNER_ABOUT_MAX_WORDS}</p>
                ) : null}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => saveMemberMutation.mutate()}
              disabled={
                !memberForm.name.trim() ||
                !memberForm.batch.trim() ||
                !memberForm.post_id ||
                !String(memberForm.profession || "").trim() ||
                !String(memberForm.job_status || "").trim() ||
                wordCount(memberForm.wishing_message || "") > wishingMaxWordsForMemberForm ||
                wordCount(memberForm.winner_about || "") > WINNER_ABOUT_MAX_WORDS ||
                saveMemberMutation.isPending
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CommitteePhotoCropDialog
        open={cropOpen}
        imageSrc={cropImageSrc}
        onOpenChange={(open) => {
          setCropOpen(open);
          if (!open && cropImageSrc) {
            URL.revokeObjectURL(cropImageSrc);
            setCropImageSrc(null);
          }
        }}
        presetLabel={committeePhotoPreset.label}
        outputSize={committeePhotoPreset.outputSize}
        onCropped={async (blob) => {
          const baseName = cropFileName.replace(/\.[^/.]+$/, "") || "committee-photo";
          const croppedFile = new File([blob], `${baseName}-cropped.jpg`, { type: "image/jpeg" });
          try {
            const url = await uploadCommitteePhoto(croppedFile);
            setMemberForm((prev) => ({ ...prev, photo_url: url }));
            toast({ title: "Photo cropped and uploaded" });
          } catch (err) {
            toast({ title: "Upload failed", description: (err as Error).message, variant: "destructive" });
          } finally {
            if (cropImageSrc) {
              URL.revokeObjectURL(cropImageSrc);
              setCropImageSrc(null);
            }
          }
        }}
      />

      {/* Profession options CRUD */}
      <Dialog
        open={professionManageOpen}
        modal={false}
        onOpenChange={(open) => {
          setProfessionManageOpen(open);
          if (!open) {
            setNewProfessionValue("");
            setEditingProfessionId(null);
            setEditingProfessionValue("");
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Manage professions</DialogTitle>
            <DialogDescription>Dropdown options for executive committee member “Profession”.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>New profession</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={newProfessionValue}
                  onChange={(e) => setNewProfessionValue(e.target.value)}
                  placeholder="e.g. Teaching"
                />
                <Button
                  type="button"
                  onClick={async () => {
                    const value = newProfessionValue.trim();
                    if (!value) return;
                    const res = await fetch(`${API_BASE_URL}/api/admin/committee/profession-options`, {
                      method: "POST",
                      headers: { ...authHeaders(), "Content-Type": "application/json" },
                      body: JSON.stringify({ value }),
                    });
                    if (!res.ok) {
                      toast({ title: "Add failed", description: (await res.json().catch(() => ({}))).error, variant: "destructive" });
                      return;
                    }
                    setNewProfessionValue("");
                    qc.invalidateQueries({ queryKey: ["committee-profession-options"] });
                  }}
                  disabled={!newProfessionValue.trim()}
                >
                  Add
            </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Saved options</Label>
              {professionOptions.filter((o) => o.persisted).length === 0 ? (
                <p className="text-sm text-muted-foreground">No saved professions yet.</p>
              ) : (
                professionOptions
                  .filter((o) => o.persisted)
                  .sort((a, b) => a.value.localeCompare(b.value))
                  .map((o) => (
                    <div key={o.id} className="flex items-center justify-between gap-3 rounded-lg border p-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{o.value}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() => {
                            setEditingProfessionId(o.id);
                            setEditingProfessionValue(o.value);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 text-destructive"
                          onClick={async () => {
                            if (!confirm(`Delete profession "${o.value}"?`)) return;
                            const res = await fetch(`${API_BASE_URL}/api/admin/committee/profession-options/${o.id}`, {
                              method: "DELETE",
                              headers: authHeaders(),
                            });
                            if (!res.ok) {
                              toast({ title: "Delete failed", variant: "destructive" });
                              return;
                            }
                            qc.invalidateQueries({ queryKey: ["committee-profession-options"] });
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
              )}
            </div>

            {editingProfessionId ? (
              <div className="space-y-2 rounded-lg border p-3">
                <Label>Edit profession</Label>
                <Input
                  value={editingProfessionValue}
                  onChange={(e) => setEditingProfessionValue(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={async () => {
                      const value = editingProfessionValue.trim();
                      if (!value) return;
                      const res = await fetch(
                        `${API_BASE_URL}/api/admin/committee/profession-options/${editingProfessionId}`,
                        {
                          method: "PUT",
                          headers: { ...authHeaders(), "Content-Type": "application/json" },
                          body: JSON.stringify({ value }),
                        }
                      );
                      if (!res.ok) {
                        toast({ title: "Update failed", variant: "destructive" });
                        return;
                      }
                      setEditingProfessionId(null);
                      setEditingProfessionValue("");
                      qc.invalidateQueries({ queryKey: ["committee-profession-options"] });
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingProfessionId(null);
                      setEditingProfessionValue("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Job status options CRUD */}
      <Dialog
        open={jobStatusManageOpen}
        modal={false}
        onOpenChange={(open) => {
          setJobStatusManageOpen(open);
          if (!open) {
            setNewJobStatusValue("");
            setEditingJobStatusId(null);
            setEditingJobStatusValue("");
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Manage job statuses</DialogTitle>
            <DialogDescription>Dropdown options for executive committee member “Job status”.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>New job status</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={newJobStatusValue}
                  onChange={(e) => setNewJobStatusValue(e.target.value)}
                  placeholder="e.g. Software Engineer"
                />
                <Button
                  type="button"
                  onClick={async () => {
                    const value = newJobStatusValue.trim();
                    if (!value) return;
                    const res = await fetch(`${API_BASE_URL}/api/admin/committee/job-status-options`, {
                      method: "POST",
                      headers: { ...authHeaders(), "Content-Type": "application/json" },
                      body: JSON.stringify({ value }),
                    });
                    if (!res.ok) {
                      toast({ title: "Add failed", description: (await res.json().catch(() => ({}))).error, variant: "destructive" });
                      return;
                    }
                    setNewJobStatusValue("");
                    qc.invalidateQueries({ queryKey: ["committee-job-status-options"] });
                  }}
                  disabled={!newJobStatusValue.trim()}
                >
                  Add
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Saved options</Label>
              {jobStatusOptions.filter((o) => o.persisted).length === 0 ? (
                <p className="text-sm text-muted-foreground">No saved job statuses yet.</p>
              ) : (
                jobStatusOptions
                  .filter((o) => o.persisted)
                  .sort((a, b) => a.value.localeCompare(b.value))
                  .map((o) => (
                    <div key={o.id} className="flex items-center justify-between gap-3 rounded-lg border p-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{o.value}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() => {
                            setEditingJobStatusId(o.id);
                            setEditingJobStatusValue(o.value);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 text-destructive"
                          onClick={async () => {
                            if (!confirm(`Delete job status "${o.value}"?`)) return;
                            const res = await fetch(`${API_BASE_URL}/api/admin/committee/job-status-options/${o.id}`, {
                              method: "DELETE",
                              headers: authHeaders(),
                            });
                            if (!res.ok) {
                              toast({ title: "Delete failed", variant: "destructive" });
                              return;
                            }
                            qc.invalidateQueries({ queryKey: ["committee-job-status-options"] });
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
              )}
            </div>

            {editingJobStatusId ? (
              <div className="space-y-2 rounded-lg border p-3">
                <Label>Edit job status</Label>
                <Input
                  value={editingJobStatusValue}
                  onChange={(e) => setEditingJobStatusValue(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={async () => {
                      const value = editingJobStatusValue.trim();
                      if (!value) return;
                      const res = await fetch(
                        `${API_BASE_URL}/api/admin/committee/job-status-options/${editingJobStatusId}`,
                        {
                          method: "PUT",
                          headers: { ...authHeaders(), "Content-Type": "application/json" },
                          body: JSON.stringify({ value }),
                        }
                      );
                      if (!res.ok) {
                        toast({ title: "Update failed", variant: "destructive" });
                        return;
                      }
                      setEditingJobStatusId(null);
                      setEditingJobStatusValue("");
                      qc.invalidateQueries({ queryKey: ["committee-job-status-options"] });
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingJobStatusId(null);
                      setEditingJobStatusValue("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminCommittee;
