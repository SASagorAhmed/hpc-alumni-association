import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useHistorySyncOverlay } from "@/hooks/useHistorySyncOverlay";
import { ArrowLeft, Calendar, Tag, ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from "@/api-production/api.js";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

interface Memory {
  id: string;
  title: string;
  category: string;
  description: string | null;
  photo_url: string | null;
  event_date: string | null;
  published: boolean;
  display_order: number;
}

export default function MemoryDetail() {
  const { id } = useParams<{ id: string }>();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgOpen, setImgOpen] = useState(false);

  useHistorySyncOverlay(imgOpen, () => setImgOpen(false));

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API_BASE_URL}/api/public/memories/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { setMemory(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1 w-full">
        {/* pt clears fixed Navbar (z-50) so “Back” isn’t covered */}
        <div className="mx-auto w-full max-w-4xl min-w-0 px-4 pb-8 pt-20 sm:px-6 sm:pb-10 sm:pt-24 lg:px-8">
        <Link
          to="/#memories"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Back to Memories
        </Link>

        {loading && (
          <div className="flex items-center justify-center py-32 text-muted-foreground text-sm">
            Loading…
          </div>
        )}

        {!loading && !memory && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <p className="text-muted-foreground text-base">Memory not found.</p>
            <Link
              to="/#memories"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ArrowLeft className="w-4 h-4" /> Go back
            </Link>
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
      </main>

      <Footer />

      {/* Lightbox — click photo to view full screen */}
      {imgOpen && memory?.photo_url && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 cursor-zoom-out"
          onClick={() => setImgOpen(false)}
        >
          <img
            src={memory.photo_url}
            alt={memory.title}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl select-none"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl font-light leading-none"
            onClick={() => setImgOpen(false)}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
