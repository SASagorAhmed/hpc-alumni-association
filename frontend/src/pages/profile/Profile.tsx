import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Save, User, AlertCircle, Facebook, Instagram, Linkedin, Award } from "lucide-react";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["Male", "Female", "Other"];
const FIXED_COLLEGE_NAME = "Hamdard Public Collage";

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    gender: user?.gender || "",
    bloodGroup: user?.bloodGroup || "",
    profession: user?.profession || "",
    company: user?.company || "",
    university: user?.university || "",
    address: user?.address || "",
    bio: user?.bio || "",
    additionalInfo: user?.additionalInfo || "",
    facebook: (user?.socialLinks as any)?.facebook || "",
    instagram: (user?.socialLinks as any)?.instagram || "",
    linkedin: (user?.socialLinks as any)?.linkedin || "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    setLoading(true);
    const { facebook, instagram, linkedin, ...rest } = form;
    const result = await updateProfile({
      ...rest,
      socialLinks: { facebook, instagram, linkedin },
    });
    setLoading(false);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-0">
      {user?.profilePending && (
        <div className="mb-6 flex items-start gap-2 p-3 rounded-md bg-accent/20 border border-accent text-sm text-accent-foreground">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>Your profile update is awaiting admin approval.</p>
        </div>
      )}

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
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg truncate">{user?.name}</CardTitle>
              <CardDescription className="text-xs sm:text-sm truncate">{user?.email} | Batch: {user?.batch}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input id="name" maxLength={100} value={form.name} onChange={(e) => set("name", e.target.value)} />
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
                  <Label htmlFor="alumniId">Alumni ID (auto)</Label>
                  <Input id="alumniId" maxLength={20} value={alumniIdValue || ""} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      {GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bloodGroup">Blood Group</Label>
                  <Select value={form.bloodGroup} onValueChange={(v) => set("bloodGroup", v)}>
                    <SelectTrigger><SelectValue placeholder="Select blood group" /></SelectTrigger>
                    <SelectContent>
                      {BLOOD_GROUPS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" maxLength={15} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Academic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="collegeName">College Name</Label>
                  <Input id="collegeName" maxLength={150} value={FIXED_COLLEGE_NAME} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="university">University</Label>
                  <Input id="university" maxLength={150} value={form.university} onChange={(e) => set("university", e.target.value)} />
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Professional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="company">Company / Organization</Label>
                  <Input id="company" maxLength={100} value={form.company} onChange={(e) => set("company", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profession">Profession / Industry</Label>
                  <Input id="profession" placeholder="e.g. Teaching" maxLength={100} value={form.profession} onChange={(e) => set("profession", e.target.value)} />
                </div>
              </div>
            </div>

            {/* Contact & Additional */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contact & Additional</h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" maxLength={200} value={form.address} onChange={(e) => set("address", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bio">Short Bio</Label>
                  <Textarea id="bio" maxLength={500} rows={3} placeholder="Tell us about yourself..." value={form.bio} onChange={(e) => set("bio", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="additionalInfo">Additional Information</Label>
                  <Textarea id="additionalInfo" maxLength={1000} rows={3} placeholder="Higher studies, certifications, achievements, interests..." value={form.additionalInfo} onChange={(e) => set("additionalInfo", e.target.value)} />
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Social Links</h3>
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
    </div>
  );
};

export default Profile;
