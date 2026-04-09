import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Settings, Shield, UserPlus, Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/api-production/api.js";
import { getAuthToken } from "@/lib/authToken";
import { cachedJsonFetch, invalidateRequestCacheByPrefix } from "@/lib/requestCache";
import { toast } from "sonner";
import BrokenPhotoScanCard from "@/components/admin/BrokenPhotoScanCard";

type AdminRow = {
  id: string;
  email: string;
  name: string | null;
  email_verified?: boolean | number | null;
};

const comingSoonSections = [
  "Profile Edit Permission",
  "Directory Visibility Rules",
  "Default Post Names",
  "OTP Settings",
  "Election Settings",
  "Footer & Contact Settings",
];

const AdminSettings = () => {
  const qc = useQueryClient();
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [email, setEmail] = useState("");
  const [granting, setGranting] = useState(false);

  const loadAdmins = useCallback(async () => {
    setLoadingList(true);
    const token = getAuthToken();
    try {
      const body = await cachedJsonFetch<{ admins?: AdminRow[] }>({
        cacheKey: "admin:list:/api/admin/admins",
        url: `${API_BASE_URL}/api/admin/admins`,
        headers: { Authorization: `Bearer ${token}` },
        ttlMs: 45_000,
      });
      setAdmins(Array.isArray(body?.admins) ? body.admins : []);
    } catch {
      toast.error("Failed to load administrators");
      setAdmins([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadAdmins();
  }, [loadAdmins]);

  const grantAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      toast.error("Enter the alumni account email.");
      return;
    }
    const token = getAuthToken();
    setGranting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/admins/grant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: trimmed }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof body?.error === "string" ? body.error : "Could not grant admin access");
        return;
      }
      toast.success(typeof body?.message === "string" ? body.message : "Administrator access granted");
      setEmail("");
      invalidateRequestCacheByPrefix("admin:list:");
      await loadAdmins();
      qc.invalidateQueries({ queryKey: ["alumni-directory"] });
    } catch {
      toast.error("Network error");
    } finally {
      setGranting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          System configuration and preferences. To <strong className="font-medium text-foreground">add another administrator</strong>, use the
          form in <strong className="font-medium text-foreground">Administrators</strong> below (or the &quot;Add admin&quot; shortcut on the admin
          dashboard).
        </p>
      </div>

      <Card id="administrators" className="scroll-mt-24">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Administrators
          </CardTitle>
          <CardDescription>
            Grant panel access to an existing alumni account by email. They must already be registered with a profile.
            The user should log out and log in again to use admin features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={grantAdmin} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="space-y-1.5 flex-1">
              <Label htmlFor="admin-email">Alumni email</Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="off"
                placeholder="registered@example.com"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                disabled={granting}
              />
            </div>
            <Button type="submit" disabled={granting} className="shrink-0 bg-gradient-hpc hover:opacity-90 text-primary-foreground">
              {granting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Granting…
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Add admin
                </>
              )}
            </Button>
          </form>

          <div>
            <p className="text-sm font-medium text-foreground mb-2">Current administrators</p>
            {loadingList ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading…
              </p>
            ) : admins.length === 0 ? (
              <p className="text-sm text-muted-foreground">No administrators loaded.</p>
            ) : (
              <ul className="divide-y rounded-md border bg-muted/30">
                {admins.map((a) => (
                  <li key={a.id} className="px-3 py-2.5 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <span className="font-medium text-foreground">{a.name || "—"}</span>
                    <span className="text-muted-foreground">{a.email}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <BrokenPhotoScanCard />

      <div className="grid gap-4">
        {comingSoonSections.map((section) => (
          <Card key={section}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" /> {section}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Configuration coming soon</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminSettings;
