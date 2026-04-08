import { useState, useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Calendar, ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API_BASE_URL } from "@/api-production/api.js";
import { isIosSafariViewport } from "@/lib/iosSafari";
import { BREAKPOINT_MOBILE_MAX, layoutCanvasScale, mqStackedMobile } from "@/lib/breakpoints";
import { saveNavScrollRestore } from "@/lib/navScrollRestore";

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

interface MemoryItem {
  id: string;
  title: string;
  category: string;
  photo_url?: string | null;
  description?: string | null;
  event_date?: string | null;
}

function MemoryGridCard({ memory, i }: { memory: MemoryItem; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: i * 0.05 }}
    >
      <Link
        to={`/memories/${memory.id}`}
        className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg"
        onClick={() => saveNavScrollRestore()}
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
              <p className="line-clamp-4 break-words fs-ui text-primary-foreground [overflow-wrap:anywhere]">
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
  const [activeCategory, setActiveCategory] = useState("All");
  const [visibleCount, setVisibleCount] = useState(6);
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

  const { data: memories = [] } = useQuery({
    queryKey: ["memories-public"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/public/memories?published=true`);
      if (!res.ok) throw new Error("Failed to load memories");
      return res.json() as Promise<MemoryItem[]>;
    },
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

  if (memories.length === 0) return null;

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
          <p className="w-full max-w-none text-justify text-muted-foreground hyphens-auto">
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
          <p className="py-12 text-center text-muted-foreground">No memories found in this category.</p>
        )}
      </div>
    </section>
  );
};

export default MemoriesSection;
