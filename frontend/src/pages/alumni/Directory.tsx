import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, User, Filter, X, Briefcase, GraduationCap, Phone, Mail, MapPin, Droplets, ChevronDown, Facebook, Instagram, Linkedin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "@/api-production/api.js";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["Male", "Female", "Other"];
const JOB_STATUSES = ["Student", "Job Holder", "Business", "Freelancer", "Unemployed"];
const SORT_OPTIONS = [
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "batch_asc", label: "Batch (Oldest)" },
  { value: "batch_desc", label: "Batch (Newest)" },
  { value: "recent", label: "Recently Joined" },
];

interface AlumniProfile {
  id: string;
  name: string;
  photo: string | null;
  batch: string | null;
  roll: string | null;
  gender: string | null;
  blood_group: string | null;
  department: string | null;
  university: string | null;
  job_status: string | null;
  job_title: string | null;
  company: string | null;
  phone: string | null;
  email?: string;
  address: string | null;
  bio: string | null;
  additional_info: string | null;
  profession: string | null;
  session: string | null;
  passing_year: string | null;
  college_name: string | null;
  registration_number: string | null;
  created_at: string | null;
  social_links: { facebook?: string; instagram?: string; linkedin?: string } | null;
}

const fetchAlumni = async (): Promise<AlumniProfile[]> => {
  const res = await fetch(`${API_BASE_URL}/api/public/directory/alumni`, { method: "GET" });
  if (!res.ok) throw new Error(`Failed to load directory (${res.status})`);
  const data = (await res.json()) as AlumniProfile[];
  return Array.isArray(data) ? data : [];
};

