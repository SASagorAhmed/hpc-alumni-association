import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { prefetchCommitteeMemberProfile } from "@/lib/publicDataQueries";

/** Prefetch `/committee/member/:id` so the profile layer can render from cache immediately. */
export function useCommitteeMemberProfilePrefetch() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const viewerKey = user?.id ?? "guest";
  return useCallback(
    (memberId: string) => {
      void prefetchCommitteeMemberProfile(queryClient, memberId, viewerKey);
    },
    [queryClient, viewerKey]
  );
}
