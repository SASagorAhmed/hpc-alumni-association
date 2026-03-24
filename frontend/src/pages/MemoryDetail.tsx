import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
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

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API_BASE_URL}/api/public/memories/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { setMemory(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          to="/#memories"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
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
          <article className="space-y-8">
            {/* Title + meta */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {memory.category}
                </Badge>
                {memory.event_date && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(memory.event_date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-snug">
                {memory.title}
              </h1>
            </div>

            {/* Full photo */}
            <div
              className="w-full overflow-hidden rounded-2xl border border-border bg-muted shadow-md cursor-zoom-in"
              onClick={() => memory.photo_url && setImgOpen(true)}
            >
              {memory.photo_url ? (
                <img
                  src={memory.photo_url}
                  alt={memory.title}
                  className="w-full h-auto object-contain max-h-[70vh]"
                />
              ) : (
                <div className="flex items-center justify-center py-24">
                  <ImageIcon className="w-16 h-16 text-muted-foreground/30" />
                </div>
              )}
            </div>

            {/* Description */}
            {memory.description && (
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">
                  About this memory
                </h2>
                <p className="text-base text-foreground/85 leading-relaxed whitespace-pre-wrap">
                  {memory.description}
                </p>
              </div>
            )}
          </article>
        )}
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
