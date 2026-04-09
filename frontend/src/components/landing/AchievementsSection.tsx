import { useState, useEffect, useLayoutEffect, useRef, useCallback, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Award, Calendar, GraduationCap, Camera, Building2, ChevronRight, PartyPopper } from "lucide-react";
import { API_BASE_URL } from "@/api-production/api.js";
import { isIosSafariViewport } from "@/lib/iosSafari";
import { ACHIEVEMENT_BANNER_CROP_ASPECT } from "@/lib/achievementCrop";
import { BREAKPOINT_MOBILE_MAX, layoutCanvasScale, mqStackedMobile } from "@/lib/breakpoints";
import { saveNavScrollRestore } from "@/lib/navScrollRestore";
import type { AchievementPublicRecord } from "@/lib/achievementPublic";

type Achievement = AchievementPublicRecord;

/** Desktop reference width for the scaled 3-col grid (lg+ only). */
const ACHIEVEMENTS_DESIGN_W = 1024;
/** Proportional zoom below mobile band max (committee / banner pattern). */
const MOBILE_REF_W = BREAKPOINT_MOBILE_MAX;

function AchievementGridCard({
  a,
  i,
  onMediaSettled,
}: {
  a: Achievement;
  i: number;
  onMediaSettled?: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const reportedRef = useRef(false);

  useEffect(() => {
    setImageFailed(false);
    reportedRef.current = false;
  }, [a.id, a.photo_url]);

  const reportSettled = () => {
    if (reportedRef.current) return;
    reportedRef.current = true;
    onMediaSettled?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="h-full min-h-0 min-w-0"
    >
      <Link
        to={`/achievements/${a.id}`}
        onClick={() => saveNavScrollRestore()}
        className="group relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:border-primary/50 hover:shadow-lg"
        style={{ background: "var(--achievement-card-bg)" }}
      >
        <div className="h-1 shrink-0" style={{ background: "var(--achievement-card-accent-bar)" }} />

        <div className="w-full shrink-0 overflow-hidden" style={{ aspectRatio: ACHIEVEMENT_BANNER_CROP_ASPECT }}>
          {a.photo_url && !imageFailed ? (
            <img
              src={a.photo_url}
              alt={a.name}
              className="h-full w-full object-cover object-center"
              loading="lazy"
              decoding="async"
              onLoad={reportSettled}
              onError={() => {
                setImageFailed(true);
                reportSettled();
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center" style={{ background: "var(--achievement-card-photo-bg)" }}>
              <Camera className="h-10 w-10 text-primary/40" />
            </div>
          )}
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col items-stretch gap-2 p-3 text-center">
          <span className="fs-caption font-semibold uppercase tracking-wider text-amber-600">
            #{String(i + 1).padStart(2, "0")} Achievement
          </span>

          <h3 className="font-outfit-section fs-card-title-lg break-words font-bold leading-snug text-foreground [overflow-wrap:anywhere]">
            {a.name}
          </h3>

          {a.achievement_title && (
            <span className="inline-flex max-w-full items-center justify-center break-words rounded-full bg-primary px-2.5 py-0.5 fs-caption font-semibold text-primary-foreground [overflow-wrap:anywhere]">
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

          {a.message?.trim() ? (
            <div className="mt-1 w-full min-w-0 flex-1 border-t border-border pt-2">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-left">
                <div className="mb-1 flex items-center gap-1.5">
                  <PartyPopper className="h-3 w-3 shrink-0 text-primary" aria-hidden />
                  <span className="fs-caption font-semibold uppercase tracking-wider text-primary">Congratulations</span>
                </div>
                <p className="line-clamp-4 break-words text-xs leading-relaxed text-foreground/85 [overflow-wrap:anywhere]">
                  {a.message.trim()}
                </p>
              </div>
            </div>
          ) : null}

          <div className="mt-auto flex w-full shrink-0 justify-center border-t border-border pt-2">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
              Read full story
              <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

const sectionShellClass =
  "scroll-mt-20 border-t border-border/60 bg-background py-10 sm:scroll-mt-[5.5rem] sm:py-20";

const AchievementsSection = ({ embedded = false }: { embedded?: boolean }) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(3);
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
  const [mediaSettleTick, setMediaSettleTick] = useState(0);
  const handleCardMediaSettled = useCallback(() => {
    setMediaSettleTick((v) => v + 1);
  }, []);

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
  }, [isNarrowViewport, gridReady, visibleCount, mediaSettleTick]);

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
  }, [gridReady, visibleCount, isNarrowViewport, mediaSettleTick]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/public/achievements?active=true`);
        const data = res.ok ? await res.json().catch(() => []) : [];
        if (Array.isArray(data)) {
          // Cards in the Achievements section should remain visible as long as they are published.
          // Banner time windows (start/end) are handled separately in the banner component.
          setAchievements(data as Achievement[]);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const headerBlock = (
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
      <h2 className="fs-title font-bold text-foreground font-outfit-section">
        Achievements of HPC Alumni
      </h2>
      <p className="fs-body mt-3 w-full max-w-none text-muted-foreground text-justify hyphens-auto">
        We proudly celebrate the outstanding achievements of Hamdard Public College alumni who have excelled in diverse fields such as education, business, technology, research, and public service. Our alumni continue to make meaningful contributions both nationally and internationally, reflecting the values and excellence of HPC.
        <br />
        <br />
        From academic success to professional leadership, these accomplishments highlight the strength of our alumni network and inspire current students to pursue their goals with dedication and confidence.
      </p>
    </motion.div>
  );

  if (loading) {
    return (
      <section id="achievements" className={embedded ? "scroll-mt-20 bg-background py-6 sm:scroll-mt-[5.5rem] sm:py-8" : sectionShellClass}>
        <div className={embedded ? "w-full" : "layout-container"}>
          {headerBlock}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={`achievements-skeleton-${idx}`} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="animate-pulse">
                  <div className="w-full bg-muted" style={{ aspectRatio: ACHIEVEMENT_BANNER_CROP_ASPECT }} />
                  <div className="space-y-2 p-3">
                    <div className="h-3 w-20 rounded bg-muted" />
                    <div className="h-4 w-3/4 rounded bg-muted" />
                    <div className="h-3 w-full rounded bg-muted" />
                    <div className="h-3 w-5/6 rounded bg-muted" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (achievements.length === 0) {
    return (
      <section id="achievements" className={embedded ? "scroll-mt-20 bg-background py-6 sm:scroll-mt-[5.5rem] sm:py-8" : sectionShellClass}>
        <div className={embedded ? "w-full" : "layout-container"}>
          {headerBlock}
          <p className="text-center text-sm text-muted-foreground">No achievements to show yet.</p>
        </div>
      </section>
    );
  }

  const isMobileGrid = isNarrowViewport && narrowGridW < 540;
  const mobileZoom = isMobileGrid && narrowGridW < MOBILE_REF_W ? narrowGridW / MOBILE_REF_W : 1;
  const mobileGridZoomStyle =
    isNarrowViewport && mobileZoom < 1 && !isIosSafariViewport() ? ({ zoom: mobileZoom } as CSSProperties) : undefined;

  return (
    <section id="achievements" className={embedded ? "scroll-mt-20 bg-background py-6 sm:scroll-mt-[5.5rem] sm:py-8" : sectionShellClass}>
      <div className={embedded ? "w-full" : "layout-container"}>
        {headerBlock}

        {/* Narrow/mobile: one card per row */}
        {isNarrowViewport ? (
          <div ref={narrowGridOuterRef} className="w-full min-w-0">
            <div
              className="hpc-ios-touch-text-root grid w-full min-w-0 grid-cols-1 items-stretch gap-3 sm:gap-4 md:gap-5"
              style={mobileGridZoomStyle}
            >
              {achievements.slice(0, visibleCount).map((a, i) => (
                <AchievementGridCard
                  key={a.id}
                  a={a}
                  i={i}
                  onMediaSettled={handleCardMediaSettled}
                />
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
                  alignItems: "stretch",
                  gap: "16px",
                }}
              >
                {achievements.slice(0, visibleCount).map((a, i) => (
                  <AchievementGridCard
                    key={a.id}
                    a={a}
                    i={i}
                    onMediaSettled={handleCardMediaSettled}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {(visibleCount < achievements.length || visibleCount > 3) && (
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
            {visibleCount > 3 && (
              <button
                onClick={() => setVisibleCount(3)}
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
