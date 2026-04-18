import { useState, useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { Calendar, ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isIosSafariViewport } from "@/lib/iosSafari";
import { BREAKPOINT_MOBILE_MAX, layoutCanvasScale, mqStackedMobile } from "@/lib/breakpoints";
import {
  fetchMemoriesPublicList,
  fetchPublicMemoryById,
  memoriesPublicListQueryKey,
  memoryDetailQueryKey,
  type MemoryPublicRecord,
} from "@/lib/publicDataQueries";
import { usePersistedState } from "@/hooks/usePersistedState";

const CATEGORIES = [
  "All",
  "Alumni Meetup",
  "Iftar Mahfil",
  "Teacher Congratulation",
  "College Picnic",
  "Reunion",
  "General",
];

/** Desktop reference width for the scaled 3-col grid (lg+ only). */
const MEMORIES_DESIGN_W = 1024;
/** Same as committee / achievements: proportional zoom below this width on very small phones. */
const MOBILE_REF_W = 480;

function MemoryGridCard({ memory, i }: { memory: MemoryPublicRecord; i: number }) {
  const location = useLocation();
  const queryClient = useQueryClient();
  const prefetchDetail = () => {
    queryClient.prefetchQuery({
      queryKey: memoryDetailQueryKey(memory.id),
      queryFn: () => fetchPublicMemoryById(memory.id),
      staleTime: 1000 * 60 * 5,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: i * 0.05 }}
    >
      <Link
        to={`/memories/${memory.id}`}
        state={{ backgroundLocation: location }}
        onPointerEnter={prefetchDetail}
        onMouseEnter={prefetchDetail}
        onFocus={prefetchDetail}
        onTouchStart={prefetchDetail}
        className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {memory.photo_url ? (
            <img
              src={memory.photo_url}
              alt={memory.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
            </div>
          )}
          {memory.description && (
            <div className="absolute inset-0 flex min-w-0 items-end bg-foreground/70 p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:p-4">
              <p className="line-clamp-4 break-normal [word-break:normal] [overflow-wrap:normal] fs-ui text-primary-foreground">
                {memory.description}
              </p>
            </div>
          )}
        </div>

        <div className="min-w-0 p-3 sm:p-4">
          <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
            <Badge variant="secondary" className="min-w-0 max-w-[55%] shrink break-words text-xs sm:max-w-none [overflow-wrap:anywhere]">
              {memory.category}
            </Badge>
            {memory.event_date && (
              <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3 shrink-0" />
                {new Date(memory.event_date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
          <h3 className="line-clamp-2 min-w-0 break-words text-sm font-semibold text-foreground transition-colors group-hover:text-primary [overflow-wrap:anywhere]">
            {memory.title}
          </h3>
        </div>
      </Link>
    </motion.div>
  );
}

const MemoriesSection = () => {
  const [activeCategory, setActiveCategory] = usePersistedState<string>("landing:memories:category", "All");
  const [visibleCount, setVisibleCount] = usePersistedState<number>("landing:memories:visible-count", 6);
  const gridOuterRef = useRef<HTMLDivElement>(null);
  const gridInnerRef = useRef<HTMLDivElement>(null);
  const [gridScale, setGridScale] = useState(1);
  const [gridWrapH, setGridWrapH] = useState<number | undefined>(undefined);
  const [isNarrowViewport, setIsNarrowViewport] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(mqStackedMobile).matches : false
  );
  const narrowGridOuterRef = useRef<HTMLDivElement>(null);
  const [narrowGridW, setNarrowGridW] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

  const { data: memories = [], isPending: isLoadingMemories } = useQuery({
    queryKey: memoriesPublicListQueryKey,
    queryFn: fetchMemoriesPublicList,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(mqStackedMobile);
    const onChange = () => setIsNarrowViewport(mq.matches);
    onChange();
    if (typeof mq.addEventListener === "function") mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    return () => {
      if (typeof mq.removeEventListener === "function") mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  const filtered =
    activeCategory === "All" ? memories : memories.filter((m) => m.category === activeCategory);

  const gridReady = memories.length > 0;

  useLayoutEffect(() => {
    if (!isNarrowViewport) return;
    const el = narrowGridOuterRef.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (w) setNarrowGridW(w);
    };
    update();
    const ro = new ResizeObserver(() => requestAnimationFrame(update));
    ro.observe(el);
    return () => ro.disconnect();
  }, [isNarrowViewport, gridReady, visibleCount, activeCategory]);

  useLayoutEffect(() => {
    if (isNarrowViewport) {
      setGridScale(1);
      setGridWrapH(undefined);
      return;
    }
    const outer = gridOuterRef.current;
    const inner = gridInnerRef.current;
    if (!outer || !inner) return;
    const update = () => {
      const w = outer.getBoundingClientRect().width;
      if (!w) return;
      const s = layoutCanvasScale(w, MEMORIES_DESIGN_W);
      setGridScale(s);
      setGridWrapH(Math.round(inner.offsetHeight * s));
    };
    let r1 = 0,
      r2 = 0;
    r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(update);
    });
    const ro = new ResizeObserver(update);
    ro.observe(outer);
    ro.observe(inner);
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
      ro.disconnect();
    };
  }, [gridReady, visibleCount, activeCategory, isNarrowViewport]);

  if (isLoadingMemories && memories.length === 0) {
    return (
      <section id="memories" className="border-t border-border/60 bg-background py-16 md:py-24">
        <div className="layout-container">
          <div className="mb-10 text-center">
            <p className="fs-eyebrow mb-2 font-semibold uppercase tracking-wider text-primary">HPC Alumni Gallery</p>
            <h2 className="mb-3 fs-title font-bold text-foreground">Our Alumni Memories &amp; Events</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={`memory-skeleton-${idx}`} className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="animate-pulse">
                  <div className="aspect-[4/3] bg-muted" />
                  <div className="space-y-2 p-4">
                    <div className="h-3 w-16 rounded bg-muted" />
                    <div className="h-4 w-4/5 rounded bg-muted" />
                    <div className="h-4 w-3/5 rounded bg-muted" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!isLoadingMemories && memories.length === 0) {
    return (
      <section id="memories" className="border-t border-border/60 bg-background py-16 md:py-24">
        <div className="layout-container">
          <div className="mb-6 text-center">
            <p className="fs-eyebrow mb-2 font-semibold uppercase tracking-wider text-primary">HPC Alumni Gallery</p>
            <h2 className="mb-3 fs-title font-bold text-foreground">Our Alumni Memories &amp; Events</h2>
          </div>
          <p className="py-8 text-center text-landing-description">No memories are available right now.</p>
        </div>
      </section>
    );
  }

  const isMobileGrid = isNarrowViewport && narrowGridW < 540;
  const mobileZoom = isMobileGrid && narrowGridW < MOBILE_REF_W ? narrowGridW / MOBILE_REF_W : 1;
  const mobileGridZoomStyle =
    isNarrowViewport && mobileZoom < 1 && !isIosSafariViewport() ? ({ zoom: mobileZoom } as CSSProperties) : undefined;

  return (
    <section id="memories" className="border-t border-border/60 bg-background py-16 md:py-24">
      <div className="layout-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <p className="fs-eyebrow mb-2 font-semibold uppercase tracking-wider text-primary">HPC Alumni Gallery</p>
          <h2 className="mb-3 fs-title font-bold text-foreground">Our Alumni Memories &amp; Events</h2>
          <p className="fs-banner-message-body w-full max-w-none text-justify text-landing-description [text-align-last:left] hyphens-none break-normal [word-break:normal] [overflow-wrap:normal]">
            Explore the memorable moments of the Hamdard Public College Alumni Association through our gallery of events,
            reunions, and celebrations. These images reflect the strong bonds, shared experiences, and vibrant community spirit
            of HPC alumni.
            <br />
            <br />
            From alumni meetups and Iftar Mahfil to college picnics and reunions, each moment captures the essence of connection,
            friendship, and lifelong memories within our growing alumni network.
          </p>
        </motion.div>

        {/* Category filter — dropdown on small screens only; pills from md up */}
        <div className="mb-10 md:hidden">
          <label htmlFor="memory-category-select" className="mb-2 block text-center text-sm font-medium text-muted-foreground">
            Memory type
          </label>
          <Select
            value={activeCategory}
            onValueChange={(v) => {
              setActiveCategory(v);
              setVisibleCount(6);
            }}
          >
            <SelectTrigger id="memory-category-select" className="mx-auto w-full max-w-md" aria-label="Select memory type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mb-10 hidden flex-wrap justify-center gap-2 md:flex">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setActiveCategory(cat);
                setVisibleCount(6);
              }}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Narrow: 2 columns, no transform shrink; optional zoom on very small phones (achievements / committee pattern) */}
        {isNarrowViewport ? (
          <div ref={narrowGridOuterRef} className="w-full min-w-0">
            <div
              className="hpc-ios-touch-text-root grid w-full min-w-0 grid-cols-2 gap-3 sm:gap-4 md:gap-5"
              style={mobileGridZoomStyle}
            >
              {filtered.slice(0, visibleCount).map((memory, i) => (
                <MemoryGridCard key={memory.id} memory={memory} i={i} />
              ))}
            </div>
          </div>
        ) : (
          <div ref={gridOuterRef} className="w-full min-w-0">
            <div className="relative overflow-hidden" style={gridWrapH ? { height: gridWrapH } : undefined}>
              <div
                ref={gridInnerRef}
                className="origin-top-left"
                style={{
                  width: `${MEMORIES_DESIGN_W}px`,
                  transform: `scale(${gridScale})`,
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: "20px",
                }}
              >
                {filtered.slice(0, visibleCount).map((memory, i) => (
                  <MemoryGridCard key={memory.id} memory={memory} i={i} />
                ))}
              </div>
            </div>
          </div>
        )}

        {(visibleCount < filtered.length || visibleCount > 6) && (
          <div className="mt-8 flex items-center justify-center gap-4">
            {visibleCount < filtered.length && (
              <>
                <button
                  onClick={() => setVisibleCount((prev) => prev + 6)}
                  className="rounded-full border border-primary px-5 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  See More ({filtered.length - visibleCount} remaining)
                </button>
                <button
                  onClick={() => setVisibleCount(filtered.length)}
                  className="text-sm font-medium text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
                >
                  See All
                </button>
              </>
            )}
            {visibleCount > 6 && (
              <button
                onClick={() => setVisibleCount(6)}
                className="rounded-full border border-muted-foreground/30 px-5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
              >
                Show Less
              </button>
            )}
          </div>
        )}

        {filtered.length === 0 && (
          <p className="py-12 text-center text-landing-description">No memories found in this category.</p>
        )}
      </div>
    </section>
  );
};

export default MemoriesSection;
