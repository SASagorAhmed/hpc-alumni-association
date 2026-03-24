import { useState, useRef, useLayoutEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { StructuredCommitteePayload } from "@/components/committee/StructuredCommitteeDisplay";
import { API_BASE_URL } from "@/api-production/api.js";
import {
  AlumniExecutiveCommitteeBoard,
  AlumniExecutiveCommitteeIntro,
  PresidentHeroCard,
  ExecutiveMemberCard,
  type DBMember,
} from "@/components/committee/AlumniExecutiveCommitteeBoard";
import { Skeleton } from "@/components/ui/skeleton";


const COMMITTEE_DESIGN_W = 1024;

const CommitteeSection = ({ showAll = false }: { showAll?: boolean }) => {
  const [visibleCount, setVisibleCount] = useState(6);
  const legacyOuterRef = useRef<HTMLDivElement>(null);
  const legacyInnerRef = useRef<HTMLDivElement>(null);
  const [legacyScale, setLegacyScale] = useState(1);
  const [legacyWrapH, setLegacyWrapH] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const outer = legacyOuterRef.current;
    const inner = legacyInnerRef.current;
    if (!outer || !inner) return;
    const update = () => {
      const w = outer.getBoundingClientRect().width;
      if (!w) return;
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
  }, [visibleCount]);

  const { data: structured, isLoading: structuredLoading, isFetching: structuredFetching } = useQuery({
    queryKey: ["committee-active-public"],
    queryFn: async (): Promise<StructuredCommitteePayload | null> => {
      const res = await fetch(`${API_BASE_URL}/api/public/committee/active`);
      if (!res.ok) return null;
      const raw = await res.json();
      if (!raw || !raw.term) return null;
      return raw as StructuredCommitteePayload;
    },
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
  });

  const useStructured = Boolean(structured?.term?.id);

  if (structuredLoading || structuredFetching) {
    return (
      <section id="committee" className="relative overflow-hidden border-t border-border/60 bg-background py-10 sm:py-16">
        <div className="layout-container relative">
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
    return (
      <section id="committee" className="relative overflow-hidden border-t border-border/60 bg-background py-10 sm:py-16">
        <div className="layout-container relative">
          <AlumniExecutiveCommitteeBoard data={structured} showAll={showAll} />
        </div>
      </section>
    );
  }

  // Still loading the legacy query — show skeleton
  if (dbLoading) {
    return (
      <section id="committee" className="relative overflow-hidden border-t border-border/60 bg-background py-10 sm:py-16">
        <div className="layout-container relative">
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

  // No real data from DB — hide section entirely
  if (!presidentMember && otherMembers.length === 0) return null;
  const displayCount = showAll ? otherMembers.length : visibleCount;

  return (
    <section id="committee" className="relative overflow-hidden border-t border-border/60 bg-background py-10 sm:py-16">
      <div className="layout-container relative">
        <AlumniExecutiveCommitteeIntro totalMembers={1 + otherMembers.length} />

        {/* Scale canvas — same pattern as AlumniExecutiveCommitteeBoard */}
        <div ref={legacyOuterRef} className="w-full min-w-0">
          <div
            className="relative overflow-hidden"
            style={legacyScale < 1 && legacyWrapH ? { height: legacyWrapH } : undefined}
          >
            <div
              ref={legacyInnerRef}
              className="flex flex-col origin-top-left"
              style={legacyScale < 1
                ? { width: `${COMMITTEE_DESIGN_W}px`, transform: `scale(${legacyScale})`, gap: "40px" }
                : { width: "100%", gap: "40px" }
              }
            >
              <div className="mx-auto flex w-full min-w-0 justify-center px-0">
                <PresidentHeroCard member={presidentMember} />
              </div>
              <div
                className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5"
                style={legacyScale < 1 ? { gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "20px" } : undefined}
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
                      <button
                        type="button"
                        onClick={() => setVisibleCount((prev) => prev + 6)}
                        className="px-5 py-2 rounded-full border border-primary text-primary text-sm font-medium hover:bg-primary/10 transition-colors"
                      >
                        See More ({otherMembers.length - visibleCount} remaining)
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisibleCount(otherMembers.length)}
                        className="text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
                      >
                        See All
                      </button>
                    </>
                  )}
                  {visibleCount > 6 && (
                    <button
                      type="button"
                      onClick={() => setVisibleCount(6)}
                      className="px-5 py-2 rounded-full border border-muted-foreground/30 text-muted-foreground text-sm font-medium hover:bg-muted transition-colors"
                    >
                      Show Less
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CommitteeSection;
