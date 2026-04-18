import type { ReactNode } from "react";
import { useParams, useNavigate, useLocation, type Location } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, GraduationCap, Briefcase, BadgeCheck, Phone, Mail, Hash, Facebook, Instagram, Linkedin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getInitials } from "@/data/members";
import { displayCollegeName } from "@/lib/collegeDisplay";
import { fetchPublicMemberById, memberDetailQueryKey } from "@/lib/publicDataQueries";
import { FullScreenRouteLayer } from "@/components/routing/FullScreenRouteLayer";
import { preserveTopNavbarForBackground } from "@/lib/fullScreenLayerPreserveNavbar";
import { PublicMetaverseChrome } from "@/components/layout/PublicMetaverseChrome";

const MemberDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const backgroundLocation = (location.state as { backgroundLocation?: Location } | null)?.backgroundLocation;
  const isLayer = Boolean(backgroundLocation);
  const preserveTopNavbar = preserveTopNavbarForBackground(backgroundLocation);

  const handleBackToCommittee = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  const { data: member, isLoading } = useQuery({
    queryKey: memberDetailQueryKey(id ?? ""),
    queryFn: () => fetchPublicMemberById(id ?? ""),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    placeholderData: (previousData) => previousData,
  });

  if (isLoading) {
    const loadingPage = (
      <PublicMetaverseChrome showNavbar={!isLayer} showFooter={!isLayer} overlayMode={isLayer}>
        <div className="flex flex-1 items-center justify-center py-32">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </PublicMetaverseChrome>
    );
    if (isLayer) {
      return <FullScreenRouteLayer preserveTopNavbar={preserveTopNavbar}>{loadingPage}</FullScreenRouteLayer>;
    }
    return loadingPage;
  }

  if (!member) {
    const emptyPage = (
      <PublicMetaverseChrome showNavbar={!isLayer} showFooter={!isLayer} overlayMode={isLayer}>
        <div className="layout-container flex flex-col items-center justify-center py-32 text-center">
          <h1 className="text-2xl font-bold text-foreground">Member not found</h1>
          <button
            type="button"
            onClick={handleBackToCommittee}
            className="mt-4 inline-flex items-center gap-2 text-primary hover:underline"
          >
            <ArrowLeft size={16} /> Back to Committee
          </button>
        </div>
      </PublicMetaverseChrome>
    );
    if (isLayer) {
      return <FullScreenRouteLayer preserveTopNavbar={preserveTopNavbar}>{emptyPage}</FullScreenRouteLayer>;
    }
    return emptyPage;
  }

  const gmailHref = member.email
    ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(member.email)}`
    : null;

  const detailBody = (
    <div className="layout-container w-full min-w-0 pb-20">
      <button
        type="button"
        onClick={handleBackToCommittee}
        className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 backdrop-blur-sm transition-colors hover:bg-white/10"
      >
        <ArrowLeft size={16} /> Back to Committee
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xl"
      >
        <div className="flex flex-col items-center px-6 pb-8 pt-10 text-center sm:px-10">
          <div className="flex h-48 w-48 items-center justify-center overflow-hidden rounded-full bg-primary/20 text-5xl font-bold text-primary shadow-2xl ring-4 ring-background">
            {member.photo_url ? (
              <img src={member.photo_url} alt={member.name} className="h-full w-full object-cover" />
            ) : (
              getInitials(member.name)
            )}
          </div>
          <h1 className="mt-6 text-3xl font-bold text-foreground" style={{ fontFamily: "'Outfit', sans-serif" }}>
            {member.name}
          </h1>
          <p className="mt-1 text-lg font-semibold text-primary">{member.designation}</p>
        </div>

        <div className="border-t border-border bg-muted/30 px-6 py-8 sm:px-10">
          <div className="grid gap-6 sm:grid-cols-2">
            <InfoItem icon={<GraduationCap size={20} className="text-primary" />} label="Batch" value={member.batch ?? "N/A"} />
            <InfoItem icon={<Hash size={20} className="text-primary" />} label="Alumni ID" value={(member as { alumni_id?: string }).alumni_id ?? "N/A"} />
            <InfoItem icon={<BadgeCheck size={20} className="text-primary" />} label="University name" value={member.institution ?? "N/A"} />
            <InfoItem icon={<Briefcase size={20} className="text-primary" />} label="Profession" value={(member as { profession?: string }).profession ?? "N/A"} />
            <InfoItem icon={<Briefcase size={20} className="text-primary" />} label="Job Status" value={member.job_status ?? "N/A"} />
            <InfoItem icon={<GraduationCap size={20} className="text-primary" />} label="College name" value={displayCollegeName((member as { college_name?: string }).college_name)} />
            <InfoItem icon={<Phone size={20} className="text-primary" />} label="Phone" value={(member as { phone?: string }).phone ?? "N/A"} />
            <InfoItem
              icon={<Mail size={20} className="text-primary" />}
              label="Email"
              value={
                (member as { email?: string }).email && gmailHref ? (
                  <a href={gmailHref} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {(member as { email?: string }).email}
                  </a>
                ) : (
                  "N/A"
                )
              }
            />
          </div>
        </div>

        <div className="px-6 py-6 sm:px-10">
          <div className="flex items-center gap-4">
            {(member as { facebook_url?: string }).facebook_url ? (
              <a
                href={(member as { facebook_url?: string }).facebook_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-primary"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
            ) : null}
            {(member as { instagram_url?: string }).instagram_url ? (
              <a
                href={(member as { instagram_url?: string }).instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-primary"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
            ) : null}
            {(member as { linkedin_url?: string }).linkedin_url ? (
              <a
                href={(member as { linkedin_url?: string }).linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-primary"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
            ) : null}
          </div>
        </div>
      </motion.div>
    </div>
  );

  const page = (
    <PublicMetaverseChrome showNavbar={!isLayer} showFooter={!isLayer} overlayMode={isLayer}>
      {detailBody}
    </PublicMetaverseChrome>
  );

  if (isLayer) {
    return <FullScreenRouteLayer preserveTopNavbar={preserveTopNavbar}>{page}</FullScreenRouteLayer>;
  }

  return page;
};

const InfoItem = ({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) => (
  <div className="flex items-start gap-3">
    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">{icon}</div>
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-foreground/50">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  </div>
);

export default MemberDetail;
