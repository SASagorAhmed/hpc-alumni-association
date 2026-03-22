import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Award, MapPin, Calendar, GraduationCap, PartyPopper, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
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

const tagColors: Record<string, string> = {
  "New Job": "bg-blue-100 text-blue-700 border-blue-200",
  "Scholarship": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Award": "bg-amber-100 text-amber-700 border-amber-200",
};

const AchievementsSection = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [visibleCount, setVisibleCount] = useState(6);

  useEffect(() => {
    const fetchData = async () => {
      const now = new Date().toISOString();
      // API example: `${API_BASE_URL}/path` (base from src/api-production/api.js + .env VITE_API_URL)
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
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

              {/* Photo — full-width top */}
              <div className="w-full aspect-square sm:aspect-[4/3] overflow-hidden">
                {a.photo_url ? (
                  <img src={a.photo_url} alt={a.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center" style={{ background: "var(--achievement-card-photo-bg)" }}>
                    <Camera className="h-7 w-7 text-primary/40 sm:h-10 sm:w-10" />
                  </div>
                )}
              </div>

              {/* Right — Content */}
              <div className="flex flex-col items-center text-center p-2 sm:p-3 flex-1">
                <span className="fs-caption mb-0.5 font-semibold tracking-wider text-amber-600 uppercase" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  #{String(i + 1).padStart(2, "0")} — Achievement
                </span>
                <h3 className="fs-ui font-bold leading-tight text-foreground" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  {a.name}
                </h3>
                <div className="mt-1.5">
                  <span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                    {a.achievement_title}
                  </span>
                </div>

                {a.tag && (
                  <div className="mt-1">
                    <Badge variant="outline" className={cn("text-xs", tagColors[a.tag] || "bg-muted text-muted-foreground border-border")}>
                      {a.tag}
                    </Badge>
                  </div>
                )}

                <div className="mt-2 flex flex-col gap-1 items-center">
                  {a.batch && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <GraduationCap size={12} className="text-primary" /> Batch: {a.batch}
                    </span>
                  )}
                  {a.institution && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      🏫 {a.institution}
                    </span>
                  )}
                  {a.location && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 text-primary" /> {a.location}
                    </span>
                  )}
                  {a.achievement_date && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 text-primary" /> {new Date(a.achievement_date).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {a.message && (
                  <div className="mt-2 hidden w-full border-t border-border pt-2 sm:block">
                    <div className="flex items-start gap-1.5 rounded-lg border border-border bg-muted/40 p-2 text-left">
                      <PartyPopper className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                      <p className="text-xs text-foreground/80 leading-relaxed line-clamp-2">
                        {a.message}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
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
