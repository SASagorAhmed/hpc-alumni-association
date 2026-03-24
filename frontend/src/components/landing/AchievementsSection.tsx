import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Award, Calendar, GraduationCap, PartyPopper, Camera, Building2 } from "lucide-react";
import { API_BASE_URL } from "@/api-production/api.js";

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


/** Desktop reference width for the achievements grid (3-col layout). */
const ACHIEVEMENTS_DESIGN_W = 1024;

const AchievementsSection = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [visibleCount, setVisibleCount] = useState(6);
  const gridOuterRef = useRef<HTMLDivElement>(null);
  const gridInnerRef = useRef<HTMLDivElement>(null);
  const [gridScale, setGridScale] = useState(1);
  const [gridWrapH, setGridWrapH] = useState<number | undefined>(undefined);

  // Re-run when data loads (same pattern as banner — refs are null on first null-render).
  const gridReady = achievements.length > 0;
  useLayoutEffect(() => {
    const outer = gridOuterRef.current;
    const inner = gridInnerRef.current;
    if (!outer || !inner) return;
    const update = () => {
      const w = outer.getBoundingClientRect().width;
      if (!w) return;
      const s = Math.min(1, w / ACHIEVEMENTS_DESIGN_W);
      setGridScale(s);
      setGridWrapH(s < 1 ? Math.round(inner.offsetHeight * s) : undefined);
    };
    let r1 = 0, r2 = 0;
    r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(update); });
    const ro = new ResizeObserver(update);
    ro.observe(outer);
    ro.observe(inner);
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); ro.disconnect(); };
  }, [gridReady, visibleCount]);

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

  const scaled = gridScale < 1;

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
            Achievements
          </div>
          <h2 className="fs-title font-bold text-foreground" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Achievements of Our Alumni
          </h2>
          <p className="fs-body mx-auto mt-3 max-w-xl text-muted-foreground max-lg:text-justify max-lg:hyphens-auto">
            Celebrating the remarkable accomplishments of our alumni community
          </p>
        </motion.div>

        {/* Scale canvas — same pattern as committee board and banner */}
        <div ref={gridOuterRef} className="w-full min-w-0">
          <div
            className="relative overflow-hidden"
            style={scaled && gridWrapH ? { height: gridWrapH } : undefined}
          >
            <div
              ref={gridInnerRef}
              className="origin-top-left"
              style={scaled
                ? { width: `${ACHIEVEMENTS_DESIGN_W}px`, transform: `scale(${gridScale})`, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "16px" }
                : { width: "100%", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "16px" }
              }
            >
              {achievements.slice(0, visibleCount).map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary/50 flex flex-col"
                  style={{ background: "var(--achievement-card-bg)" }}
                >
                  {/* Top accent bar */}
                  <div className="h-1" style={{ background: "var(--achievement-card-accent-bar)" }} />

                  {/* Photo — desktop aspect ratio always */}
                  <div className="w-full aspect-[4/3] overflow-hidden">
                    {a.photo_url ? (
                      <img src={a.photo_url} alt={a.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center" style={{ background: "var(--achievement-card-photo-bg)" }}>
                        <Camera className="h-10 w-10 text-primary/40" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex flex-col items-center text-center p-3 flex-1 gap-2">

                    {/* 1 — Serial */}
                    <span className="text-[0.68rem] font-semibold tracking-wider text-amber-600 uppercase">
                      #{String(i + 1).padStart(2, "0")} Achievement
                    </span>

                    {/* 2 — Name */}
                    <h3 className="font-bold text-sm leading-snug text-foreground" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      {a.name}
                    </h3>

                    {/* 3 — Achievement title */}
                    {a.achievement_title && (
                      <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                        {a.achievement_title}
                      </span>
                    )}

                    {/* 4 — Batch · Date · Institution (horizontal row, centered) */}
                    <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1">
                      {a.batch && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <GraduationCap size={11} className="text-primary shrink-0" />
                          Batch {a.batch}
                        </span>
                      )}
                      {a.achievement_date && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-2.5 w-2.5 text-primary shrink-0" />
                          {new Date(a.achievement_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        </span>
                      )}
                      {a.institution && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Building2 className="h-2.5 w-2.5 text-primary shrink-0" />
                          {a.institution}
                        </span>
                      )}
                    </div>

                    {/* 5 — Full congratulations message */}
                    {a.message && (
                      <div className="mt-auto w-full pt-2 border-t border-border">
                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-left">
                          <div className="flex items-center gap-1.5 mb-1">
                            <PartyPopper className="h-3 w-3 shrink-0 text-primary" />
                            <span className="text-[0.6rem] font-semibold uppercase tracking-wider text-primary">Congratulations</span>
                          </div>
                          <p className="text-xs text-foreground/85 leading-relaxed whitespace-pre-wrap">
                            {a.message}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

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
