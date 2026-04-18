import { useState, useRef, useLayoutEffect, useEffect, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import type { StructuredCommitteePayload } from "@/components/committee/StructuredCommitteeDisplay";
import { API_BASE_URL } from "@/api-production/api.js";
import {
  AlumniExecutiveCommitteeBoard,
  AlumniExecutiveCommitteeIntro,
  PresidentHeroCard,
  ExecutiveMemberCard,
  MobilePresidentCard,
  MobileMemberCard,
  type DBMember,
} from "@/components/committee/AlumniExecutiveCommitteeBoard";
import { Skeleton } from "@/components/ui/skeleton";
import { isIosSafariViewport } from "@/lib/iosSafari";
import { BREAKPOINT_MOBILE_MAX, layoutCanvasScale } from "@/lib/breakpoints";
import { usePersistedState } from "@/hooks/usePersistedState";
import { cn } from "@/lib/utils";
import administrationOfHpcCollegeImage from "@/assets/G-body-2025.jpg";
import drHakimImage from "@/assets/Dr. Hakim Md.Yousuf Harun Bhuiyan.jpeg";
import governingBodyChairmanImage from "@/assets/G body chairman.jpg";
import actingPrincipalImage from "@/assets/acting principal.jpg";

const COMMITTEE_DESIGN_W = 1024;
const MOBILE_REF_W = BREAKPOINT_MOBILE_MAX;

type PresidentSpotlight = {
  name: string;
  title: string;
  photoUrl: string | null;
};

function isPresidentHint(value: string | null | undefined) {
  return /সভাপতি|president/i.test(String(value ?? "").trim());
}

function presidentFromStructured(data: StructuredCommitteePayload | null | undefined): PresidentSpotlight | null {
  if (!data?.posts?.length) return null;
  for (const post of data.posts) {
    const members = post.members ?? [];
    for (const member of members) {
      if (member.category === "president" || isPresidentHint(post.title) || isPresidentHint(member.designation)) {
        return {
          name: member.name,
          title: post.title || member.designation || "President",
          photoUrl: member.photo_url ?? null,
        };
      }
    }
  }
  return null;
}

function toPresidentSpotlight(member: DBMember | undefined): PresidentSpotlight | null {
  if (!member) return null;
  return {
    name: member.name,
    title: member.designation || "President",
    photoUrl: member.photo_url ?? null,
  };
}

function AdministrationBanner({ president, embedded = false }: { president: PresidentSpotlight | null; embedded?: boolean }) {
  const administrationHead = (
    <div className="hpc-administration-panel-header border-b border-border/70 px-4 py-3 text-center sm:px-6">
      <h2 className="font-outfit-section text-lg font-bold tracking-wide text-foreground sm:text-xl">
        ADMINISTRATION OF HAMDARD PUBLIC COLLEGE
      </h2>
    </div>
  );

  const administrationBody = (
    <div className="px-4 py-4 sm:px-6 sm:py-5">
      <div className="mx-auto flex w-full max-w-none flex-col items-center gap-3 text-center">
        <div className="h-40 w-40 overflow-hidden rounded-xl border border-border/70 bg-white/[0.06] shadow-sm sm:h-48 sm:w-48">
          {president?.photoUrl ? (
            <img
              src={president.photoUrl}
              alt={president.name}
              className="h-full w-full object-cover object-center"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-muted-foreground">
              {president?.name?.trim()?.charAt(0).toUpperCase() ?? "P"}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-base font-medium text-landing-description sm:text-lg">
            {president?.name ?? "President information will be available soon"}
          </p>
          <p className="text-sm font-medium text-primary sm:text-base">{president?.title ?? "President"}</p>
        </div>
        <div className="fs-banner-message-body mt-1 w-full max-w-none space-y-3 text-justify text-landing-description [text-align-last:left] hyphens-none break-normal [word-break:normal] [overflow-wrap:normal] max-lg:text-pretty max-lg:leading-relaxed lg:text-pretty">
          <p className="text-justify break-normal [word-break:normal] [overflow-wrap:normal]">
            On behalf of the Alumni Association, we express our deepest respect and sincere gratitude to our esteemed
            Founder, Hakim Sir (Dr. Hakim Md. Yousuf Harun Bhuiyan), the honorable Principal, respected teachers, and
            members of the administration and governing body. We are truly proud to have such dedicated and visionary
            individuals guiding our beloved institution.
          </p>
          <p className="text-justify break-normal [word-break:normal] [overflow-wrap:normal]">
            Hamdard Public College is more than an institution to us, it is a place of memories, values, and inspiration
            where we built our dreams and shaped our future. Along with our fellow alumni and junior HPCians, we remain
            deeply grateful for your guidance, dedication, and continuous efforts in maintaining excellence and discipline.
            As members of the HPC family, we carry this identity with pride and look forward to seeing our beloved
            institution reach even greater heights.
          </p>
          <p className="pt-1 font-medium text-justify break-normal [word-break:normal] [overflow-wrap:normal]">
            With respect and appreciation,
            <br />
            <span className="font-bold">{president?.name ?? "President"}</span>
            <br />
            President, HPC Alumni Association
          </p>
        </div>
      </div>
    </div>
  );

  const boardHead = (
    <div className="hpc-administration-panel-header border-b border-border/70 px-4 py-3 text-center sm:px-6">
      <h3 className="font-outfit-section text-lg font-bold tracking-wide text-foreground sm:text-xl">BOARD MEMBERS</h3>
    </div>
  );

  const boardBody = (
    <div className="grid gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] sm:items-stretch sm:px-6 sm:py-5">
          <div className="flex justify-center sm:hidden">
            <div className="space-y-3 text-center">
              <div className="flex flex-col items-center space-y-1 text-center">
                <img
                  src={drHakimImage}
                  alt="Dr. Hakim Md. Yousuf Harun Bhuiyan"
                  className="mx-auto h-auto w-full max-w-[220px] rounded-xl border border-border/60 object-cover shadow-sm"
                  loading="lazy"
                  decoding="async"
                />
                <p className="text-center text-sm font-medium leading-tight text-landing-description">
                  Dr. Hakim Md. Yousuf Harun Bhuiyan
                </p>
                <p className="text-center text-xs leading-tight text-muted-foreground sm:text-sm">
                  Founder, Hamdard Public College
                </p>
              </div>

              <div className="flex flex-col items-center space-y-1 text-center">
                <img
                  src={governingBodyChairmanImage}
                  alt="Professor Kamrun Nahar Harun"
                  className="mx-auto h-auto w-full max-w-[220px] rounded-xl border border-border/60 object-cover shadow-sm"
                  loading="lazy"
                  decoding="async"
                />
                <p className="text-center text-sm font-medium leading-tight text-landing-description">
                  Professor Kamrun Nahar Harun
                </p>
                <p className="text-center text-xs leading-tight text-muted-foreground sm:text-sm">
                  Chairman, Governing Body
                </p>
                <p className="text-center text-xs leading-tight text-muted-foreground sm:text-sm">
                  Hamdard Public College
                </p>
              </div>

              <div className="flex flex-col items-center space-y-1 text-center">
                <img
                  src={actingPrincipalImage}
                  alt="Md. Nazrul Islam"
                  className="mx-auto h-auto w-full max-w-[220px] rounded-xl border border-border/60 object-cover shadow-sm"
                  loading="lazy"
                  decoding="async"
                />
                <p className="text-center text-sm font-medium leading-tight text-landing-description">
                  Md. Nazrul Islam
                </p>
                <p className="text-center text-xs leading-tight text-muted-foreground sm:text-sm">
                  Principal (Acting), Hamdard Public College
                </p>
              </div>
            </div>
          </div>

          <div className="order-2 flex min-h-0 sm:order-1 sm:h-full">
            <div className="hpc-administration-board-photo-frame h-auto min-h-[220px] w-full sm:min-h-0 sm:h-full">
              <img
                src={administrationOfHpcCollegeImage}
                alt="Administration of Hamdard Public College board members"
                className="hpc-administration-board-photo-img h-full w-full object-contain object-center"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
          <div className="order-3 h-full space-y-3 text-sm leading-relaxed text-foreground sm:order-2 sm:space-y-0 sm:text-[15px]">
            <div className="hidden h-full w-full justify-center sm:flex">
              <div className="flex h-full w-full max-w-[220px] flex-col justify-center gap-6 py-3 text-center lg:gap-7 lg:py-4">
                <div className="flex flex-col items-center space-y-1 text-center">
                  <img
                    src={drHakimImage}
                    alt="Dr. Hakim Md. Yousuf Harun Bhuiyan"
                    className="mx-auto h-auto w-full max-w-[220px] rounded-xl border border-border/60 object-cover shadow-sm"
                    loading="lazy"
                    decoding="async"
                  />
                  <p className="text-center text-sm font-medium leading-tight text-landing-description">
                    Dr. Hakim Md. Yousuf Harun Bhuiyan
                  </p>
                  <p className="text-center text-xs leading-tight text-muted-foreground sm:text-sm">
                    Founder, Hamdard Public College
                  </p>
                </div>

                <div className="flex flex-col items-center space-y-1 text-center">
                  <img
                    src={governingBodyChairmanImage}
                    alt="Professor Kamrun Nahar Harun"
                    className="mx-auto h-auto w-full max-w-[220px] rounded-xl border border-border/60 object-cover shadow-sm"
                    loading="lazy"
                    decoding="async"
                  />
                  <p className="text-center text-sm font-medium leading-tight text-landing-description">
                    Professor Kamrun Nahar Harun
                  </p>
                  <p className="text-center text-xs leading-tight text-muted-foreground sm:text-sm">
                    Chairman, Governing Body
                  </p>
                  <p className="text-center text-xs leading-tight text-muted-foreground sm:text-sm">
                    Hamdard Public College
                  </p>
                </div>

                <div className="flex flex-col items-center space-y-1 text-center">
                  <img
                    src={actingPrincipalImage}
                    alt="Md. Nazrul Islam"
                    className="mx-auto h-auto w-full max-w-[220px] rounded-xl border border-border/60 object-cover shadow-sm"
                    loading="lazy"
                    decoding="async"
                  />
                  <p className="text-center text-sm font-medium leading-tight text-landing-description">
                    Md. Nazrul Islam
                  </p>
                  <p className="text-center text-xs leading-tight text-muted-foreground sm:text-sm">
                    Principal (Acting), Hamdard Public College
                  </p>
                </div>
              </div>
            </div>
          </div>
    </div>
  );

  if (embedded) {
    return (
      <div className="mb-6 sm:mb-8">
        <div className="hpc-administration-panel overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
          {administrationHead}
          {administrationBody}
          <div className="hpc-administration-panel-section-divider" aria-hidden />
          {boardHead}
          {boardBody}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 space-y-4 sm:mb-8 sm:space-y-5">
      <div className="hpc-administration-panel overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        {administrationHead}
        {administrationBody}
      </div>
      <div className="hpc-administration-panel overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        {boardHead}
        {boardBody}
      </div>
    </div>
  );
}

const CommitteeSection = ({ showAll = false, embedded = false }: { showAll?: boolean; embedded?: boolean }) => {
  const [visibleCount, setVisibleCount] = usePersistedState<number>(
    "landing:committee:visible-count",
    6
  );
  const legacyOuterRef = useRef<HTMLDivElement>(null);
  const legacyInnerRef = useRef<HTMLDivElement>(null);
  const [legacyScale, setLegacyScale] = useState(1);
  const [legacyWrapH, setLegacyWrapH] = useState<number | undefined>(undefined);
  const [legacyW, setLegacyW] = useState(COMMITTEE_DESIGN_W);
  const [legacyMeasureTick, setLegacyMeasureTick] = useState(0);

  useEffect(() => {
    const outer = legacyOuterRef.current;
    if (!outer) return;
    // Re-measure when nested images settle to avoid clipped half-cards.
    const onMediaSettled = () => setLegacyMeasureTick((v) => v + 1);
    outer.addEventListener("load", onMediaSettled, true);
    outer.addEventListener("error", onMediaSettled, true);
    return () => {
      outer.removeEventListener("load", onMediaSettled, true);
      outer.removeEventListener("error", onMediaSettled, true);
    };
  }, [visibleCount]);

  useLayoutEffect(() => {
    const outer = legacyOuterRef.current;
    const inner = legacyInnerRef.current;
    if (!outer || !inner) return;
    const update = () => {
      const w = outer.getBoundingClientRect().width;
      if (!w) return;
      setLegacyW(w);
      const s = Math.min(1, w / COMMITTEE_DESIGN_W);
      setLegacyScale(s);
      setLegacyWrapH(s < 1 ? Math.round(inner.offsetHeight * s) : undefined);
    };
    let r1 = 0, r2 = 0;
    r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(update); });
    const ro = new ResizeObserver(update);
    ro.observe(outer);
    ro.observe(inner);
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); ro.disconnect(); };
  }, [visibleCount, legacyMeasureTick]);

  const { data: structured, isLoading: structuredLoading, isFetching: structuredFetching } = useQuery({
    queryKey: ["committee-active-public"],
    queryFn: async (): Promise<StructuredCommitteePayload | null> => {
      const res = await fetch(`${API_BASE_URL}/api/public/committee/active`);
      if (!res.ok) return null;
      const raw = await res.json();
      if (!raw || !raw.term) return null;
      return raw as StructuredCommitteePayload;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    placeholderData: (previousData) => previousData,
  });

  const { data: dbMembers, isLoading: dbLoading } = useQuery({
    queryKey: ["committee-members-public-legacy"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/public/committee-members?active=true`);
      if (!res.ok) return [] as DBMember[];
      return res.json() as DBMember[];
    },
    // Prevent flicker: don't render legacy committee cards until structured finished loading.
    enabled: !structuredLoading && !structuredFetching && !structured?.term?.id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    placeholderData: (previousData) => previousData,
  });

  const useStructured = Boolean(structured?.term?.id);

  if (structuredLoading || structuredFetching) {
    return (
      <section
        id="committee"
        className={embedded ? "relative overflow-hidden bg-transparent py-6 sm:py-8" : "relative overflow-hidden border-t border-border/60 bg-background py-10 sm:py-16"}
      >
        <div className={embedded ? "relative w-full" : "layout-container relative"}>
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden p-6 sm:p-8 space-y-5">
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-[300px] w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      </section>
    );
  }

  if (useStructured && structured) {
    const spotlightPresident = presidentFromStructured(structured);
    return (
      <section
        id="committee"
        className={embedded ? "relative overflow-hidden bg-transparent py-6 sm:py-8" : "relative overflow-hidden border-t border-border/60 bg-background py-10 sm:py-16"}
      >
        <div className={embedded ? "relative w-full" : "layout-container relative"}>
          <AdministrationBanner president={spotlightPresident} embedded={embedded} />
          <AlumniExecutiveCommitteeBoard data={structured} showAll={showAll} compactIntro={embedded} />
        </div>
      </section>
    );
  }

  // Still loading the legacy query — show skeleton
  if (dbLoading) {
    return (
      <section
        id="committee"
        className={embedded ? "relative overflow-hidden bg-transparent py-6 sm:py-8" : "relative overflow-hidden border-t border-border/60 bg-background py-10 sm:py-16"}
      >
        <div className={embedded ? "relative w-full" : "layout-container relative"}>
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden p-6 sm:p-8 space-y-5">
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-[300px] w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      </section>
    );
  }

  const presidentMember = dbMembers?.find((m) => m.category === "president");
  const officerMembers = dbMembers?.filter((m) => m.category === "officer") ?? [];
  const executiveMembers = dbMembers?.filter((m) => m.category === "executive") ?? [];
  const otherMembers = [...officerMembers, ...executiveMembers];

  // Keep a stable section shell even when no data exists
  // so lower sections (community/contact) do not drift after refresh.
  if (!presidentMember && otherMembers.length === 0) {
    return (
      <section
        id="committee"
        className={
          embedded
            ? "relative overflow-hidden bg-transparent py-6 sm:py-8"
            : "relative overflow-hidden border-t border-border/60 bg-background py-10 sm:py-16"
        }
      >
        <div className={embedded ? "relative w-full" : "layout-container relative"}>
          <AdministrationBanner president={null} embedded={embedded} />
          <AlumniExecutiveCommitteeIntro totalMembers={0} />
          <p className="mt-6 rounded-xl border border-dashed border-border bg-card/40 p-6 text-center text-landing-description">
            Committee information will be available soon.
          </p>
        </div>
      </section>
    );
  }
  const displayCount = showAll ? otherMembers.length : visibleCount;
  const isLegacyMobile = legacyW < 540;
  // Keep native font size on phones; avoid zoom shrinking.
  const legacyMobileZoomStyle = undefined;
  // Mobile readability: render one card per row.
  const legacyTwoColMobile = false;

  return (
    <section
      id="committee"
      className={embedded ? "relative overflow-hidden bg-transparent py-6 sm:py-8" : "relative overflow-hidden border-t border-border/60 bg-background py-10 sm:py-16"}
    >
      <div className={embedded ? "relative w-full" : "layout-container relative"}>
        <AdministrationBanner president={toPresidentSpotlight(presidentMember)} embedded={embedded} />
        <AlumniExecutiveCommitteeIntro totalMembers={1 + otherMembers.length} />

        <div ref={legacyOuterRef} className="w-full min-w-0">
          {isLegacyMobile ? (
            /* ── MOBILE layout (<540 px): zooms on narrow phones ── */
            <div
              className={`hpc-ios-touch-text-root min-w-0 ${legacyTwoColMobile ? "grid grid-cols-2 gap-4" : "flex flex-col gap-4"}`}
              style={legacyMobileZoomStyle}
            >
              {presidentMember && (
                <div className={legacyTwoColMobile ? "col-span-2" : undefined}>
                  <MobilePresidentCard member={presidentMember} />
                </div>
              )}

              {otherMembers.slice(0, displayCount).map((member, i) => (
                <div key={member.id} className={legacyTwoColMobile ? undefined : undefined}>
                  <MobileMemberCard member={member} serial={i + 2} />
                </div>
              ))}

              {!showAll && (visibleCount < otherMembers.length || visibleCount > 6) && (
                <div className={legacyTwoColMobile ? "col-span-2" : undefined}>
                  <div className="flex items-center justify-center gap-4 mt-2">
                    {visibleCount < otherMembers.length && (
                      <>
                        <button
                          type="button"
                          onClick={() => setVisibleCount((prev) => prev + 6)}
                          className="px-5 py-2 rounded-full border border-primary text-primary fs-ui font-medium hover:bg-primary/10 transition-colors"
                        >
                          See More ({otherMembers.length - visibleCount} remaining)
                        </button>
                        <button
                          type="button"
                          onClick={() => setVisibleCount(otherMembers.length)}
                          className="fs-ui font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
                        >
                          See All
                        </button>
                      </>
                    )}
                    {visibleCount > 6 && (
                      <button
                        type="button"
                        onClick={() => setVisibleCount(6)}
                        className="px-5 py-2 rounded-full border border-muted-foreground/30 text-muted-foreground fs-ui font-medium hover:bg-muted transition-colors"
                      >
                        Show Less
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div ref={legacyInnerRef} className="sr-only" />
            </div>
          ) : (
            /* ── DESKTOP / TABLET layout: transform-scale canvas (≥ 540 px) ── */
            <div className="relative overflow-hidden" style={legacyWrapH ? { height: legacyWrapH } : undefined}>
              <div
                ref={legacyInnerRef}
                className="flex flex-col origin-top-left"
                style={{
                  width: `${COMMITTEE_DESIGN_W}px`,
                  transform: `scale(${legacyScale})`,
                  gap: "40px",
                }}
              >
                <div className="mx-auto flex w-full min-w-0 justify-center px-0">
                  <PresidentHeroCard member={presidentMember} />
                </div>
                <div
                  className="grid w-full min-w-0 gap-5"
                  style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "20px" }}
                >
                  {otherMembers.slice(0, displayCount).map((member, i) => (
                    <div key={member.id} className="min-w-0">
                      <ExecutiveMemberCard member={member} serial={i + 2} />
                    </div>
                  ))}
                </div>
                {!showAll && (visibleCount < otherMembers.length || visibleCount > 6) && (
                  <div className="flex items-center justify-center gap-4 mt-8">
                    {visibleCount < otherMembers.length && (
                      <>
                        <button type="button" onClick={() => setVisibleCount((prev) => prev + 6)}
                          className="fs-button-text px-5 py-2 rounded-full border border-primary text-primary font-medium hover:bg-primary/10 transition-colors">
                          See More ({otherMembers.length - visibleCount} remaining)
                        </button>
                        <button type="button" onClick={() => setVisibleCount(otherMembers.length)}
                          className="fs-ui font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors">
                          See All
                        </button>
                      </>
                    )}
                    {visibleCount > 6 && (
                      <button type="button" onClick={() => setVisibleCount(6)}
                        className="px-5 py-2 rounded-full border border-muted-foreground/30 text-muted-foreground fs-ui font-medium hover:bg-muted transition-colors">
                        Show Less
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default CommitteeSection;
