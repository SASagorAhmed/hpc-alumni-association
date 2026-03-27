import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { UserPlus, Eye, EyeOff, Facebook, Instagram, Linkedin } from "lucide-react";
import hpcLogo from "@/assets/hpc-logo.png";
import { ProfilePhotoCropDialog } from "@/components/auth/ProfilePhotoCropDialog";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const FACULTY_OPTIONS = ["Science", "Arts", "Commerce"] as const;

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmImmutable, setConfirmImmutable] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const cropObjectUrlRef = useRef<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    batch: "",
    faculty: "",
    section: "",
    roll: "",
    gender: "",
    bloodGroup: "",
    university: "",
    company: "",
    profession: "",
    address: "",
    bio: "",
    additionalInfo: "",
    facebook: "",
    instagram: "",
    linkedin: "",
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
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email";
    if (form.password.length < 6) e.password = "Password must be at least 6 characters";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
    if (!form.phone.trim() || !/^[\d+\-() ]{7,15}$/.test(form.phone)) e.phone = "Enter a valid phone number";
    if (!form.batch) e.batch = "Please select a batch";
    if (!form.faculty) e.faculty = "Please select department (Science, Arts, or Commerce)";
    if (!form.section) e.section = "Please select section (A..J)";
    if (!form.roll.trim()) e.roll = "Collage ID (Roll) is required";
    if (form.roll.trim() && !/^\d+$/.test(form.roll.trim())) e.roll = "Collage ID (Roll) must be digits only";
    if (form.roll.trim() && form.roll.trim().length > 20) e.roll = "Collage ID (Roll) is too long (max 20 digits)";
    if (!form.gender) e.gender = "Please select gender";
    if (form.gender === "Male" && !photoFile) e.photo = "Profile picture is required for Male";
    if (!form.university.trim()) e.university = "University is required";
    if (!form.profession.trim()) e.profession = "Profession is required";
    if (!form.bloodGroup) e.bloodGroup = "Blood group is required";
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
      email: form.email,
      password: form.password,
      phone: form.phone,
      batch: form.batch,
      section: form.section,
      faculty: form.faculty,
      roll: form.roll,
      gender: form.gender,
      photoFile: photoFile || undefined,
      bloodGroup: form.bloodGroup,
      university: form.university,
      company: form.company,
      profession: form.profession,
      address: form.address,
      bio: form.bio,
      additionalInfo: form.additionalInfo,
      facebook: form.facebook,
      instagram: form.instagram,
      linkedin: form.linkedin,
    });
    setLoading(false);
    if (result.success) {
      toast.success(result.message);
      navigate("/verify-otp");
    } else {
      toast.error(result.message);
    }
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
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Account</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input id="name" placeholder="Your name" maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" placeholder="example@mail.com" maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
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
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Academic identity (locked after register)</h3>
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
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Profile & photo</h3>
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
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Academic & professional</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="university">University *</Label>
                    <Input id="university" maxLength={150} placeholder="Your university" value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })} />
                    {errors.university && <p className="text-xs text-destructive">{errors.university}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="company">Company / Organization</Label>
                    <Input id="company" maxLength={100} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="profession">Profession / Industry *</Label>
                    <Input id="profession" placeholder="e.g. Teaching" maxLength={100} value={form.profession} onChange={(e) => setForm({ ...form, profession: e.target.value })} />
                    {errors.profession && <p className="text-xs text-destructive">{errors.profession}</p>}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contact & more</h3>
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
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Social links *</h3>
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
                  <strong>Collage ID (Roll)</strong>, and your <strong>Alumni ID</strong> are fixed and you cannot edit them later. Complete the
                  rest of your profile now. Please check before you submit.
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
    </div>
  );
};

export default Register;
