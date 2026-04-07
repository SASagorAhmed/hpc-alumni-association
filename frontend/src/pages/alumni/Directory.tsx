import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, User, X, Briefcase, GraduationCap, Phone, Droplets, Facebook, Instagram, Linkedin, Award, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "@/api-production/api.js";
import { useSyncedQueryState } from "@/hooks/useSyncedQueryState";
import { AlumniPhotoLightbox } from "@/components/alumni/AlumniPhotoLightbox";
import { saveNavScrollRestore } from "@/lib/navScrollRestore";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["Male", "Female", "Other"];
const FACULTY_OPTIONS = ["Science", "Arts", "Commerce"] as const;
const SORT_OPTIONS = [
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "batch_asc", label: "Batch (Oldest)" },
  { value: "batch_desc", label: "Batch (Newest)" },
  { value: "recent", label: "Recently Joined" },
] as const;
const SORT_VALUES = new Set<string>(SORT_OPTIONS.map((o) => o.value));

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
  email?: string;
  address: string | null;
  bio: string | null;
  additional_info: string | null;
  profession: string | null;
  session: string | null;
  passing_year: string | null;
  college_name: string | null;
  registration_number: string | null;
  admin_committee_designation?: string | null;
  /** Has dashboard admin role (user_roles.admin) */
  is_site_admin?: boolean | number | null;
  created_at: string | null;
  social_links: { facebook?: string; instagram?: string; linkedin?: string } | null;
}

const fetchAlumni = async (): Promise<AlumniProfile[]> => {
  const res = await fetch(`${API_BASE_URL}/api/public/directory/alumni`, { method: "GET" });
  if (!res.ok) throw new Error(`Failed to load directory (${res.status})`);
  const data = (await res.json()) as AlumniProfile[];
  return Array.isArray(data) ? data : [];
};

const DIRECTORY_FILTER_KEYS = ["q", "batch", "blood", "gender", "prof", "uni", "faculty", "sort"] as const;

