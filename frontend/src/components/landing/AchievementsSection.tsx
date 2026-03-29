import { useState, useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { Award, Calendar, GraduationCap, PartyPopper, Camera, Building2 } from "lucide-react";
import { API_BASE_URL } from "@/api-production/api.js";
import { isIosSafariViewport } from "@/lib/iosSafari";
import { ACHIEVEMENT_BANNER_CROP_ASPECT } from "@/lib/achievementCrop";
import { BREAKPOINT_MOBILE_MAX, layoutCanvasScale, mqStackedMobile } from "@/lib/breakpoints";

interface Achievement {
  id: string;
  name: string;
  batch: string | null;
  photo_url: string | null;
  achievement_title: string;
  institution: string | null;
  message: string | null;
  tag: string | null;
  location: string | null;
  achievement_date: string | null;
}

/** Desktop reference width for the scaled 3-col grid (lg+ only). */
const ACHIEVEMENTS_DESIGN_W = 1024;
/** Proportional zoom below mobile band max (committee / banner pattern). */
const MOBILE_REF_W = BREAKPOINT_MOBILE_MAX;

function AchievementGridCard({ a, i }: { a: Achievement; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:border-primary/50 hover:shadow-lg"
      style={{ background: "var(--achievement-card-bg)" }}
    >
      <div className="h-1" style={{ background: "var(--achievement-card-accent-bar)" }} />

      <div className="w-full overflow-hidden" style={{ aspectRatio: ACHIEVEMENT_BANNER_CROP_ASPECT }}>
        {a.photo_url ? (
          <img src={a.photo_url} alt={a.name} className="h-full w-full object-cover object-center" />
        ) : (
          <div className="flex h-full w-full items-center justify-center" style={{ background: "var(--achievement-card-photo-bg)" }}>
            <Camera className="h-10 w-10 text-primary/40" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-center gap-2 p-3 text-center">
        <span className="text-[0.68rem] font-semibold uppercase tracking-wider text-amber-600">
          #{String(i + 1).padStart(2, "0")} Achievement
        </span>

        <h3
          className="break-words text-sm font-bold leading-snug text-foreground [overflow-wrap:anywhere]"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          {a.name}
        </h3>

        {a.achievement_title && (
          <span className="inline-flex max-w-full items-center break-words rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground [overflow-wrap:anywhere]">
            {a.achievement_title}
          </span>
        )}

        <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-1">
          {a.batch && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <GraduationCap size={11} className="shrink-0 text-primary" />
              Batch {a.batch}
            </span>
          )}
          {a.achievement_date && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-2.5 w-2.5 shrink-0 text-primary" />
              {new Date(a.achievement_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
            </span>
          )}
          {a.institution && (
            <span className="inline-flex max-w-full min-w-0 items-center gap-1 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
              <Building2 className="h-2.5 w-2.5 shrink-0 text-primary" />
              {a.institution}
            </span>
          )}
        </div>

        {a.message && (
          <div className="mt-auto w-full min-w-0 border-t border-border pt-2">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-left">
              <div className="mb-1 flex items-center gap-1.5">
                <PartyPopper className="h-3 w-3 shrink-0 text-primary" />
                <span className="text-[0.6rem] font-semibold uppercase tracking-wider text-primary">Congratulations</span>
              </div>
              <p className="break-words text-xs leading-relaxed text-foreground/85 whitespace-pre-wrap [overflow-wrap:anywhere]">
                {a.message}
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

const AchievementsSection = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [visibleCount, setVisibleCount] = useState(6);
  const gridOuterRef = useRef<HTMLDivElement>(null);
  const gridInnerRef = useRef<HTMLDivElement>(null);
  const [gridScale, setGridScale] = useState(1);
  const [gridWrapH, setGridWrapH] = useState<number | undefined>(undefined);
  /** Phones (≤630px): 2 columns, no transform shrink. Tablet+ matches desktop scaled 3-col canvas. */
  const [isNarrowViewport, setIsNarrowViewport] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(mqStackedMobile).matches : false
  );
  const narrowGridOuterRef = useRef<HTMLDivElement>(null);
  const [narrowGridW, setNarrowGridW] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

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

  // Re-run when data loads (same pattern as banner — refs are null on first null-render).
  const gridReady = achievements.length > 0;

  // Narrow 2-col grid: same shrink/zoom as alumni member cards on small phones (committee board pattern).
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
  }, [isNarrowViewport, gridReady, visibleCount]);

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
      const s = layoutCanvasScale(w, ACHIEVEMENTS_DESIGN_W);
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
  }, [gridReady, visibleCount, isNarrowViewport]);

  useEffect(() => {
    const fetchData = async () => {
      const now = new Date().toISOString();
      const res = await fetch(`${API_BASE_URL}/api/public/achievements?active=true`);
      const data = res.ok ? await res.json().catch(() => []) : [];
      if (Array.isArray(data)) {
        const filtered = (data as unknown as (Achievement & { start_date: string | null; end_date: string | null; is_active: boolean })[]).filter((a) => {
          if (a.start_date && a.start_date > now) return false;
          if (a.end_date && a.end_date < now) return false;
          return true;
        });
        setAchievements(filtered);
      }
    };
    fetchData();
  }, []);

  if (achievements.length === 0) return null;

  const isMobileGrid = isNarrowViewport && narrowGridW < 540;
  const mobileZoom = isMobileGrid && narrowGridW < MOBILE_REF_W ? narrowGridW / MOBILE_REF_W : 1;
  const mobileGridZoomStyle =
    isNarrowViewport && mobileZoom < 1 && !isIosSafariViewport() ? ({ zoom: mobileZoom } as CSSProperties) : undefined;

  return (
    <section id="achievements" className="border-t border-border/60 bg-background py-10 sm:py-20">
      <div className="layout-container">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="fs-ui mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 font-medium text-primary">
            <Award className="h-4 w-4" />
            HPC Alumni Achievements
          </div>
          <h2 className="fs-title font-bold text-foreground" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Achievements of HPC Alumni
          </h2>
          <p className="fs-body mt-3 w-full max-w-none text-muted-foreground text-justify hyphens-auto">
            We proudly celebrate the outstanding achievements of Hamdard Public College alumni who have excelled in diverse fields such as education, business, technology, research, and public service. Our alumni continue to make meaningful contributions both nationally and internationally, reflecting the values and excellence of HPC.
            <br />
            <br />
            From academic success to professional leadership, these accomplishments highlight the strength of our alumni network and inspire current students to pursue their goals with dedication and confidence.
          </p>
        </motion.div>

        {/* Narrow: 2 columns; very small widths use CSS zoom like committee member cards */}
        {isNarrowViewport ? (
          <div ref={narrowGridOuterRef} className="w-full min-w-0">
            <div
              className="hpc-ios-touch-text-root grid w-full min-w-0 grid-cols-2 gap-3 sm:gap-4 md:gap-5"
              style={mobileGridZoomStyle}
            >
              {achievements.slice(0, visibleCount).map((a, i) => (
                <AchievementGridCard key={a.id} a={a} i={i} />
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
                  width: `${ACHIEVEMENTS_DESIGN_W}px`,
                  transform: `scale(${gridScale})`,
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: "16px",
                }}
              >
                {achievements.slice(0, visibleCount).map((a, i) => (
                  <AchievementGridCard key={a.id} a={a} i={i} />
                ))}
              </div>
            </div>
          </div>
        )}

        {(visibleCount < achievements.length || visibleCount > 6) && (
          <div className="flex items-center justify-center gap-4 mt-8">
            {visibleCount < achievements.length && (
              <>
                <button
                  onClick={() => setVisibleCount((prev) => prev + 6)}
                  className="px-5 py-2 rounded-full border border-primary text-primary text-sm font-medium hover:bg-primary/10 transition-colors"
                >
                  See More ({achievements.length - visibleCount} remaining)
                </button>
                <button
                  onClick={() => setVisibleCount(achievements.length)}
                  className="text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
                >
                  See All
                </button>
              </>
            )}
            {visibleCount > 6 && (
              <button
                onClick={() => setVisibleCount(6)}
                className="px-5 py-2 rounded-full border border-muted-foreground/30 text-muted-foreground text-sm font-medium hover:bg-muted transition-colors"
              >
                Show Less
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default AchievementsSection;
