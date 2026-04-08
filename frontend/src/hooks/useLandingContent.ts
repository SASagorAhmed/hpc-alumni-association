import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/api-production/api.js";
import { getAuthToken } from "@/lib/authToken";

export type LandingContent = Record<string, Record<string, any>>;

export const LANDING_CONTENT_QUERY_KEY = ["landing-content"] as const;

export async function fetchLandingContent(): Promise<LandingContent> {
  const res = await fetch(`${API_BASE_URL}/api/public/landing-content`, { method: "GET" });
  if (!res.ok) {
    throw new Error(`Failed to load landing content (${res.status})`);
  }
  return (await res.json()) as LandingContent;
}

export const useLandingContent = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: LANDING_CONTENT_QUERY_KEY,
    queryFn: fetchLandingContent,
    staleTime: 1000 * 60 * 5,
    enabled: options?.enabled !== false,
  });
};

export const useSaveLandingContent = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ sectionKey, content }: { sectionKey: string; content: Record<string, any> }) => {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/admin/landing-content/${sectionKey}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to save landing content");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LANDING_CONTENT_QUERY_KEY });
      toast({ title: "Saved", description: "Landing page content updated successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
};

export const useDeleteLandingContent = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (sectionKey: string) => {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/admin/landing-content/${sectionKey}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete landing section");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LANDING_CONTENT_QUERY_KEY });
      toast({ title: "Reset", description: "Section reset to defaults." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
};
