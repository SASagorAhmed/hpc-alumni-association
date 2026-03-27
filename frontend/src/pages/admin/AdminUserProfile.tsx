import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "@/api-production/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getAuthToken } from "@/lib/authToken";
import { useAuth } from "@/contexts/AuthContext";
import { PRIMARY_ADMIN_EMAIL } from "@/constants/adminAccess";
import { ArrowLeft, Ban, CheckCircle2, Crown, ShieldCheck, ShieldOff, Trash2, XCircle } from "lucide-react";

type UserProfile = Record<string, unknown> & {
  id: string;
  name?: string | null;
  email?: string | null;
  email_verified?: boolean | null;
  photo?: string | null;
  verified?: boolean | null;
  approved?: boolean | null;
  blocked?: boolean | null;
  profile_pending?: boolean | null;
  profile_review_note?: string | null;
  is_admin?: boolean;
  directory_visible?: boolean | number | null;
};

const AdminUserProfile = () => {
  const auth = useAuth();
  const currentUser = auth.user;
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectMessage, setRejectMessage] = useState("");

  const token = getAuthToken();

  const fetchProfile = async () => {
    if (!id) return;
    setLoading(true);
    const res = await fetch(`${API_BASE_URL}/api/admin/users/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error((body as { error?: string } | null)?.error || "Failed to load profile");
      navigate("/admin/users");
      return;
    }
    setProfile(body as UserProfile);
    setRejectMessage(((body as UserProfile).profile_review_note as string) || "");
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const patchUser = async (updates: Record<string, unknown>, success: string) => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((body as { error?: string }).error || "Update failed");
        return;
      }
      toast.success(success);
      setProfile((prev) => (prev ? ({ ...prev, ...updates } as UserProfile) : prev));
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async () => {
    if (!id) return;
    if (!window.confirm("Delete this user permanently? User must register again.")) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((body as { error?: string }).error || "Delete failed");
        return;
      }
      toast.success("User deleted.");
      navigate("/admin/users");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return <div className="mx-auto max-w-5xl py-8 text-sm text-muted-foreground">Loading full profile...</div>;
  }

  const fields: Array<[string, unknown]> = [
    ["Name", profile.name],
    ["Email", profile.email],
    ["Phone", profile.phone],
    ["Batch", profile.batch],
    ["Department", profile.faculty],
    ["Section (A–J)", profile.department],
    ["Roll", profile.roll],
    ["Gender", profile.gender],
    ["Blood Group", profile.blood_group],
    ["Session", profile.session],
    ["Passing Year", profile.passing_year],
    ["College", profile.college_name],
    ["University", profile.university],
    ["Profession", profile.profession],
    ["Company", profile.company],
    ["Job Status", profile.job_status],
    ["Job Title", profile.job_title],
    ["Address", profile.address],
    ["Bio", profile.bio],
    ["Additional Info", profile.additional_info],
    ["Social Links", typeof profile.social_links === "string" ? profile.social_links : JSON.stringify(profile.social_links || "")],
  ];

  const isAdminAccount = Boolean(profile.is_admin);
  const profileEmail = String(profile.email || "")
    .trim()
    .toLowerCase();
  const isPrimaryTarget = profileEmail === PRIMARY_ADMIN_EMAIL;
  const isSecondaryAdmin = isAdminAccount && !isPrimaryTarget;
  const isPrimaryActor =
    String(currentUser?.email || "")
      .trim()
      .toLowerCase() === PRIMARY_ADMIN_EMAIL;
  const isViewingSelf = Boolean(currentUser?.id && profile.id === currentUser.id);
  const canModerateThisProfile = !isViewingSelf;
  const canDeleteUser =
    !isViewingSelf && (!isAdminAccount || (isSecondaryAdmin && isPrimaryActor));

  const directoryVisible = Number(profile.directory_visible ?? 1) !== 0;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link to="/admin/users">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Users
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          {isAdminAccount ? (
            <Badge variant="secondary" className="gap-1 border-amber-300/60 bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
              <Crown className="h-3.5 w-3.5" aria-hidden />
              Administrator
            </Badge>
          ) : null}
          {profile.profile_pending ? <Badge variant="outline">Pending Review</Badge> : null}
          {profile.email_verified ? (
            <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700">
              Email Verified
            </Badge>
          ) : (
            <Badge variant="secondary">Email Unverified</Badge>
          )}
          {profile.blocked ? (
            <Badge variant="destructive">Blocked</Badge>
          ) : profile.verified && profile.approved ? (
            <Badge>Admin Verified</Badge>
          ) : (
            <Badge variant="secondary">Admin Unverified</Badge>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Full Profile Review</CardTitle>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Alumni ID:</span>
            <Badge variant="secondary" className="font-mono text-xs">
              {String(profile.registration_number || "-")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="w-full max-w-[220px]">
              {profile.photo ? (
                <img src={String(profile.photo)} alt={String(profile.name || "Profile photo")} className="h-56 w-56 rounded-lg border object-cover" />
              ) : (
                <div className="flex h-56 w-56 items-center justify-center rounded-lg border bg-muted text-sm text-muted-foreground">No photo</div>
              )}
            </div>
            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
              {fields.map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs text-muted-foreground">{k}</p>
                  <p className="break-words text-sm font-medium">{String(v || "-")}</p>
                </div>
              ))}
            </div>
          </div>

          {profile.profile_review_note ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <p className="text-xs text-muted-foreground">Last reject message sent</p>
              <p className="mt-1">{String(profile.profile_review_note)}</p>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 rounded-lg border bg-muted/25 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 pr-2">
              <Label htmlFor="directory-visible" className="text-sm font-medium text-foreground">
                Show in alumni directory
              </Label>
              <p className="text-xs text-muted-foreground">
                New accounts are included automatically. Turn off to hide this profile from the public directory; you can turn it back on anytime.
              </p>
            </div>
            <Switch
              id="directory-visible"
              checked={directoryVisible}
              disabled={saving}
              onCheckedChange={(checked) =>
                patchUser(
                  { directory_visible: checked },
                  checked ? "Profile will appear in the alumni directory." : "Profile hidden from the alumni directory."
                )
              }
            />
          </div>

          <div className="flex flex-wrap gap-2 border-t pt-3">
            {isViewingSelf ? (
              <p className="w-full text-xs text-muted-foreground">
                You cannot verify, block, or delete your own account here (use another administrator). You can still change directory visibility above.
              </p>
            ) : null}
            {canModerateThisProfile && profile.profile_pending ? (
              <>
                <Button disabled={saving} onClick={() => patchUser({ profile_pending: false, approved: true, profile_review_note: null }, "Profile approved.")}>
                  <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
                </Button>
                <Button variant="outline" className="text-destructive" disabled={saving} onClick={() => setRejectOpen(true)}>
                  <XCircle className="mr-1 h-4 w-4" /> Reject With Message
                </Button>
              </>
            ) : null}
            {canModerateThisProfile ? (
              profile.verified && profile.approved ? (
                <Button variant="outline" disabled={saving} onClick={() => patchUser({ verified: false, approved: false }, "User unverified.")}>
                  <ShieldOff className="mr-1 h-4 w-4" /> Unverify
                </Button>
              ) : (
                <Button variant="outline" className="text-emerald-700" disabled={saving} onClick={() => patchUser({ verified: true, approved: true }, "User verified.")}>
                  <ShieldCheck className="mr-1 h-4 w-4" /> Verify
                </Button>
              )
            ) : null}
            {canModerateThisProfile ? (
              !profile.blocked ? (
                <Button variant="destructive" disabled={saving} onClick={() => patchUser({ blocked: true }, "User blocked.")}>
                  <Ban className="mr-1 h-4 w-4" /> Block
                </Button>
              ) : (
                <Button variant="outline" disabled={saving} onClick={() => patchUser({ blocked: false }, "User unblocked.")}>
                  <Ban className="mr-1 h-4 w-4" /> Unblock
                </Button>
              )
            ) : null}
            {canDeleteUser ? (
              <Button variant="destructive" disabled={saving} onClick={deleteUser}>
                <Trash2 className="mr-1 h-4 w-4" /> Delete User
              </Button>
            ) : isPrimaryTarget ? (
              <p className="w-full text-xs text-muted-foreground sm:w-auto sm:py-2">
                The primary administrator account cannot be deleted.
              </p>
            ) : isViewingSelf ? null : isAdminAccount ? (
              <p className="w-full text-xs text-muted-foreground sm:w-auto sm:py-2">
                Only the primary administrator can remove other administrator accounts.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject and Send Message</DialogTitle>
            <DialogDescription>Tell user what extra information to provide, then user can update profile and resubmit.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-note">Message</Label>
            <Textarea
              id="reject-note"
              name="admin-reject-message"
              autoComplete="off"
              rows={5}
              value={rejectMessage}
              onChange={(e) => setRejectMessage(e.target.value)}
              placeholder="Please add missing details..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={saving || !rejectMessage.trim()}
              onClick={async () => {
                await patchUser(
                  { profile_pending: false, approved: false, profile_review_note: rejectMessage.trim() },
                  "Profile rejected with message."
                );
                setRejectOpen(false);
              }}
            >
              Send Message
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUserProfile;