const Directory = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterBatch, setFilterBatch] = useState("");
  const [filterBlood, setFilterBlood] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterJobStatus, setFilterJobStatus] = useState("");
  const [filterUniversity, setFilterUniversity] = useState("");
  const [sort, setSort] = useState("name_asc");
  const [selected, setSelected] = useState<AlumniProfile | null>(null);

  const { data: alumni = [], isLoading } = useQuery({
    queryKey: ["alumni-directory"],
    queryFn: fetchAlumni,
    enabled: !!user?.verified,
  });

  // Derive unique filter options
  const batches = useMemo(() => [...new Set(alumni.map((a) => a.batch).filter(Boolean))].sort(), [alumni]);
  const universities = useMemo(() => [...new Set(alumni.map((a) => a.university).filter(Boolean))].sort(), [alumni]);

  const activeFilterCount = [filterBatch, filterBlood, filterGender, filterJobStatus, filterUniversity].filter(Boolean).length;

  const clearFilters = () => {
    setFilterBatch("");
    setFilterBlood("");
    setFilterGender("");
    setFilterJobStatus("");
    setFilterUniversity("");
  };

  // Filter + search
  const filtered = useMemo(() => {
    let list = alumni;

    if (filterBatch) list = list.filter((a) => a.batch === filterBatch);
    if (filterBlood) list = list.filter((a) => a.blood_group === filterBlood);
    if (filterGender) list = list.filter((a) => a.gender === filterGender);
    if (filterJobStatus) list = list.filter((a) => a.job_status === filterJobStatus);
    if (filterUniversity) list = list.filter((a) => a.university === filterUniversity);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) =>
        [a.name, a.batch, a.roll, a.phone, a.university, a.company, a.job_title, a.blood_group, a.gender, a.department, a.profession, a.college_name]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(q))
      );
    }

    // Sort
    const sorted = [...list];
    switch (sort) {
      case "name_asc": sorted.sort((a, b) => (a.name || "").localeCompare(b.name || "")); break;
      case "name_desc": sorted.sort((a, b) => (b.name || "").localeCompare(a.name || "")); break;
      case "batch_asc": sorted.sort((a, b) => (a.batch || "").localeCompare(b.batch || "")); break;
      case "batch_desc": sorted.sort((a, b) => (b.batch || "").localeCompare(a.batch || "")); break;
      case "recent": sorted.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")); break;
    }
    return sorted;
  }, [alumni, search, filterBatch, filterBlood, filterGender, filterJobStatus, filterUniversity, sort]);

  // Unverified gate
  if (!user?.verified) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
          <User className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Verification Required</h2>
        <p className="text-muted-foreground">
          Your account is not verified yet. Once admin verifies your account, you will be able to access the Alumni Directory.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alumni Directory</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} verified alumni</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name, batch, roll..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="icon" className="relative shrink-0" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">{activeFilterCount}</span>
            )}
          </Button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Filters</h3>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
                  <X className="w-3 h-3 mr-1" /> Clear all
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Select value={filterBatch} onValueChange={setFilterBatch}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Batch" /></SelectTrigger>
                <SelectContent>{batches.map((b) => <SelectItem key={b} value={b!}>{b}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filterBlood} onValueChange={setFilterBlood}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Blood Group" /></SelectTrigger>
                <SelectContent>{BLOOD_GROUPS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filterGender} onValueChange={setFilterGender}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Gender" /></SelectTrigger>
                <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filterJobStatus} onValueChange={setFilterJobStatus}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Job Status" /></SelectTrigger>
                <SelectContent>{JOB_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filterUniversity} onValueChange={setFilterUniversity}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="University" /></SelectTrigger>
                <SelectContent>{universities.map((u) => <SelectItem key={u} value={u!}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sort + count bar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</p>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-40 text-xs h-8"><SelectValue /></SelectTrigger>
          <SelectContent>{SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-4 h-40" /></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <User className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground font-medium">
              {search || activeFilterCount > 0 ? "No alumni found matching your search." : "No verified alumni available yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a) => (
            <Card key={a.id} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setSelected(a)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {a.photo ? <img src={a.photo} alt={a.name} className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-primary" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">{a.name}</h3>
                    <p className="text-xs text-muted-foreground">Batch: {a.batch || "—"} {a.roll ? `| Roll: ${a.roll}` : ""}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {a.blood_group && <Badge variant="outline" className="text-[10px] px-1.5 py-0"><Droplets className="w-2.5 h-2.5 mr-0.5" />{a.blood_group}</Badge>}
                  {a.university && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 max-w-[120px] truncate"><GraduationCap className="w-2.5 h-2.5 mr-0.5 shrink-0" />{a.university}</Badge>}
                  {a.job_status && <Badge variant="outline" className="text-[10px] px-1.5 py-0"><Briefcase className="w-2.5 h-2.5 mr-0.5" />{a.job_status}</Badge>}
                </div>
                {(a.phone || a.company) && (
                  <div className="mt-2 space-y-0.5">
                    {a.phone && <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{a.phone}</p>}
                    {a.company && <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Briefcase className="w-3 h-3" />{a.company}</p>}
                  </div>
                )}
                <SocialIcons links={a.social_links} size="sm" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                    {selected.photo ? <img src={selected.photo} alt={selected.name} className="w-full h-full object-cover" /> : <User className="w-7 h-7 text-primary" />}
                  </div>
                  <div>
                    <DialogTitle className="text-lg">{selected.name}</DialogTitle>
                    <p className="text-sm text-muted-foreground">Batch: {selected.batch || "—"} {selected.roll ? `| Roll: ${selected.roll}` : ""}</p>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <DetailSection title="Basic">
                  <DetailRow label="Gender" value={selected.gender} />
                  <DetailRow label="Blood Group" value={selected.blood_group} />
                  <DetailRow label="Registration No." value={selected.registration_number} />
                </DetailSection>
                <DetailSection title="Academic">
                  <DetailRow label="College" value={selected.college_name} />
                  <DetailRow label="Department" value={selected.department} />
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
                  <DetailRow label="Phone" value={selected.phone} icon={<Phone className="w-3.5 h-3.5" />} />
                  <DetailRow label="Address" value={selected.address} icon={<MapPin className="w-3.5 h-3.5" />} />
                </DetailSection>
                <SocialIcons links={selected.social_links} size="lg" />
                {(selected.bio || selected.additional_info) && (
                  <DetailSection title="About">
                    {selected.bio && <p className="text-sm text-foreground">{selected.bio}</p>}
                    {selected.additional_info && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Additional Information</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{selected.additional_info}</p>
                      </div>
                    )}
                  </DetailSection>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DetailSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</h4>
    <div className="space-y-1.5">{children}</div>
  </div>
);

const DetailRow = ({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      {icon && <span className="mt-0.5 text-muted-foreground">{icon}</span>}
      <span className="text-muted-foreground min-w-[100px] shrink-0">{label}:</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
};

const SocialIcons = ({ links, size = "sm" }: { links?: { facebook?: string; instagram?: string; linkedin?: string } | null; size?: "sm" | "lg" }) => {
  if (!links) return null;
  const hasAny = links.facebook || links.instagram || links.linkedin;
  if (!hasAny) return null;
  const iconSize = size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5";
  const cls = size === "lg" ? "mt-1 flex items-center gap-3" : "mt-2 flex items-center gap-2";
  return (
    <div className={cls}>
      {links.facebook && (
        <a href={links.facebook} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-primary transition-colors">
          <Facebook className={iconSize} />
        </a>
      )}
      {links.instagram && (
        <a href={links.instagram} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-primary transition-colors">
          <Instagram className={iconSize} />
        </a>
      )}
      {links.linkedin && (
        <a href={links.linkedin} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-primary transition-colors">
          <Linkedin className={iconSize} />
        </a>
      )}
    </div>
  );
};

export default Directory;
