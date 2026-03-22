import { useState } from "react";
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
import { president as defaultPresident, officers as defaultOfficers, executives as defaultExecutives } from "@/data/members";
import { Skeleton } from "@/components/ui/skeleton";

const toDBMember = (
  m: {
    id: number;
    name: string;
    designation: string;
    batch: string;
    institution: string;
    jobStatus: string;
    about: string;
    location: string;
    expertise: string;
  },
  category: string,
  order: number
): DBMember => ({
  id: String(m.id),
  name: m.name,
  designation: m.designation,
  category,
  batch: m.batch,
  alumni_id: null,
  phone: null,
  email: null,
  institution: m.institution,
  profession: null,
  college_name: "Hamdard Public Collage",
  job_status: m.jobStatus,
  about: m.about,
  wishing_message: null,
  winner_about: null,
  location: m.location,
  expertise: m.expertise,
  facebook_url: null,
  instagram_url: null,
  linkedin_url: null,
  photo_url: null,
  display_order: order,
  is_active: true,
});

const CommitteeSection = ({ showAll = false }: { showAll?: boolean }) => {
  const [visibleCount, setVisibleCount] = useState(6);

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

  const { data: dbMembers } = useQuery({
    queryKey: ["committee-members-public-legacy"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/public/committee-members?active=true`);
      if (!res.ok) throw new Error("Failed to load committee");
      return res.json() as DBMember[];
    },
    // Prevent flicker: don't render legacy/default committee cards until structured
    // finished loading on refresh.
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

  const presidentMember =
    dbMembers?.find((m) => m.category === "president") ?? toDBMember(defaultPresident, "president", 1);
  const officerMembers =
    dbMembers?.filter((m) => m.category === "officer") ?? defaultOfficers.map((o, i) => toDBMember(o, "officer", i));
  const executiveMembers =
    dbMembers?.filter((m) => m.category === "executive") ?? defaultExecutives.map((e, i) => toDBMember(e, "executive", i));
  const otherMembers = [...officerMembers, ...executiveMembers];
  const displayCount = showAll ? otherMembers.length : visibleCount;

  return (
    <section id="committee" className="relative overflow-hidden border-t border-border/60 bg-background py-10 sm:py-16">
      <div className="layout-container relative">
        <AlumniExecutiveCommitteeIntro totalMembers={1 + otherMembers.length} />

        <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-6 sm:gap-8 lg:gap-10">
          <div className="mx-auto flex w-full min-w-0 justify-center px-0">
            <PresidentHeroCard member={presidentMember} />
          </div>
          <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5">
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
    </section>
  );
};

export default CommitteeSection;
