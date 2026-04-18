import { useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useParams, type Location } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Award, Briefcase, Crown, Droplets, Facebook, GraduationCap, Instagram, Linkedin, MapPin, Phone, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AlumniPhotoLightbox } from "@/components/alumni/AlumniPhotoLightbox";
import { cn } from "@/lib/utils";
import { displayCollegeNameOrNull } from "@/lib/collegeDisplay";
import {
  ALUMNI_DIRECTORY_STALE_MS,
  alumniDirectoryMemberQueryKey,
  alumniDirectoryQueryKey,
  fetchAlumniDirectoryMember,
} from "@/lib/publicDataQueries";
import { FullScreenRouteLayer } from "@/components/routing/FullScreenRouteLayer";
import { preserveTopNavbarForBackground } from "@/lib/fullScreenLayerPreserveNavbar";

interface AlumniProfile {
  id: string;
  name: string;
  nickname?: string | null;
  photo: string | null;
  batch: string | null;
  roll: string | null;
  gender: string | null;
  blood_group: string | null;
  department: string | null;
  faculty: string | null;
  university: string | null;
  university_short_name?: string | null;
  job_status: string | null;
  job_title: string | null;
  company: string | null;
  phone: string | null;
  address: string | null;
  bio: string | null;
  additional_info: string | null;
  profession: string | null;
  session: string | null;
  passing_year: string | null;
  college_name: string | null;
  registration_number: string | null;
  admin_committee_designation?: string | null;
  is_site_admin?: boolean | number | null;
  social_links: { facebook?: string; instagram?: string; linkedin?: string } | null;
}

type DirectoryLocationState = {
  backgroundLocation?: Location;
  /** Row from directory card — renders detail instantly before list query syncs. */
  directoryPreviewMember?: AlumniProfile;
};

const DirectoryProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state as DirectoryLocationState | null) ?? null;
  const backgroundLocation = navState?.backgroundLocation;
  const previewMember =
    id && navState?.directoryPreviewMember?.id === id ? navState.directoryPreviewMember : undefined;
  const isLayer = Boolean(backgroundLocation);
  const preserveTopNavbar = preserveTopNavbarForBackground(backgroundLocation);
  const wrapLayer = (inner: ReactNode) =>
    isLayer ? (
      <FullScreenRouteLayer preserveTopNavbar={preserveTopNavbar}>{inner}</FullScreenRouteLayer>
    ) : (
      inner
    );

  const [photoOpen, setPhotoOpen] = useState(false);
  const cacheList = queryClient.getQueryData(alumniDirectoryQueryKey) as AlumniProfile[] | undefined;

  const {
    data: memberRow,
    isPending: memberPending,
    isFetching: memberFetching,
  } = useQuery({
    queryKey: alumniDirectoryMemberQueryKey(id ?? ""),
    queryFn: () => fetchAlumniDirectoryMember(id ?? ""),
    enabled: Boolean(user && id),
    staleTime: ALUMNI_DIRECTORY_STALE_MS,
    gcTime: 1000 * 60 * 120,
    refetchOnMount: false,
    refetchOnReconnect: false,
    placeholderData: () =>
      (queryClient.getQueryData(alumniDirectoryQueryKey) as AlumniProfile[] | undefined)?.find(
        (r) => r.id === id
      ),
  });

  const listHit = useMemo(
    () => (id && cacheList ? cacheList.find((a) => a.id === id) ?? null : null),
    [id, cacheList]
  );

  const selected = useMemo((): AlumniProfile | null => {
    if (!id) return null;
    if (memberRow !== undefined && memberRow !== null) return memberRow as AlumniProfile;
    if (memberRow === null) return null;
    return (previewMember ?? listHit) ?? null;
  }, [id, memberRow, previewMember, listHit]);

  const showProfileSkeleton =
    memberRow === undefined &&
    (memberPending || memberFetching) &&
    !previewMember &&
    !listHit;

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/directory");
  };

  if (showProfileSkeleton) {
    return wrapLayer(
      <div className="mx-auto max-w-4xl space-y-4 px-2 sm:px-0">
        <div className="h-9 w-44 animate-pulse rounded-md bg-muted" />
        <Card className="alumni-directory-neon-card overflow-hidden transition-none">
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              <div className="h-44 w-44 shrink-0 animate-pulse rounded-2xl bg-muted sm:h-52 sm:w-52" />
              <div className="flex min-w-0 flex-1 flex-col items-center gap-3 sm:items-start sm:pt-1">
                <div className="h-9 w-full max-w-xs animate-pulse rounded-md bg-muted" />
                <div className="h-5 w-40 animate-pulse rounded-md bg-muted" />
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-[88%] animate-pulse rounded bg-muted" />
              <div className="h-4 w-[72%] animate-pulse rounded bg-muted" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selected) {
    return wrapLayer(
      <div className="mx-auto max-w-4xl space-y-4 px-2 py-10 text-center sm:px-0">
        <Button type="button" variant="outline" size="sm" className="mx-auto transition-none active:scale-100" onClick={handleBack}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Directory
        </Button>
        <p className="text-muted-foreground">Profile not found.</p>
      </div>
    );
  }

  const profilePage = (
    <div className="mx-auto max-w-4xl space-y-4 px-2 sm:px-0">
      <Button type="button" variant="outline" size="sm" className="transition-none active:scale-100" onClick={handleBack}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Directory
      </Button>

      <Card className="alumni-directory-neon-card overflow-hidden transition-none">
        <CardContent className="space-y-6 p-6 sm:p-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <button
              type="button"
              className={cn(
                "shrink-0 overflow-hidden rounded-2xl bg-primary/10 ring-2 ring-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "h-44 w-44 sm:h-52 sm:w-52",
                selected.photo ? "cursor-zoom-in shadow-md hover:ring-primary/45 hover:shadow-lg" : "cursor-default"
              )}
              onClick={() => selected.photo && setPhotoOpen(true)}
              aria-label={selected.photo ? `View full photo of ${selected.name}` : "No profile photo"}
              disabled={!selected.photo}
            >
              {selected.photo ? (
                <img
                  src={selected.photo}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <User className="h-20 w-20 text-primary sm:h-24 sm:w-24" aria-hidden />
                </div>
              )}
            </button>
            <div className="min-w-0 flex-1 text-center sm:pt-1 sm:text-left">
              <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl [overflow-wrap:anywhere]">
                {selected.name}
              </h1>
              <p className="mt-2 text-base text-muted-foreground">
                Batch: {selected.batch || "—"}
                {selected.roll ? ` · Roll: ${selected.roll}` : ""}
              </p>
              {selected.photo ? (
                <p className="mt-2 text-xs text-muted-foreground">Tap the photo to view it full size.</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            {Number(selected.is_site_admin) ? (
              <Badge className="max-w-full min-w-0 whitespace-normal bg-orange-600/95 py-1 text-white border-0 text-left">
                <Crown className="mr-1 h-3 w-3 shrink-0" />
                Site administrator
              </Badge>
            ) : null}
            {selected.admin_committee_designation ? (
              <Badge className="max-w-full min-w-0 whitespace-normal bg-amber-600/95 py-1 text-white border-0 text-left">
                <Award className="mr-1 h-3 w-3 shrink-0" />
                <span className="[overflow-wrap:anywhere]">{selected.admin_committee_designation}</span>
              </Badge>
            ) : null}
            {selected.blood_group ? (
              <Badge variant="outline" className="text-sm">
                <Droplets className="mr-1 h-3 w-3" />
                {selected.blood_group}
              </Badge>
            ) : null}
            {selected.university_short_name || selected.university ? (
              <Badge variant="secondary" className="max-w-full min-w-0 whitespace-normal py-1 text-sm font-normal text-left">
                <GraduationCap className="mr-1 mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="[overflow-wrap:anywhere]">
                  {String(selected.university_short_name || "").trim() || selected.university}
                </span>
              </Badge>
            ) : null}
            {(selected.profession?.trim() || selected.job_title?.trim()) ? (
              <Badge variant="outline" className="text-sm max-w-full min-w-0">
                <Briefcase className="mr-1 h-3 w-3 shrink-0" />
                <span className="[overflow-wrap:anywhere]">{selected.profession?.trim() || selected.job_title}</span>
              </Badge>
            ) : null}
          </div>

          <DetailSection title="Basic">
            {Number(selected.is_site_admin) ? (
              <DetailRow label="Role" value="Site administrator (dashboard access)" />
            ) : null}
            {selected.nickname?.trim() ? <DetailRow label="Nickname" value={selected.nickname.trim()} /> : null}
            <DetailRow label="Gender" value={selected.gender} />
            <DetailRow label="Blood Group" value={selected.blood_group} />
            <DetailRow label="Registration No." value={selected.registration_number} />
          </DetailSection>
          <DetailSection title="Academic">
            <DetailRow label="College" value={displayCollegeNameOrNull(selected.college_name)} />
            <DetailRow label="Department" value={selected.faculty} />
            <DetailRow label="Section (A–J)" value={selected.department} />
            <DetailRow label="Session" value={selected.session} />
            <DetailRow label="Passing Year" value={selected.passing_year} />
            <DetailRow label="University (short)" value={selected.university_short_name || null} />
            <DetailRow label="University (full)" value={selected.university} />
          </DetailSection>
          <DetailSection title="Professional">
            <DetailRow
              label="Profession"
              value={
                selected.profession?.trim() ||
                selected.job_title?.trim() ||
                null
              }
            />
            {selected.job_title?.trim() &&
            selected.profession?.trim() &&
            selected.job_title.trim() !== selected.profession.trim() ? (
              <DetailRow label="Job title" value={selected.job_title} />
            ) : null}
            <DetailRow label="Company" value={selected.company} />
          </DetailSection>
          <DetailSection title="Contact">
            <DetailRow label="Phone" value={selected.phone} icon={<Phone className="h-3.5 w-3.5" />} />
            <DetailRow label="Address" value={selected.address} icon={<MapPin className="h-3.5 w-3.5" />} />
          </DetailSection>
          <SocialIcons links={selected.social_links} />
          {(selected.bio || selected.additional_info) && (
            <DetailSection title="About">
              {selected.bio ? <p className="text-sm text-foreground">{selected.bio}</p> : null}
              {selected.additional_info ? (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Additional Information</p>
                  <p className="whitespace-pre-wrap text-sm text-foreground">{selected.additional_info}</p>
                </div>
              ) : null}
            </DetailSection>
          )}
        </CardContent>
      </Card>

      <AlumniPhotoLightbox
        open={photoOpen}
        onOpenChange={setPhotoOpen}
        src={selected.photo}
        name={selected.name}
      />
    </div>
  );

  return wrapLayer(profilePage);
};

const DetailSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h4 className="mb-2.5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
    <div className="space-y-2">{children}</div>
  </div>
);

const DetailRow = ({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-base leading-snug">
      {icon ? <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span> : null}
      <span className="min-w-[7.5rem] shrink-0 text-muted-foreground">{label}:</span>
      <span className="min-w-0 text-foreground [overflow-wrap:anywhere]">{value}</span>
    </div>
  );
};

const SocialIcons = ({ links }: { links?: { facebook?: string; instagram?: string; linkedin?: string } | null }) => {
  if (!links) return null;
  const hasAny = links.facebook || links.instagram || links.linkedin;
  if (!hasAny) return null;
  return (
    <div className="mt-1 flex items-center gap-3">
      {links.facebook ? <a href={links.facebook} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Facebook className="h-5 w-5" /></a> : null}
      {links.instagram ? <a href={links.instagram} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Instagram className="h-5 w-5" /></a> : null}
      {links.linkedin ? <a href={links.linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Linkedin className="h-5 w-5" /></a> : null}
    </div>
  );
};

export default DirectoryProfile;
