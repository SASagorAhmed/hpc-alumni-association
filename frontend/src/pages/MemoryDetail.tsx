import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate, useLocation, type Location } from "react-router-dom";
import { useHistorySyncOverlay } from "@/hooks/useHistorySyncOverlay";
import { FullScreenRouteLayer } from "@/components/routing/FullScreenRouteLayer";
import { preserveTopNavbarForBackground } from "@/lib/fullScreenLayerPreserveNavbar";
import { ArrowLeft, Calendar, Tag, ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PublicMetaverseChrome } from "@/components/layout/PublicMetaverseChrome";
import { fetchPublicMemoryById, memoryDetailQueryKey } from "@/lib/publicDataQueries";

export default function MemoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const backgroundLocation = (location.state as { backgroundLocation?: Location } | null)?.backgroundLocation;
  const isLayer = Boolean(backgroundLocation);
  const preserveTopNavbar = preserveTopNavbarForBackground(backgroundLocation);
  const [imgOpen, setImgOpen] = useState(false);
  const { data: memory = null, isPending: loading } = useQuery({
    queryKey: memoryDetailQueryKey(id ?? ""),
    queryFn: () => fetchPublicMemoryById(id ?? ""),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  useHistorySyncOverlay(imgOpen, () => setImgOpen(false));

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  const detailContent = (
    <div className="layout-container w-full min-w-0 pb-8 pt-4 sm:pb-10 sm:pt-5">
        <button
          type="button"
          onClick={handleBack}
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Back to Memories
        </button>

        {loading && (
          <div className="flex items-center justify-center py-32 text-muted-foreground text-sm">
            Loading…
          </div>
        )}

        {!loading && !memory && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <p className="text-muted-foreground text-base">Memory not found.</p>
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ArrowLeft className="w-4 h-4" /> Go back
            </button>
          </div>
        )}

        {!loading && memory && (
          <article className="min-w-0 space-y-8">
            {/* Title + meta */}
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="flex max-w-full min-w-0 items-center gap-1 break-words">
                  <Tag className="h-3 w-3 shrink-0" />
                  <span className="break-words [overflow-wrap:anywhere]">{memory.category}</span>
                </Badge>
                {memory.event_date && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    {new Date(memory.event_date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                )}
              </div>
              <h1 className="break-words text-2xl font-bold leading-snug text-foreground [overflow-wrap:anywhere] sm:text-3xl">
                {memory.title}
              </h1>
            </div>

            {/* Photo — full width of box; height follows aspect ratio (scroll page if very tall) */}
            <div
              className="w-full min-w-0 cursor-zoom-in overflow-hidden rounded-2xl border border-border bg-muted shadow-md"
              onClick={() => memory.photo_url && setImgOpen(true)}
            >
              {memory.photo_url ? (
                <img
                  src={memory.photo_url}
                  alt={memory.title}
                  className="block h-auto w-full max-w-none"
                />
              ) : (
                <div className="flex items-center justify-center py-24">
                  <ImageIcon className="h-16 w-16 text-muted-foreground/30" />
                </div>
              )}
            </div>

            {/* Description */}
            {memory.description && (
              <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
                  About this memory
                </h2>
                <p className="whitespace-pre-wrap break-words text-base leading-relaxed text-foreground/85 [overflow-wrap:anywhere]">
                  {memory.description}
                </p>
              </div>
            )}
          </article>
        )}
      </div>
  );

  const page = (
    <PublicMetaverseChrome
      showNavbar={!isLayer}
      showFooter={!isLayer}
      overlayMode={isLayer}
    >
      {detailContent}

      {imgOpen && memory?.photo_url && (
        <div
          className="fixed inset-0 z-[9999] flex cursor-zoom-out items-center justify-center bg-black/90 p-4"
          onClick={() => setImgOpen(false)}
        >
          <img
            src={memory.photo_url}
            alt={memory.title}
            className="max-h-full max-w-full select-none rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="absolute right-4 top-4 text-3xl font-light leading-none text-white/80 hover:text-white"
            onClick={() => setImgOpen(false)}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      )}
    </PublicMetaverseChrome>
  );

  if (isLayer) {
    return (
      <FullScreenRouteLayer preserveTopNavbar={preserveTopNavbar}>
        {page}
      </FullScreenRouteLayer>
    );
  }

  return page;
}
