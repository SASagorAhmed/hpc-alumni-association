import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Award, Briefcase, Droplets, Facebook, GraduationCap, Instagram, Linkedin, MapPin, Phone, User } from "lucide-react";
import { API_BASE_URL } from "@/api-production/api.js";

interface AlumniProfile {
  id: string;
  name: string;
  photo: string | null;
  batch: string | null;
  roll: string | null;
  gender: string | null;
  blood_group: string | null;
  department: string | null;
  faculty: string | null;
  university: string | null;
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
  social_links: { facebook?: string; instagram?: string; linkedin?: string } | null;
}

const fetchAlumni = async (): Promise<AlumniProfile[]> => {
  const res = await fetch(`${API_BASE_URL}/api/public/directory/alumni`, { method: "GET" });
  if (!res.ok) throw new Error(`Failed to load directory (${res.status})`);
  const data = (await res.json()) as AlumniProfile[];
  return Array.isArray(data) ? data : [];
};

const DirectoryProfile = () => {
  const { id } = useParams();
  const { data: alumni = [], isLoading } = useQuery({
    queryKey: ["alumni-directory"],
    queryFn: fetchAlumni,
  });

  const selected = useMemo(() => alumni.find((a) => a.id === id) || null, [alumni, id]);

  if (isLoading) return <div className="py-10 text-center text-muted-foreground">Loading profile...</div>;
  if (!selected) return <div className="py-10 text-center text-muted-foreground">Profile not found.</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Button asChild variant="outline" size="sm">
        <Link to="/directory">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Directory
        </Link>
      </Button>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-primary/10">
              {selected.photo ? (
                <img src={selected.photo} alt={selected.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <User className="h-7 w-7 text-primary" />
                </div>
              )}
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{selected.name}</h1>
              <p className="text-sm text-muted-foreground">
                Batch: {selected.batch || "-"} {selected.roll ? `| Roll: ${selected.roll}` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {selected.admin_committee_designation ? (
              <Badge className="bg-amber-600/95 text-white border-0">
                <Award className="mr-1 h-3 w-3" />
                {selected.admin_committee_designation}
              </Badge>
            ) : null}
            {selected.blood_group ? <Badge variant="outline"><Droplets className="mr-1 h-3 w-3" />{selected.blood_group}</Badge> : null}
            {selected.university ? <Badge variant="secondary"><GraduationCap className="mr-1 h-3 w-3" />{selected.university}</Badge> : null}
            {selected.job_status ? <Badge variant="outline"><Briefcase className="mr-1 h-3 w-3" />{selected.job_status}</Badge> : null}
          </div>

          <DetailSection title="Basic">
            <DetailRow label="Gender" value={selected.gender} />
            <DetailRow label="Blood Group" value={selected.blood_group} />
            <DetailRow label="Registration No." value={selected.registration_number} />
          </DetailSection>
          <DetailSection title="Academic">
            <DetailRow label="College" value={selected.college_name} />
            <DetailRow label="Department" value={selected.faculty} />
            <DetailRow label="Section (A–J)" value={selected.department} />
            <DetailRow label="Session" value={selected.session} />
            <DetailRow label="Passing Year" value={selected.passing_year} />
            <DetailRow label="University" value={selected.university} />
          </DetailSection>
          <DetailSection title="Professional">
            <DetailRow label="Job Status" value={selected.job_status} />
            <DetailRow label="Job Title" value={selected.job_title} />
            <DetailRow label="Company" value={selected.company} />
            <DetailRow label="Profession" value={selected.profession} />
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
    </div>
  );
};

const DetailSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
    <div className="space-y-1.5">{children}</div>
  </div>
);

const DetailRow = ({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      {icon ? <span className="mt-0.5 text-muted-foreground">{icon}</span> : null}
      <span className="min-w-[100px] shrink-0 text-muted-foreground">{label}:</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
};

const SocialIcons = ({ links }: { links?: { facebook?: string; instagram?: string; linkedin?: string } | null }) => {
  if (!links) return null;
  const hasAny = links.facebook || links.instagram || links.linkedin;
  if (!hasAny) return null;
  return (
    <div className="mt-1 flex items-center gap-3">
      {links.facebook ? <a href={links.facebook} target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-colors hover:text-primary"><Facebook className="h-5 w-5" /></a> : null}
      {links.instagram ? <a href={links.instagram} target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-colors hover:text-primary"><Instagram className="h-5 w-5" /></a> : null}
      {links.linkedin ? <a href={links.linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-colors hover:text-primary"><Linkedin className="h-5 w-5" /></a> : null}
    </div>
  );
};

export default DirectoryProfile;
