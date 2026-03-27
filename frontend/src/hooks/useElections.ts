import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/api-production/api.js";
import { getAuthToken } from "@/lib/authToken";
async function apiGet(path: string) {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

async function apiAuth(path: string, method: string, body?: Record<string, unknown>) {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return res.json().catch(() => null);
}

// ── Queries ──────────────────────────────────────────────

export function useElections() {
  return useQuery({
    queryKey: ["elections"],
    queryFn: async () => apiGet("/api/public/elections"),
  });
}

export function useElection(id: string | null) {
  return useQuery({
    queryKey: ["election", id],
    enabled: !!id,
    queryFn: async () => apiGet(`/api/public/elections/${id}`),
  });
}

export function useElectionPosts(electionId: string | null) {
  return useQuery({
    queryKey: ["election_posts", electionId],
    enabled: !!electionId,
    queryFn: async () => apiGet(`/api/public/elections/${electionId}/posts`),
  });
}

export function useCandidates(electionId: string | null, status?: string) {
  return useQuery({
    queryKey: ["candidates", electionId, status],
    enabled: !!electionId,
    queryFn: async () => {
      const data = await apiGet(`/api/public/elections/${electionId}/candidates`);
      if (!status) return data;
      return (data || []).filter((c: any) => c.status === status);
    },
  });
}

export function useUserVotes(electionId: string | null) {
  return useQuery({
    queryKey: ["votes", electionId, "mine"],
    enabled: !!electionId,
    queryFn: async () => apiAuth(`/api/admin/elections/${electionId}/my-votes`, "GET"),
  });
}

export function useAllVotes(electionId: string | null) {
  return useQuery({
    queryKey: ["votes", electionId, "all"],
    enabled: !!electionId,
    queryFn: async () => apiGet(`/api/public/elections/${electionId}/votes`),
  });
}

export function useVoteCounts(electionId: string | null, refetchInterval?: number) {
  return useQuery({
    queryKey: ["vote_counts", electionId],
    enabled: !!electionId,
    refetchInterval: refetchInterval || false,
    queryFn: async () => {
      const data = await apiGet(`/api/public/elections/${electionId}/votes`);
      const counts: Record<string, number> = {};
      const postTotals: Record<string, number> = {};
      data?.forEach(v => {
        counts[v.candidate_id] = (counts[v.candidate_id] || 0) + 1;
        postTotals[v.post_id] = (postTotals[v.post_id] || 0) + 1;
      });
      return { candidateCounts: counts, postTotals, totalVotes: data?.length || 0 };
    },
  });
}

export function useWinners(electionId: string | null) {
  return useQuery({
    queryKey: ["election_winners", electionId],
    enabled: !!electionId,
    queryFn: async () => apiGet(`/api/public/elections/${electionId}/winners`),
  });
}

// ── Mutations ────────────────────────────────────────────

export function useCreateElection() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (values: {
      title: string;
      description?: string;
      term_year?: string;
      election_type: string;
      application_start?: string;
      application_end?: string;
      voting_start?: string;
      voting_end?: string;
      result_visibility?: string;
    }) => {
      return apiAuth("/api/admin/elections", "POST", values as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["elections"] });
      toast({ title: "Election created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateElection() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [key: string]: any }) => {
      await apiAuth(`/api/admin/elections/${id}`, "PUT", { ...values, updated_at: new Date().toISOString() } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["elections"] });
      toast({ title: "Election updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteElection() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiAuth(`/api/admin/elections/${id}`, "DELETE");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["elections"] });
      toast({ title: "Election deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ── Post Mutations ───────────────────────────────────────

export function useCreateElectionPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { election_id: string; post_name: string; display_order?: number; winners_count?: number; is_open_for_application?: boolean; admin_nomination_only?: boolean }) => {
      await apiAuth("/api/admin/election-posts", "POST", values as any);
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["election_posts", v.election_id] }),
  });
}

export function useUpdateElectionPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string; election_id: string; [key: string]: any }) => {
      await apiAuth(`/api/admin/election-posts/${id}`, "PUT", values as any);
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["election_posts", v.election_id] }),
  });
}

export function useDeleteElectionPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, election_id }: { id: string; election_id: string }) => {
      await apiAuth(`/api/admin/election-posts/${id}`, "DELETE");
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["election_posts", v.election_id] }),
  });
}

// ── Candidate Mutations ──────────────────────────────────

export function useCreateCandidate() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (values: {
      election_id: string;
      post_id: string;
      user_id?: string;
      name: string;
      batch?: string;
      photo_url?: string;
      manifesto?: string;
      candidate_number?: number;
      phone?: string;
      email?: string;
      is_manual?: boolean;
      status?: string;
    }) => {
      await apiAuth("/api/admin/candidates", "POST", values as any);
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["candidates", v.election_id] });
      toast({ title: "Candidate added" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateCandidate() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, election_id, ...values }: { id: string; election_id: string; [key: string]: any }) => {
      await apiAuth(`/api/admin/candidates/${id}`, "PUT", { ...values, updated_at: new Date().toISOString() } as any);
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["candidates", v.election_id] });
      toast({ title: "Candidate updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, election_id }: { id: string; election_id: string }) => {
      await apiAuth(`/api/admin/candidates/${id}`, "DELETE");
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["candidates", v.election_id] }),
  });
}

// ── Vote Mutations ───────────────────────────────────────

export function useCastVote() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (values: { election_id: string; post_id: string; candidate_id: string }) => {
      await apiAuth("/api/admin/votes", "POST", values as any);
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["votes", v.election_id] });
      toast({ title: "Vote cast successfully!" });
    },
    onError: (e: Error) => toast({ title: "Vote failed", description: e.message, variant: "destructive" }),
  });
}

// ── Winner Mutations ─────────────────────────────────────

export function useDeclareWinner() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (values: { election_id: string; post_id: string; candidate_id: string; congratulation_message?: string; vote_count?: number }) => {
      await apiAuth("/api/admin/winners", "POST", values as any);
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["election_winners", v.election_id] });
      toast({ title: "Winner declared" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteWinner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, election_id }: { id: string; election_id: string }) => {
      await apiAuth(`/api/admin/winners/${id}`, "DELETE");
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["election_winners", v.election_id] }),
  });
}