const Directory = () => {
  const { user } = useAuth();
  const [, setSearchParams] = useSearchParams();
  const [photoLightbox, setPhotoLightbox] = useState<{ src: string; name: string } | null>(null);
  const [search, setSearch] = useSyncedQueryState("q", "");
  const [filterBatch, setFilterBatch] = useSyncedQueryState("batch", "");
  const [filterBlood, setFilterBlood] = useSyncedQueryState("blood", "");
  const [filterGender, setFilterGender] = useSyncedQueryState("gender", "");
  const [filterProfession, setFilterProfession] = useSyncedQueryState("prof", "");
  const [filterUniversity, setFilterUniversity] = useSyncedQueryState("uni", "");
  const [filterFaculty, setFilterFaculty] = useSyncedQueryState("faculty", "");
  const [sortParam, setSortParam] = useSyncedQueryState("sort", "name_asc");
  const sort = SORT_VALUES.has(sortParam) ? sortParam : "name_asc";

  const { data: alumni = [], isLoading } = useQuery({
    queryKey: ["alumni-directory"],
    queryFn: fetchAlumni,
    enabled: !!user?.verified,
  });

  // Derive unique filter options
  const batches = useMemo(() => [...new Set(alumni.map((a) => a.batch).filter(Boolean))].sort(), [alumni]);
  const universities = useMemo(() => {
    const set = new Set<string>();
    for (const a of alumni) {
      const u = String(a.university ?? "").trim();
      if (u) set.add(u);
    }
    return [...set].sort();
  }, [alumni]);
  const professions = useMemo(() => {
    const set = new Set<string>();
    for (const a of alumni) {
      const p = String(a.profession ?? "").trim();
      if (p) set.add(p);
    }
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [alumni]);

  const dropdownFilterCount = [
    filterBatch,
    filterBlood,
    filterGender,
    filterProfession,
    filterUniversity,
    filterFaculty,
  ].filter(Boolean).length;
  const activeFilterCount =
    dropdownFilterCount + (search.trim() ? 1 : 0) + (sort !== "name_asc" ? 1 : 0);

  const clearFilters = () => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        for (const k of DIRECTORY_FILTER_KEYS) n.delete(k);
        return n;
      },
      { replace: true }
    );
  };

  // Filter + search
  const filtered = useMemo(() => {
    let list = alumni;

    if (filterBatch) list = list.filter((a) => a.batch === filterBatch);
    if (filterBlood) list = list.filter((a) => a.blood_group === filterBlood);
    if (filterGender) list = list.filter((a) => a.gender === filterGender);
    if (filterProfession) {
      const p = filterProfession.trim();
      list = list.filter((a) => String(a.profession ?? "").trim() === p);
    }
    if (filterUniversity) list = list.filter((a) => a.university === filterUniversity);
    if (filterFaculty) {
      const f = filterFaculty.toLowerCase();
      list = list.filter((a) => String(a.faculty || "").trim().toLowerCase() === f);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) =>
        [
          a.name,
          a.nickname,
          a.batch,
          a.roll,
          a.phone,
          a.university,
          a.university_short_name,
          a.company,
          a.job_title,
          a.blood_group,
          a.gender,
          a.department,
          a.faculty,
          a.profession,
          a.job_status,
          a.college_name,
          a.admin_committee_designation,
        ]
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
  }, [alumni, search, filterBatch, filterBlood, filterGender, filterProfession, filterUniversity, filterFaculty, sort]);

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
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, batch, profession…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Filter panel */}
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Select value={filterFaculty || undefined} onValueChange={setFilterFaculty}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                {FACULTY_OPTIONS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterBatch || undefined} onValueChange={setFilterBatch}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Batch" /></SelectTrigger>
              <SelectContent>{batches.map((b) => <SelectItem key={b} value={b!}>{b}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filterBlood || undefined} onValueChange={setFilterBlood}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Blood Group" /></SelectTrigger>
              <SelectContent>{BLOOD_GROUPS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filterGender || undefined} onValueChange={setFilterGender}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Gender" /></SelectTrigger>
              <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filterProfession || undefined} onValueChange={setFilterProfession}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Profession" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {professions.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterUniversity || undefined} onValueChange={setFilterUniversity}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="University" /></SelectTrigger>
              <SelectContent>{universities.map((u) => <SelectItem key={u} value={u!}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sort + count bar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</p>
        <Select value={sort} onValueChange={setSortParam}>
          <SelectTrigger className="w-40 text-xs h-8"><SelectValue /></SelectTrigger>
          <SelectContent>{SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="hpc-ios-touch-text-root grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-4 h-40" /></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <User className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground font-medium">
              {search.trim() || dropdownFilterCount > 0 ? "No alumni found matching your search." : "No verified alumni available yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="hpc-ios-touch-text-root grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a) => (
            <Link
              key={a.id}
              to={`/directory/${a.id}`}
              className="h-full min-w-0"
              onClick={() => saveNavScrollRestore()}
            >
              <Card className="h-full min-w-0 hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="flex h-full min-h-[236px] min-w-0 flex-col p-4">
                <div className="flex min-w-0 items-start gap-4">
                  <button
                    type="button"
                    className="group/photo relative h-24 w-24 shrink-0 cursor-zoom-in overflow-hidden rounded-full bg-primary/10 ring-2 ring-primary/20 transition-[box-shadow,transform] hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-default sm:h-28 sm:w-28"
                    disabled={!a.photo}
                    aria-label={a.photo ? `View full photo of ${a.name}` : `No photo for ${a.name}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (a.photo) setPhotoLightbox({ src: a.photo, name: a.name });
                    }}
                  >
                    {a.photo ? (
                      <img
                        src={a.photo}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-200 group-hover/photo:scale-105"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center">
                        <User className="h-10 w-10 text-primary sm:h-12 sm:w-12" aria-hidden />
                      </span>
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-base text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors [overflow-wrap:anywhere]">
                      {a.name}
                    </h3>
                    <p className="min-w-0 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">Batch: {a.batch || "—"} {a.roll ? `| Roll: ${a.roll}` : ""}</p>
                  </div>
                </div>
                <div className="mt-3 flex min-h-[26px] min-w-0 flex-wrap gap-1.5">
                  {Number(a.is_site_admin) ? (
                    <Badge className="max-w-full min-w-0 truncate px-1.5 py-0 text-[10px] bg-violet-600/95 hover:bg-violet-600 text-white border-0">
                      <Crown className="w-2.5 h-2.5 mr-0.5 shrink-0" />
                      Administrator
                    </Badge>
                  ) : null}
                  {a.admin_committee_designation ? (
                    <Badge className="max-w-full min-w-0 truncate px-1.5 py-0 text-[10px] bg-amber-600/95 hover:bg-amber-600 text-white border-0">
                      <Award className="w-2.5 h-2.5 mr-0.5 shrink-0" />
                      <span className="truncate">{a.admin_committee_designation}</span>
                    </Badge>
                  ) : null}
                  {a.faculty && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{a.faculty}</Badge>}
                  {a.blood_group && <Badge variant="outline" className="text-[10px] px-1.5 py-0"><Droplets className="w-2.5 h-2.5 mr-0.5" />{a.blood_group}</Badge>}
                  {(a.university_short_name || a.university) && (
                    <Badge
                      variant="secondary"
                      className="max-w-full min-w-0 h-auto items-start gap-1 rounded-md px-1.5 py-1 text-[10px] font-normal whitespace-normal text-left"
                    >
                      <GraduationCap className="w-2.5 h-2.5 shrink-0 mt-0.5" aria-hidden />
                      <span className="min-w-0 break-words leading-snug [overflow-wrap:anywhere]">
                        {String(a.university_short_name || "").trim() || a.university}
                      </span>
                    </Badge>
                  )}
                  {(a.profession?.trim() || a.job_title?.trim()) ? (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 max-w-full min-w-0">
                      <Briefcase className="w-2.5 h-2.5 mr-0.5 shrink-0" />
                      <span className="truncate">{a.profession?.trim() || a.job_title}</span>
                    </Badge>
                  ) : null}
                </div>
                {(a.phone || a.company) && (
                  <div className="mt-2 min-h-[32px] min-w-0 space-y-0.5">
                    {a.phone && <p className="line-clamp-1 flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground"><Phone className="w-3 h-3 shrink-0" />{a.phone}</p>}
                    {a.company && <p className="line-clamp-1 flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground"><Briefcase className="w-3 h-3 shrink-0" />{a.company}</p>}
                  </div>
                )}
                <div className="mt-auto pt-2">
                  <SocialIcons links={a.social_links} size="sm" />
                </div>
              </CardContent>
            </Card>
            </Link>
          ))}
        </div>
      )}

      <AlumniPhotoLightbox
        open={!!photoLightbox}
        onOpenChange={(o) => {
          if (!o) setPhotoLightbox(null);
        }}
        src={photoLightbox?.src}
        name={photoLightbox?.name ?? ""}
      />
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
