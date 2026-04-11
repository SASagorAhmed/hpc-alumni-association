import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { UserPlus, Eye, EyeOff, Facebook, Instagram, Linkedin, CheckCircle2, Copy } from "lucide-react";
import hpcLogo from "@/assets/hpc-logo.png";
import { ProfilePhotoCropDialog } from "@/components/auth/ProfilePhotoCropDialog";
import { API_BASE_URL } from "@/api-production/api.js";
import { buildPassingSessionOptions } from "@/lib/passingSessionOptions";
import { DateOfBirthPicker } from "@/components/ui/date-of-birth-picker";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
const FACULTY_OPTIONS = ["Science", "Arts", "Commerce"] as const;

const PASSING_SESSION_OPTIONS = buildPassingSessionOptions();
const COMMITTEE_MEMBER_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;
const REGISTER_SECTION_HEADING_CLASS = "mb-3 text-base font-bold uppercase tracking-wide text-primary";

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const googleError = searchParams.get("google_error");
  const googleDraft = searchParams.get("google_draft");
  const fromLogin = searchParams.get("from_login");
  const googlePrefill = searchParams.get("google_prefill");
  const fallbackPrefillEmail = String(searchParams.get("prefill_email") || "").trim();
  const fallbackPrefillName = String(searchParams.get("prefill_name") || "").trim();
  const rememberedGoogleEmail = String(sessionStorage.getItem("google_prefill_email") || "").trim();
  const rememberedGoogleName = String(sessionStorage.getItem("google_prefill_name") || "").trim();
  const [googleRegisterMode, setGoogleRegisterMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmImmutable, setConfirmImmutable] = useState(false);
  /** After successful submit, show Alumni ID before navigating away */
  const [alumniIdStep, setAlumniIdStep] = useState<null | { id: string; next: "login" | "verify" }>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const cropObjectUrlRef = useRef<string | null>(null);
  const [committeePostOptions, setCommitteePostOptions] = useState<Array<{ id: string; title: string }>>([]);
  const [committeePostLoading, setCommitteePostLoading] = useState(false);
  const [form, setForm] = useState({
    name: rememberedGoogleName,
    nickname: "",
    email: rememberedGoogleEmail,
    password: "",
    confirmPassword: "",
    phone: "",
    batch: "",
    passingSession: "",
    faculty: "",
    section: "",
    roll: "",
    gender: "",
    bloodGroup: "",
    university: "",
    universityShortName: "",
    company: "",
    committeeMember: "no" as "" | "yes" | "no",
    committeePost: "",
    profession: "",
    address: "",
    bio: "",
    additionalInfo: "",
    facebook: "",
    instagram: "",
    linkedin: "",
    birthday: "",
  });

  const SECTIONS = Array.from({ length: 10 }, (_, i) => {
    const v = String.fromCharCode(65 + i); // A..J
    return { value: v, label: v };
  });

  const batchOptions = Array.from({ length: 50 }, (_, i) => String(i + 1).padStart(2, "0"));

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
    if (!rememberedGoogleEmail && !rememberedGoogleName) return;
    setGoogleRegisterMode(true);
  }, [rememberedGoogleEmail, rememberedGoogleName]);

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
    const err = googleError;
    if (!err) return;
    const messages: Record<string, string> = {
      oauth: "Google sign-in was cancelled or failed. Try again, or register with email and password.",
      incomplete: "We could not read your email from Google. Try again or register with email.",
      server: "Registration is temporarily unavailable. Please try again later.",
      already_linked: "This Google account is already registered. Sign in with Google on the login page.",
      email_registered: "This email already has an account. Sign in, or use a different Google account.",
    };
    toast.error(messages[err] || "Google sign-up could not continue.");
    navigate("/register", { replace: true });
  }, [googleError, navigate]);

  useEffect(() => {
    let cancelled = false;
    const stripDraft = googleDraft === "1";
    const fromLoginFlag = fromLogin === "1";
    const hasGoogleHandoffIntent =
      stripDraft || fromLoginFlag || googlePrefill === "1" || Boolean(fallbackPrefillEmail || fallbackPrefillName);

    if (!hasGoogleHandoffIntent) {
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/google-register-handoff`, {
          method: "POST",
          credentials: "include",
        });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;

        const fetchedEmail = String(body?.email || "").trim();
        const fetchedName = String(body?.name || "").trim();
        const prefillEmail = fetchedEmail || fallbackPrefillEmail;
        const prefillName = fetchedName || fallbackPrefillName;
        if (!prefillEmail) return;
        setForm((f) => ({
          ...f,
          email: prefillEmail,
          name: prefillName || f.name,
          nickname: prefillName || f.nickname,
        }));
        try {
          sessionStorage.setItem("google_prefill_email", prefillEmail);
          sessionStorage.setItem("google_prefill_name", prefillName || "");
        } catch {
          // no-op
        }
        setGoogleRegisterMode(true);
        if (stripDraft) {
          if (fromLoginFlag) {
            toast.success(
              prefillName
                ? "Your Google email is new to this site. We prefilled your name and email. Complete the rest of the form and submit once."
                : "Your Google email is new to this site. Email is set from Google, but your name was not provided—please enter your full name manually, then complete the form."
            );
          } else {
            toast.success(
              prefillName
                ? "Google account connected. Your email and name were prefilled from Google; you can edit your name below."
                : "Google account connected. Your email is set from Google; please enter your full name manually."
            );
          }
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete("google_draft");
            url.searchParams.delete("google_prefill");
            url.searchParams.delete("prefill_email");
            url.searchParams.delete("prefill_name");
            url.searchParams.delete("from_login");
            window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
          } catch {
            // no-op
          }
        }
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, googleDraft, fromLogin, googlePrefill, fallbackPrefillEmail, fallbackPrefillName]);

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
    setPhotoFile(cropped);
    toast.success("Profile photo cropped and ready.");
    revokeCropPreview();
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.nickname.trim()) e.nickname = "Nickname is required";
    if (form.nickname.trim().length > 200) e.nickname = "Nickname is too long (max 200 characters)";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email";
    if (form.password.length < 6) e.password = "Password must be at least 6 characters";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
    if (!form.phone.trim() || !/^[\d+\-() ]{7,15}$/.test(form.phone)) e.phone = "Enter a valid phone number";
    if (!form.batch) e.batch = "Please select a batch";
    if (!form.passingSession) e.passingSession = "Please select session (passing year)";
    if (!form.faculty) e.faculty = "Please select department (Science, Arts, or Commerce)";
    if (!form.section) e.section = "Please select section (A..J)";
    if (!form.roll.trim()) e.roll = "Collage ID (Roll) is required";
    if (form.roll.trim() && !/^\d+$/.test(form.roll.trim())) e.roll = "Collage ID (Roll) must be digits only";
    if (form.roll.trim() && form.roll.trim().length > 20) e.roll = "Collage ID (Roll) is too long (max 20 digits)";
    if (!form.gender) e.gender = "Please select gender";
    if (form.gender === "Male" && !photoFile) e.photo = "Profile picture is required for Male";
    if (!form.university.trim()) e.university = "University is required";
    if (!form.universityShortName.trim()) e.universityShortName = "University short name is required";
    if (form.universityShortName.trim().length > 100) e.universityShortName = "University short name is too long (max 100 characters)";
    if (form.committeeMember === "yes" && !form.committeePost.trim()) e.committeePost = "Please select a committee post";
    if (!form.profession.trim()) e.profession = "Profession is required";
    if (!form.bloodGroup) e.bloodGroup = "Blood group is required";
    if (form.birthday.trim()) {
      const b = form.birthday.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(b)) {
        e.birthday = "Select a valid date";
      } else {
        const [y, mo, d] = b.split("-").map(Number);
        const dt = new Date(y, mo - 1, d);
        if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
          e.birthday = "Select a valid calendar date";
        } else {
          const t = new Date();
          const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
          if (dt > today) e.birthday = "Date of birth cannot be in the future";
          if (y < 1920) e.birthday = "Year must be 1920 or later";
        }
      }
    }
    const fb = form.facebook.trim();
    const ig = form.instagram.trim();
    const li = form.linkedin.trim();
    if (!fb && !ig && !li) {
      e.socialLinks = "Please provide at least one social profile link (Facebook, Instagram, or LinkedIn).";
    }
    if (!confirmImmutable) e.confirmImmutable = "Please confirm the information is locked after registration.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const result = await register({
      name: form.name,
      nickname: form.nickname.trim(),
      email: form.email,
      password: form.password,
      googleRegister: googleRegisterMode,
      phone: form.phone,
      batch: form.batch,
      passingSession: form.passingSession,
      section: form.section,
      faculty: form.faculty,
      roll: form.roll,
      gender: form.gender,
      photoFile: photoFile || undefined,
      bloodGroup: form.bloodGroup,
      university: form.university,
      universityShortName: form.universityShortName.trim(),
      company: form.company,
      profession: form.profession,
      committeeMember: form.committeeMember,
      committeePost: form.committeePost,
      address: form.address,
      bio: form.bio,
      additionalInfo: form.additionalInfo,
      facebook: form.facebook,
      instagram: form.instagram,
      linkedin: form.linkedin,
      birthday: form.birthday.trim(),
    });
    setLoading(false);
    if (result.success) {
      try {
        sessionStorage.removeItem("google_prefill_email");
        sessionStorage.removeItem("google_prefill_name");
      } catch {
        // no-op
      }
      const assignedId = result.alumniId?.trim();
      const verificationEmail = String(result.verifyEmail || form.email || "").trim().toLowerCase();
      if (assignedId) {
        const next = result.googleRegister || googleRegisterMode ? "login" : "verify";
        setAlumniIdStep({ id: assignedId, next });
        toast.success("You are registered. Save your Alumni ID below.");
        if (next === "verify" && verificationEmail) {
          sessionStorage.setItem("pending_verify_email", verificationEmail);
        }
      } else {
        toast.success(result.message);
        if (result.googleRegister || googleRegisterMode) {
          navigate("/login");
        } else {
          if (verificationEmail) {
            sessionStorage.setItem("pending_verify_email", verificationEmail);
          }
          const q = verificationEmail ? `?email=${encodeURIComponent(verificationEmail)}` : "";
          navigate(`/verify-otp${q}`, { state: { email: verificationEmail || undefined } });
        }
      }
    } else {
      toast.error(result.message);
    }
  };

  const continueAfterAlumniId = () => {
    if (!alumniIdStep) return;
    const { next } = alumniIdStep;
    setAlumniIdStep(null);
    if (next === "login") {
      navigate("/login");
      return;
    }
    const verificationEmail = String(form.email || "").trim().toLowerCase();
    const q = verificationEmail ? `?email=${encodeURIComponent(verificationEmail)}` : "";
    navigate(`/verify-otp${q}`, { state: { email: verificationEmail || undefined } });
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-4 py-10"
      style={{ background: "linear-gradient(135deg, #065F46, #059669, #064E3B)" }}
    >
      <div className="absolute top-4 left-4 z-10">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-amber-300 transition-colors">
          ← Back to Home
        </Link>
      </div>
      <div className="w-full max-w-3xl">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-3">
            <img src={hpcLogo} alt="HPC Logo" className="h-10 w-10" />
            <div className="leading-tight text-left">
              <span className="block text-[16px] font-bold text-white">Hamdard Public College</span>
              <span className="block text-amber-400 text-[13px] font-extrabold tracking-wider">ALUMNI ASSOCIATION</span>
            </div>
          </Link>
        </div>
        <Card className="shadow-card bg-card/95 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <UserPlus className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Register</CardTitle>
            <CardDescription>Create your alumni account and complete your profile in one step</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-md border border-border bg-muted/40 p-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Prefer Google? We only copy your <strong>email</strong> and <strong>name</strong> from Google—you must still complete this entire form
                  (same rules as manual registration) and click Register before an account exists. Choosing a password here is required. If you started
                  from Sign in with Google and were sent here, that is expected: new Google emails always finish on this page. The Google step expires in
                  about 30 minutes if you abandon it.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    const target = `${API_BASE_URL}/api/auth/google?register=1`;
                    window.location.href = target;
                  }}
                >
                  <GoogleMark className="w-5 h-5 mr-2" />
                  Continue with Google
                </Button>
              </div>
              {googleRegisterMode ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50/80 dark:bg-emerald-950/25 dark:border-emerald-800 px-3 py-2 text-sm text-emerald-950 dark:text-emerald-50/95">
                  <span className="font-medium">Google prefill:</span> Email is from your Google account and cannot be changed here; you may edit your
                  name. Fill every required field below—your account is created only when you submit this form successfully.
                </div>
              ) : null}
              <div>
                <h3 className={REGISTER_SECTION_HEADING_CLASS}>Account</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input id="name" placeholder="Your name" maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@mail.com"
                      maxLength={255}
                      autoComplete="email"
                      readOnly={googleRegisterMode}
                      aria-readonly={googleRegisterMode}
                      className={googleRegisterMode ? "bg-muted cursor-not-allowed opacity-90" : undefined}
                      value={form.email}
                      onChange={(e) => {
                        if (googleRegisterMode) return;
                        setForm({ ...form, email: e.target.value });
                      }}
                    />
                    {googleRegisterMode ? (
                      <p className="text-xs text-muted-foreground">From your Google account</p>
                    ) : null}
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="nickname">Nickname *</Label>
                    <Input
                      id="nickname"
                      maxLength={200}
                      placeholder="Shown only on your directory profile page"
                      value={form.nickname}
                      onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                      autoComplete="nickname"
                    />
                    {errors.nickname && <p className="text-xs text-destructive">{errors.nickname}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Input id="password" type={showPassword ? "text" : "password"} placeholder="At least 6 characters" maxLength={100} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input id="confirmPassword" type="password" placeholder="Re-enter password" maxLength={100} value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
                    {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input id="phone" placeholder="+880..." maxLength={15} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                  </div>
                </div>
              </div>

              <div>
                <h3 className={REGISTER_SECTION_HEADING_CLASS}>Academic identity (locked after register)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="batch">Batch (01..50) *</Label>
                    <Select value={form.batch} onValueChange={(v) => setForm({ ...form, batch: v })}>
                      <SelectTrigger id="batch">
                        <SelectValue placeholder="Select batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {batchOptions.map((b) => (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.batch && <p className="text-xs text-destructive">{errors.batch}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="passingSession">Session (passing year) *</Label>
                    <Select
                      value={form.passingSession}
                      onValueChange={(v) => setForm({ ...form, passingSession: v })}
                    >
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
                    <p className="text-xs text-muted-foreground">Academic session when you passed (HSC), e.g. 2020-2021.</p>
                    {errors.passingSession && <p className="text-xs text-destructive">{errors.passingSession}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="faculty">Department *</Label>
                    <Select value={form.faculty} onValueChange={(v) => setForm({ ...form, faculty: v })}>
                      <SelectTrigger id="faculty">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {FACULTY_OPTIONS.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.faculty && <p className="text-xs text-destructive">{errors.faculty}</p>}
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="section">Section (A..J) *</Label>
                    <Select value={form.section} onValueChange={(v) => setForm({ ...form, section: v })}>
                      <SelectTrigger id="section">
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        {SECTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.section && <p className="text-xs text-destructive">{errors.section}</p>}
                  </div>
                </div>
                <div className="mt-4 space-y-1.5">
                  <Label htmlFor="roll">Collage ID (Roll) *</Label>
                  <Input
                    id="roll"
                    inputMode="numeric"
                    placeholder="118849"
                    maxLength={20}
                    value={form.roll}
                    onChange={(e) => setForm({ ...form, roll: e.target.value.replace(/[^\d]/g, "") })}
                  />
                  {errors.roll && <p className="text-xs text-destructive">{errors.roll}</p>}
                </div>
              </div>

              <div>
                <h3 className={REGISTER_SECTION_HEADING_CLASS}>Profile & photo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="gender">Gender *</Label>
                    <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                      <SelectTrigger id="gender">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.gender && <p className="text-xs text-destructive">{errors.gender}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bloodGroup">Blood Group *</Label>
                    <Select value={form.bloodGroup} onValueChange={(v) => setForm({ ...form, bloodGroup: v })}>
                      <SelectTrigger id="bloodGroup">
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                      <SelectContent>
                        {BLOOD_GROUPS.map((b) => (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.bloodGroup && <p className="text-xs text-destructive">{errors.bloodGroup}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="birthday">Date of birth (optional)</Label>
                    <DateOfBirthPicker
                      id="birthday"
                      value={form.birthday}
                      onChange={(ymd) => setForm({ ...form, birthday: ymd })}
                      placeholder="Choose date of birth"
                    />
                    <p className="text-xs text-muted-foreground">You can add or change this later in your profile.</p>
                    {errors.birthday && <p className="text-xs text-destructive">{errors.birthday}</p>}
                  </div>
                </div>
                <div className="mt-4 space-y-1.5">
                  <Label htmlFor="photo">Profile Picture {form.gender === "Male" ? "*" : "(optional)"}</Label>
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoFileChosen}
                  />
                  {photoFile ? <p className="text-xs text-emerald-700">Selected: {photoFile.name}</p> : null}
                  {form.gender === "Male" ? (
                    <p className="text-xs text-amber-800">Male users must upload and crop a profile picture to register.</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Female users can register without a profile picture. If uploaded, cropping is required.</p>
                  )}
                  {errors.photo && <p className="text-xs text-destructive">{errors.photo}</p>}
                </div>
              </div>

              <div>
                <h3 className={REGISTER_SECTION_HEADING_CLASS}>Academic & professional</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="university">University (full name) *</Label>
                    <Input id="university" maxLength={150} placeholder="Your university" value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })} />
                    {errors.university && <p className="text-xs text-destructive">{errors.university}</p>}
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="universityShortName">University short name *</Label>
                    <Input
                      id="universityShortName"
                      maxLength={100}
                      placeholder="e.g. DU, BUET, NSU"
                      value={form.universityShortName}
                      onChange={(e) => setForm({ ...form, universityShortName: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Required abbreviation or short label. You can change this later in your profile.</p>
                    {errors.universityShortName && <p className="text-xs text-destructive">{errors.universityShortName}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="company">Company / Organization</Label>
                    <Input id="company" maxLength={100} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="committeeMember">Do you committee member? *</Label>
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
                    {errors.committeeMember && <p className="text-xs text-destructive">{errors.committeeMember}</p>}
                  </div>
                  {form.committeeMember === "yes" ? (
                    <div className="space-y-1.5">
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
                          {committeePostOptions.map((opt) => (
                            <SelectItem key={opt.id} value={opt.title}>
                              {opt.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.committeePost && <p className="text-xs text-destructive">{errors.committeePost}</p>}
                    </div>
                  ) : null}
                  <div className="space-y-1.5">
                    <Label htmlFor="profession">Profession / Industry *</Label>
                    <Input id="profession" placeholder="e.g. Teaching" maxLength={100} value={form.profession} onChange={(e) => setForm({ ...form, profession: e.target.value })} />
                    {errors.profession && <p className="text-xs text-destructive">{errors.profession}</p>}
                  </div>
                </div>
              </div>

              <div>
                <h3 className={REGISTER_SECTION_HEADING_CLASS}>Contact & more</h3>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" maxLength={200} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bio">Short Bio</Label>
                    <Textarea id="bio" maxLength={500} rows={3} placeholder="Tell us about yourself..." value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="additionalInfo">Additional Information</Label>
                    <Textarea id="additionalInfo" maxLength={1000} rows={3} placeholder="Higher studies, certifications, achievements..." value={form.additionalInfo} onChange={(e) => setForm({ ...form, additionalInfo: e.target.value })} />
                  </div>
                </div>
              </div>

              <div>
                <h3 className={REGISTER_SECTION_HEADING_CLASS}>Social links *</h3>
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 mb-3">
                  <p className="font-semibold">Required</p>
                  <p className="mt-1 text-amber-950/90">Provide at least one link among Facebook, Instagram, or LinkedIn.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="facebook" className="flex items-center gap-1.5">
                      <Facebook className="w-3.5 h-3.5" />
                      Facebook Profile URL
                    </Label>
                    <Input id="facebook" placeholder="https://facebook.com/yourprofile" maxLength={300} value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="instagram" className="flex items-center gap-1.5">
                      <Instagram className="w-3.5 h-3.5" />
                      Instagram Profile URL
                    </Label>
                    <Input id="instagram" placeholder="https://instagram.com/yourprofile" maxLength={300} value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="linkedin" className="flex items-center gap-1.5">
                      <Linkedin className="w-3.5 h-3.5" />
                      LinkedIn Profile URL
                    </Label>
                    <Input id="linkedin" placeholder="https://linkedin.com/in/yourprofile" maxLength={300} value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} />
                  </div>
                </div>
                {errors.socialLinks && <p className="text-xs text-destructive mt-2">{errors.socialLinks}</p>}
              </div>

              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
                <p className="font-semibold text-amber-900">Warning</p>
                <p className="mt-1 text-amber-900/90">
                  After you submit registration, <strong>Department</strong>, <strong>Section</strong>, <strong>Batch</strong>,{" "}
                  <strong>Collage ID (Roll)</strong>, and your <strong>Alumni ID</strong> are fixed. You can change your{" "}
                  <strong>session (passing year)</strong>, <strong>nickname</strong>, and <strong>university short name</strong> anytime on your
                  profile. Complete the rest of your profile now. Please check before you submit.
                </p>
                <label className="mt-3 flex items-start gap-2 text-amber-900/90 cursor-pointer">
                  <input type="checkbox" checked={confirmImmutable} onChange={(e) => setConfirmImmutable(e.target.checked)} className="mt-1" />
                  <span>I confirm the information is correct and locked.</span>
                </label>
                {errors.confirmImmutable && <p className="mt-2 text-xs text-destructive">{errors.confirmImmutable}</p>}
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full bg-gradient-hpc hover:opacity-90 text-primary-foreground font-semibold"
                disabled={loading || !confirmImmutable || (form.gender === "Male" && !photoFile)}
              >
                {loading ? "Please wait..." : "Register"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Login
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
      <ProfilePhotoCropDialog
        open={cropDialogOpen}
        imageSrc={cropImageSrc}
        onOpenChange={(open) => {
          setCropDialogOpen(open);
          if (!open) revokeCropPreview();
        }}
        onCropped={handleCroppedPhoto}
      />

      <Dialog
        open={!!alumniIdStep}
        onOpenChange={() => {
          /* Require explicit Continue — do not close on overlay or escape */
        }}
      >
        <DialogContent
          hideClose
          className="sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
              <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" aria-hidden />
            </div>
            <DialogTitle className="text-xl">You are registered</DialogTitle>
            <DialogDescription className="text-left">
              Your permanent Alumni ID is assigned from your section, batch, and collage roll. It cannot be changed later—save
              it somewhere safe. You will use it in the alumni directory and for official communications.
            </DialogDescription>
            <div className="space-y-3 pt-2">
              <div className="rounded-lg border border-primary/30 bg-muted/50 px-4 py-3 text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your Alumni ID is</p>
                <p
                  className="mt-1 break-all font-mono text-xl font-bold tracking-tight text-primary"
                  data-testid="registered-alumni-id"
                >
                  {alumniIdStep?.id}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={async () => {
                  if (!alumniIdStep?.id) return;
                  try {
                    await navigator.clipboard.writeText(alumniIdStep.id);
                    toast.success("Alumni ID copied");
                  } catch {
                    toast.error("Could not copy—select the ID and copy manually");
                  }
                }}
              >
                <Copy className="h-4 w-4" />
                Copy ID
              </Button>
            </div>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2 pt-2">
            <Button type="button" className="w-full sm:w-auto min-w-[200px]" onClick={continueAfterAlumniId}>
              {alumniIdStep?.next === "login" ? "Continue to sign in" : "Continue to email verification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Register;
