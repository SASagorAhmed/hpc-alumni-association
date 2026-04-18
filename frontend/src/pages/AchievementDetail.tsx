import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate, useLocation, type Location } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Calendar,
  Building2,
  GraduationCap,
  BookOpen,
  Briefcase,
  Hash,
  Award,
  School,
  ImageIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useHistorySyncOverlay } from "@/hooks/useHistorySyncOverlay";
import { FullScreenRouteLayer } from "@/components/routing/FullScreenRouteLayer";
import { preserveTopNavbarForBackground } from "@/lib/fullScreenLayerPreserveNavbar";
import { PublicMetaverseChrome } from "@/components/layout/PublicMetaverseChrome";
import { JustifiedDetailText } from "@/components/landing/JustifiedDetailText";
import type { AchievementPublicRecord } from "@/lib/achievementPublic";
import { achievementDetailQueryKey, fetchPublicAchievementById } from "@/lib/publicDataQueries";

function DetailRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string | null | undefined }) {
  const v = value != null ? String(value).trim() : "";
  if (!v) return null;
  return (
    <div className="flex gap-2.5 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0 flex-1">
        <span className="block text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="text-foreground [overflow-wrap:anywhere]">{v}</span>
      </div>
    </div>
  );
}

function detailBox(title: string, children: ReactNode) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="mb-3 border-b border-border pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{title}</h2>
      {children}
    </div>
  );
}

export default function AchievementDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const backgroundLocation = (location.state as { backgroundLocation?: Location } | null)?.backgroundLocation;
  const isLayer = Boolean(backgroundLocation);
  const preserveTopNavbar = preserveTopNavbarForBackground(backgroundLocation);
  const [imgOpen, setImgOpen] = useState(false);
  const { data: a = null, isPending: loading } = useQuery<AchievementPublicRecord | null>({
    queryKey: achievementDetailQueryKey(id ?? ""),
    queryFn: () => fetchPublicAchievementById(id ?? ""),
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

  const dateLabel =
    a?.achievement_date != null && String(a.achievement_date).trim()
      ? new Date(a.achievement_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : null;

  const hasProfessional =
    a &&
    [a.alumni_ref_id, a.section, a.session, a.department, a.university, a.profession, a.institution].some(
      (x) => x != null && String(x).trim()
    );

  const detailContent = (
    <div className="layout-container w-full min-w-0 pb-8 pt-4 sm:pb-10 sm:pt-5">
          <button
            type="button"
            onClick={handleBack}
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Achievements
          </button>

          {loading && (
            <div className="flex items-center justify-center py-32 text-sm text-muted-foreground">Loading…</div>
          )}

          {!loading && !a && (
            <div className="flex flex-col items-center justify-center gap-4 py-32">
              <p className="text-base text-muted-foreground">Achievement not found.</p>
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" /> Go back
              </button>
            </div>
          )}

          {!loading && a && (
            <article className="space-y-10">
              {/* Masthead — newspaper-style */}
              <header className="space-y-4 border-b-2 border-foreground/15 pb-8">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Alumni achievement news</p>
                {dateLabel ? (
                  <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" aria-hidden />
                    <time dateTime={a.achievement_date ?? undefined}>{dateLabel}</time>
                  </p>
                ) : null}
                <h1
                  className="text-balance text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl md:text-[2.35rem]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {a.achievement_title}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4">
                  <p className="text-lg font-semibold text-foreground" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    {a.name}
                  </p>
                  {a.batch?.trim() ? (
                    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <GraduationCap className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      Batch {a.batch}
                    </span>
                  ) : null}
                  {a.tag ? (
                    <Badge variant="secondary" className="font-medium">
                      {a.tag}
                    </Badge>
                  ) : null}
                </div>
              </header>

              {/* Hero photo — full width of content column, like Memory detail */}
              <div
                className="w-full min-w-0 cursor-zoom-in overflow-hidden rounded-2xl border border-border bg-muted shadow-md"
                onClick={() => a.photo_url && setImgOpen(true)}
              >
                {a.photo_url ? (
                  <img
                    src={a.photo_url}
                    alt=""
                    className="block h-auto w-full max-w-full"
                  />
                ) : (
                  <div className="flex items-center justify-center py-24">
                    <ImageIcon className="h-16 w-16 text-muted-foreground/30" aria-hidden />
                  </div>
                )}
              </div>

              <div className="space-y-8">
                {hasProfessional ? (
                  <section>
                    <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground">
                      <Briefcase className="h-4 w-4 text-primary" aria-hidden />
                      Professional &amp; alumni details
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      <DetailRow icon={Hash} label="Alumni ID" value={a.alumni_ref_id} />
                      <DetailRow icon={BookOpen} label="Section" value={a.section} />
                      <DetailRow icon={GraduationCap} label="Session" value={a.session} />
                      <DetailRow icon={Building2} label="Department" value={a.department} />
                      <DetailRow icon={School} label="University" value={a.university} />
                      <DetailRow icon={Briefcase} label="Profession" value={a.profession} />
                      <DetailRow icon={Building2} label="Institution / company" value={a.institution} />
                    </div>
                  </section>
                ) : null}

                {a.about?.trim() ? detailBox("About", <JustifiedDetailText text={a.about.trim()} />) : null}

                {a.achievement_details?.trim()
                  ? detailBox("Details of achievement", <JustifiedDetailText text={a.achievement_details.trim()} />)
                  : null}

                {a.message?.trim() ? (
                  <div className="rounded-xl border border-primary/25 bg-primary/[0.04] p-5 sm:p-6">
                    <div className="mb-3 flex items-center gap-2">
                      <Award className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Congratulations message</h2>
                    </div>
                    <JustifiedDetailText text={a.message.trim()} />
                  </div>
                ) : null}
              </div>
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

      {imgOpen && a?.photo_url && (
        <div
          className="fixed inset-0 z-[9999] flex cursor-zoom-out items-center justify-center bg-black/90 p-4"
          onClick={() => setImgOpen(false)}
        >
          <img
            src={a.photo_url}
            alt=""
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
