import { createRoot } from "react-dom/client";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import App from "./App.tsx";
import { queryClient } from "@/lib/queryClient";
import { ACHIEVEMENT_BANNER_QUERY_KEY, fetchAchievementBannerData } from "@/hooks/useAchievementBannerData";
import { fetchLandingContent, LANDING_CONTENT_QUERY_KEY } from "@/hooks/useLandingContent";
import {
  achievementsPublicListQueryKey,
  alumniDirectoryQueryKey,
  memoriesPublicListQueryKey,
} from "@/lib/publicDataQueries";
import "./loadFonts";
import "./index.css";

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "HPC_RQ_CACHE_V1",
  throttleTime: 250,
});

// Start banner API fetch before React mounts on the homepage only (saves a round-trip vs useEffect).
const path = typeof window !== "undefined" ? window.location.pathname : "/";
if (path === "/" || path === "") {
  queryClient.prefetchQuery({
    queryKey: ACHIEVEMENT_BANNER_QUERY_KEY,
    queryFn: fetchAchievementBannerData,
  });
  queryClient.prefetchQuery({
    queryKey: LANDING_CONTENT_QUERY_KEY,
    queryFn: fetchLandingContent,
  });
}

createRoot(document.getElementById("root")!).render(
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{
      persister,
      maxAge: 1000 * 60 * 60 * 24,
      dehydrateOptions: {
        shouldDehydrateQuery: (query) => {
          const k = query.queryKey[0];
          // List is `["alumni-directory"]`; member rows share the same first segment — do not persist those.
          if (k === alumniDirectoryQueryKey[0]) return query.queryKey.length === 1;
          return (
            k === LANDING_CONTENT_QUERY_KEY[0] ||
            k === ACHIEVEMENT_BANNER_QUERY_KEY[0] ||
            k === memoriesPublicListQueryKey[0] ||
            k === achievementsPublicListQueryKey[0] ||
            k === "committee-active-public"
          );
        },
      },
    }}
  >
    <App />
  </PersistQueryClientProvider>
);
