import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Save, User, AlertCircle, Facebook, Instagram, Linkedin, Award, Camera, Crown } from "lucide-react";
import { AlumniPhotoLightbox } from "@/components/alumni/AlumniPhotoLightbox";
import { ProfilePhotoCropDialog } from "@/components/auth/ProfilePhotoCropDialog";
import { cn } from "@/lib/utils";
import { DateOfBirthPicker } from "@/components/ui/date-of-birth-picker";
import { buildPassingSessionOptions, isValidPassingSession } from "@/lib/passingSessionOptions";
import type { User } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/api-production/api.js";

const FIXED_COLLEGE_NAME = "Hamdard Public College";

const PASSING_SESSION_OPTIONS = buildPassingSessionOptions();
const COMMITTEE_MEMBER_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;
const PROFILE_SECTION_HEADING_CLASS = "mb-3 text-base font-bold uppercase tracking-wide text-primary";

function normalizeCommitteeMemberAnswer(value: unknown): "yes" | "no" {
  if (value === true || value === 1) return "yes";
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "1" || raw === "yes" || raw === "true") return "yes";
  return "no";
}

function deriveSessionFromUser(u: User | null | undefined): string {
  if (!u) return "";
  const s = String(u.session ?? "").trim();
  if (s) return s;
  const py = String(u.passingYear ?? "").trim();
  if (/^\d{4}$/.test(py)) {
    const y2 = Number(py);
    const y1 = y2 - 1;
    if (y1 >= 2005 && y1 <= 2050) return `${y1}-${y2}`;
  }
  return "";
}

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [photoLightboxOpen, setPhotoLightboxOpen] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const cropObjectUrlRef = useRef<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [committeePostOptions, setCommitteePostOptions] = useState<Array<{ id: string; title: string }>>([]);
  const [committeePostLoading, setCommitteePostLoading] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    nickname: user?.nickname ?? "",
    phone: user?.phone || "",
    session: deriveSessionFromUser(user),
    committeeMember: normalizeCommitteeMemberAnswer(user?.committeeMember) as "yes" | "no",
    committeePost: user?.committeePost ?? "",
    profession: user?.profession || "",
    company: user?.company || "",
    university: user?.university || "",
    universityShortName: user?.universityShortName ?? "",
    address: user?.address || "",
    bio: user?.bio || "",
    additionalInfo: user?.additionalInfo || "",
    facebook: (user?.socialLinks as any)?.facebook || "",
    instagram: (user?.socialLinks as any)?.instagram || "",
    linkedin: (user?.socialLinks as any)?.linkedin || "",
    birthday: user?.birthday ? String(user.birthday).slice(0, 10) : "",
  });

  const normalizeBatch2 = (b: unknown) => {
    const s = String(b ?? "").trim();
    if (!s) return "";
    if (/^\d+$/.test(s)) {
      const n = Number(s);
      if (Number.isFinite(n) && n >= 1 && n <= 50) return String(n).padStart(2, "0");
    }
    return s;
  };

  const sectionLetterRaw = String(user?.department ?? "").trim().charAt(0).toUpperCase();
  const sectionLetter = /^[A-J]$/.test(sectionLetterRaw) ? sectionLetterRaw : "";
  const batch2 = normalizeBatch2(user?.batch);
  const rollDigits = String(user?.roll ?? "").replace(/\D/g, "");
  const alumniIdComputed = sectionLetter && batch2 && rollDigits ? `${sectionLetter}${batch2}${rollDigits}` : "";
  const alumniIdValue = user?.registrationNumber || alumniIdComputed;

  const revokeCropPreview = () => {
    if (cropObjectUrlRef.current) {
      URL.revokeObjectURL(cropObjectUrlRef.current);
      cropObjectUrlRef.current = null;
    }
    setCropImageSrc(null);
  };

  useEffect(() => {
    return () => revokeCropPreview();
  }, []);

  useEffect(() => {
    if (!user) return;
    const nextSession = deriveSessionFromUser(user);
    const normalizedCommitteeMember = normalizeCommitteeMemberAnswer(user.committeeMember);
    setForm((prev) => ({
      ...prev,
      name: user.name || "",
      nickname: user.nickname ?? "",
      phone: user.phone || "",
      session: nextSession || prev.session,
      committeeMember: normalizedCommitteeMember,
      committeePost: normalizedCommitteeMember === "yes" ? (user.committeePost ?? "") : "",
      profession: user.profession || "",
      company: user.company || "",
      university: user.university || "",
      universityShortName: user.universityShortName ?? "",
      address: user.address || "",
      bio: user.bio || "",
      additionalInfo: user.additionalInfo || "",
      facebook: (user.socialLinks as Record<string, string>)?.facebook || "",
      instagram: (user.socialLinks as Record<string, string>)?.instagram || "",
      linkedin: (user.socialLinks as Record<string, string>)?.linkedin || "",
      birthday: user.birthday ? String(user.birthday).slice(0, 10) : "",
    }));
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setCommitteePostLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/public/committee/register-post-options`);
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        const list = Array.isArray(body?.options) ? body.options : [];
        const normalized = list
          .map((row: any) => ({
            id: String(row?.id || "").trim(),
            title: String(row?.title || "").trim(),
          }))
          .filter((row: { id: string; title: string }) => row.id && row.title);
        setCommitteePostOptions(normalized);
      } catch {
        if (!cancelled) setCommitteePostOptions([]);
      } finally {
        if (!cancelled) setCommitteePostLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!pendingPhotoFile) {
      setPendingPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingPhotoFile);
    setPendingPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingPhotoFile]);

  const displayPhotoUrl = pendingPreviewUrl ?? user?.photo?.trim() ?? null;
  const lightboxSrc = pendingPreviewUrl ?? user?.photo?.trim() ?? null;

  const handlePhotoFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Please select an image under 8MB.");
      return;
    }
    revokeCropPreview();
    const url = URL.createObjectURL(file);
    cropObjectUrlRef.current = url;
    setCropImageSrc(url);
    setCropDialogOpen(true);
  };

  const handleCroppedPhoto = async (blob: Blob) => {
    if (blob.size > 2 * 1024 * 1024) {
      toast.error("Cropped image is too large (max 2MB). Please zoom out and crop again.");
      return;
    }
    const cropped = new File([blob], "profile-photo.jpg", { type: "image/jpeg" });
    setPendingPhotoFile(cropped);
    toast.success("New profile photo will save when you update your profile.");
    revokeCropPreview();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (!form.universityShortName.trim()) {
      toast.error("University short name is required.");
      return;
    }
    if (form.universityShortName.trim().length > 100) {
      toast.error("University short name is too long (max 100 characters).");
      return;
    }
    if (form.nickname.trim().length > 200) {
      toast.error("Nickname is too long (max 200 characters).");
      return;
    }
    if (!isValidPassingSession(form.session)) {
      toast.error("Please select your session (passing year), e.g. 2020-2021.");
      return;
    }
    if (form.committeeMember === "yes" && !form.committeePost.trim()) {
      toast.error("Please select a committee post.");
      return;
    }
    if (form.birthday.trim()) {
      const b = form.birthday.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(b)) {
        toast.error("Please use a valid date of birth.");
        return;
      }
      const [y, mo, d] = b.split("-").map(Number);
      const dt = new Date(y, mo - 1, d);
      if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
        toast.error("That date of birth is not valid.");
        return;
      }
      const t = new Date();
      const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
      if (dt > today) {
        toast.error("Date of birth cannot be in the future.");
        return;
      }
      if (y < 1920) {
        toast.error("Year must be 1920 or later.");
        return;
      }
    }
    setLoading(true);
    const { facebook, instagram, linkedin, ...rest } = form;
    const result = await updateProfile({
      ...rest,
      nickname: form.nickname.trim() || null,
      committeeMember: form.committeeMember,
      committeePost: form.committeeMember === "yes" ? form.committeePost : null,
      socialLinks: { facebook, instagram, linkedin },
      photoFile: pendingPhotoFile || undefined,
    });
    setLoading(false);
    if (result.success) {
      setPendingPhotoFile(null);
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="mx-auto w-full max-w-screen-2xl">
      {user?.profilePending && (
        <div className="mb-6 flex items-start gap-2 rounded-md border border-accent bg-accent/20 p-3 text-sm text-accent-foreground">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Your profile is flagged for admin review. You can still update your details below; changes save right away.</p>
        </div>
      )}
      {user?.profilePending && user?.profileReviewNote ? (
        <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-center text-amber-900">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Correction feedback</p>
          <p className="mt-1.5 text-sm font-medium leading-relaxed">{user.profileReviewNote}</p>
          <p className="mt-1 text-xs text-amber-700/90">Please update your profile fields accordingly and save changes.</p>
        </div>
      ) : null}

      {user?.role === "admin" ? (
        <div className="mb-6 flex items-start gap-3 rounded-md border border-violet-200 bg-violet-50/90 px-3 py-3 text-sm text-violet-950 dark:border-violet-800 dark:bg-violet-950/35 dark:text-violet-50/95">
          <Crown className="w-5 h-5 shrink-0 text-violet-700 dark:text-violet-300" />
          <div>
            <p className="font-semibold text-violet-900 dark:text-violet-100">Site administrator</p>
            <p className="mt-1 text-violet-900/90 dark:text-violet-50/90">
              You can manage alumni content, users, and settings from the dashboard. This role is assigned by the core administrator.
            </p>
          </div>
        </div>
      ) : null}

      {user?.adminCommitteeDesignation ? (
        <div className="mb-6 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50/90 px-3 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-50/95">
          <Award className="w-5 h-5 shrink-0 text-amber-700 dark:text-amber-300" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-100">Committee designation</p>
            <p className="mt-1 text-amber-900/90 dark:text-amber-50/90">{user.adminCommitteeDesignation}</p>
            <p className="mt-1.5 text-xs text-amber-800/80 dark:text-amber-200/80">
              Assigned by the administration for the current committee term. This cannot be edited here.
            </p>
          </div>
        </div>
      ) : null}

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">{user?.name ?? ""}</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {user?.email} | Batch: {user?.batch}
            {user?.session || user?.passingYear ? ` | Session: ${user.session || user.passingYear}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              aria-hidden
              onChange={handlePhotoFileChosen}
            />
            <div>
              <h3 className={PROFILE_SECTION_HEADING_CLASS}>Profile photo</h3>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <button
                  type="button"
                  className={cn(
                    "shrink-0 overflow-hidden rounded-2xl bg-primary/10 ring-2 ring-primary/25 transition-[box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "h-56 w-56 sm:h-64 sm:w-64",
                    displayPhotoUrl
                      ? "cursor-zoom-in shadow-md hover:ring-primary/45 hover:shadow-lg"
                      : "cursor-default"
                  )}
                  onClick={() => displayPhotoUrl && setPhotoLightboxOpen(true)}
                  aria-label={displayPhotoUrl ? `View full photo of ${user?.name ?? "alumni"}` : "No profile photo"}
                  disabled={!displayPhotoUrl}
                >
                  {displayPhotoUrl ? (
                    <img src={displayPhotoUrl} alt="" className="h-full w-full object-cover" decoding="async" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <User className="h-24 w-24 text-primary sm:h-28 sm:w-28" aria-hidden />
                    </div>
                  )}
                </button>
                <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center sm:items-start sm:text-left sm:pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4" />
                    {displayPhotoUrl ? "Change photo" : "Upload photo"}
                  </Button>
                  {pendingPhotoFile ? (
                    <p className="text-xs text-amber-700 dark:text-amber-300">New photo selected — click &quot;Update Profile&quot; to save.</p>
                  ) : displayPhotoUrl ? (
                    <p className="text-xs text-muted-foreground">Tap the photo to view it full size.</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Add a square profile photo. It can appear in the alumni directory when your account is verified and visible there.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div>
              <h3 className={PROFILE_SECTION_HEADING_CLASS}>Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input id="name" maxLength={100} value={form.name} onChange={(e) => set("name", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nickname">Nickname</Label>
                  <Input
                    id="nickname"
                    maxLength={200}
                    placeholder="Optional; shown only on your directory profile page"
                    value={form.nickname}
                    onChange={(e) => set("nickname", e.target.value)}
                    autoComplete="nickname"
                  />
                  <p className="text-xs text-muted-foreground">
                    Lists and cards use your full name above. This nickname appears only on your public directory detail page.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="section">Section (locked)</Label>
                  <Input id="section" maxLength={2} value={sectionLetter || "—"} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="roll">Collage ID (Roll) (locked)</Label>
                  <Input id="roll" maxLength={30} value={user?.roll || ""} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="batch">Batch (locked)</Label>
                  <Input id="batch" maxLength={2} value={batch2 || "—"} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="passingSession">Session (passing year) *</Label>
                  <Select value={form.session ? form.session : undefined} onValueChange={(v) => set("session", v)}>
                    <SelectTrigger id="passingSession">
                      <SelectValue placeholder="e.g. 2020-2021" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {PASSING_SESSION_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">You can update this anytime. Same options as registration (2005-2006 … 2050-2051).</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="alumniId">Alumni ID (auto)</Label>
                  <Input id="alumniId" maxLength={20} value={alumniIdValue || ""} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gender">Gender (locked)</Label>
                  <Input id="gender" value={user?.gender || "—"} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bloodGroup">Blood group (locked)</Label>
                  <Input id="bloodGroup" value={user?.bloodGroup || "—"} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="birthday">Date of birth</Label>
                  <DateOfBirthPicker
                    id="birthday"
                    value={form.birthday}
                    onChange={(ymd) => set("birthday", ymd)}
                    placeholder="Choose date of birth"
                  />
                  <p className="text-xs text-muted-foreground">Optional. Visible to site administrators when reviewing your profile.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" maxLength={15} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div>
              <h3 className={PROFILE_SECTION_HEADING_CLASS}>Academic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="collegeName">College Name</Label>
                  <Input id="collegeName" maxLength={150} value={FIXED_COLLEGE_NAME} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="university">University (full name)</Label>
                  <Input id="university" maxLength={150} value={form.university} onChange={(e) => set("university", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="universityShortName">University short name *</Label>
                  <Input
                    id="universityShortName"
                    maxLength={100}
                    value={form.universityShortName}
                    onChange={(e) => set("universityShortName", e.target.value)}
                    placeholder="e.g. DU, BUET"
                  />
                  <p className="text-xs text-muted-foreground">Short label used in compact views. Required.</p>
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div>
              <h3 className={PROFILE_SECTION_HEADING_CLASS}>Professional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="company">Company / Organization</Label>
                  <Input id="company" maxLength={100} value={form.company} onChange={(e) => set("company", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profession">Profession / Industry</Label>
                  <Input id="profession" placeholder="e.g. Teaching" maxLength={100} value={form.profession} onChange={(e) => set("profession", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="committeeMember">Are you a committee member?</Label>
                  <Select
                    value={form.committeeMember}
                    onValueChange={(v: "yes" | "no") =>
                      setForm((f) => ({
                        ...f,
                        committeeMember: v,
                        committeePost: v === "yes" ? f.committeePost : "",
                      }))
                    }
                  >
                    <SelectTrigger id="committeeMember">
                      <SelectValue placeholder="Select yes or no" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMITTEE_MEMBER_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.committeeMember === "yes" ? (
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="committeePost">Committee Post *</Label>
                    <Select
                      value={form.committeePost}
                      onValueChange={(v) => setForm((f) => ({ ...f, committeePost: v }))}
                      disabled={committeePostLoading}
                    >
                      <SelectTrigger id="committeePost">
                        <SelectValue placeholder={committeePostLoading ? "Loading posts..." : "Select committee post"} />
                      </SelectTrigger>
                      <SelectContent>
                        {committeePostOptions.length > 0 ? (
                          committeePostOptions.map((opt) => (
                            <SelectItem key={opt.id} value={opt.title}>
                              {opt.title}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="__no_posts_available__" disabled>
                            No committee posts available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Contact & Additional */}
            <div>
              <h3 className={PROFILE_SECTION_HEADING_CLASS}>Contact & Additional</h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" maxLength={200} value={form.address} onChange={(e) => set("address", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bio">Short Bio</Label>
                  <Textarea id="bio" maxLength={500} rows={3} placeholder="Tell us about yourself..." value={form.bio} onChange={(e) => set("bio", e.target.value)} />
                  <p className="text-xs text-muted-foreground">
                    If you serve on the committee, this text is shown on your public committee profile as{" "}
                    <span className="font-medium text-foreground/80">About winner</span> (up to 250 words there).
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="additionalInfo">Additional Information</Label>
                  <Textarea id="additionalInfo" maxLength={1000} rows={3} placeholder="Higher studies, certifications, achievements, interests..." value={form.additionalInfo} onChange={(e) => set("additionalInfo", e.target.value)} />
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div>
              <h3 className={PROFILE_SECTION_HEADING_CLASS}>Social Links</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="facebook" className="flex items-center gap-1.5"><Facebook className="w-3.5 h-3.5" />Facebook Profile URL</Label>
                  <Input id="facebook" placeholder="https://facebook.com/yourprofile" maxLength={300} value={form.facebook} onChange={(e) => set("facebook", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="instagram" className="flex items-center gap-1.5"><Instagram className="w-3.5 h-3.5" />Instagram Profile URL</Label>
                  <Input id="instagram" placeholder="https://instagram.com/yourprofile" maxLength={300} value={form.instagram} onChange={(e) => set("instagram", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="linkedin" className="flex items-center gap-1.5"><Linkedin className="w-3.5 h-3.5" />LinkedIn Profile URL</Label>
                  <Input id="linkedin" placeholder="https://linkedin.com/in/yourprofile" maxLength={300} value={form.linkedin} onChange={(e) => set("linkedin", e.target.value)} />
                </div>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full bg-gradient-hpc hover:opacity-90 text-primary-foreground font-semibold" disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? "Saving..." : "Update Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AlumniPhotoLightbox
        open={photoLightboxOpen}
        onOpenChange={setPhotoLightboxOpen}
        src={lightboxSrc}
        name={user?.name ?? ""}
      />

      <ProfilePhotoCropDialog
        open={cropDialogOpen}
        imageSrc={cropImageSrc}
        onOpenChange={(open) => {
          setCropDialogOpen(open);
          if (!open) revokeCropPreview();
        }}
        onCropped={handleCroppedPhoto}
      />
    </div>
  );
};

export default Profile;
