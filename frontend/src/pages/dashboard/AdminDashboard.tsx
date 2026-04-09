import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Vote, Award, CalendarDays, FileText, Bell, Shield, Settings, ClipboardList, UserCheck, Trophy, FolderOpen, ScrollText, UserPlus } from "lucide-react";
import { API_BASE_URL } from "@/api-production/api.js";
import { getAuthToken } from "@/lib/authToken";
import { cachedJsonFetch, invalidateRequestCacheByPrefix } from "@/lib/requestCache";
import BrokenPhotoScanCard from "@/components/admin/BrokenPhotoScanCard";

type AdminUserRow = {
  verified?: boolean | number;
  blocked?: boolean | number;
  profile_pending?: boolean | number;
};

type DashboardCounts = {
  totalUsers: number;
  verifiedUsers: number;
  pendingUsers: number;
  blockedUsers: number;
  activeEvents: number;
  donationCampaigns: number | null;
  achievements: number;
  memories: number;
  notices: number;
  elections: number;
  documents: number;
};

const initialCounts: DashboardCounts = {
  totalUsers: 0,
  verifiedUsers: 0,
  pendingUsers: 0,
  blockedUsers: 0,
  activeEvents: 0,
  donationCampaigns: null,
  achievements: 0,
  memories: 0,
  notices: 0,
  elections: 0,
  documents: 0,
};

function boolFlag(v: unknown) {
  return v === true || v === 1 || v === "1";
}

function isEventActive(row: Record<string, unknown>) {
  const status = String(row?.status || "").toLowerCase().trim();
  if (status === "active" || status === "ongoing" || status === "published") return true;
  const endDateRaw = String(row?.end_date || "").trim();
  if (endDateRaw) {
    const d = new Date(endDateRaw);
    if (!Number.isNaN(d.getTime())) return d.getTime() >= Date.now();
  }
  return false;
}

async function fetchAdminList<T = unknown>(path: string, token: string): Promise<T[]> {
  try {
    const body = await cachedJsonFetch<unknown>({
      cacheKey: `admin:list:${path}`,
      url: `${API_BASE_URL}${path}`,
      headers: { Authorization: `Bearer ${token}` },
      ttlMs: 45_000,
    });
    return Array.isArray(body) ? (body as T[]) : [];
  } catch {
    return [];
  }
}


const AdminDashboard = () => {
  const { user } = useAuth();
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [counts, setCounts] = useState<DashboardCounts>(initialCounts);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<null | {
    ok?: boolean;
    job_id?: string;
    dry_run?: boolean;
    referenced_count?: number;
    managed_count?: number;
    orphan_count?: number;
    deleted_count?: number;
    delete_error_count?: number;
    sample_orphans?: string[];
    orphans_flat?: Array<{
      module: string;
      folder: string;
      public_id: string;
      status?: string;
    }>;
    orphans_by_module?: Record<
      string,
      Array<{
        module: string;
        folder: string;
        public_id: string;
        status?: string;
      }>
    >;
    orphans_by_folder?: Record<
      string,
      Array<{
        module: string;
        folder: string;
        public_id: string;
        status?: string;
      }>
    >;
  }>(null);
  const [cleanupProgress, setCleanupProgress] = useState<{
    job_id?: string;
    mode?: string;
    status?: string;
    phase?: string;
    progress?: number;
    referenced_count?: number;
    managed_count?: number;
    orphan_count?: number;
    deleted_count?: number;
    delete_error_count?: number;
    current_chunk?: number;
    total_chunks?: number;
  } | null>(null);
  const [cleanupError, setCleanupError] = useState<string | null>(null);
  const cleanupEventSourceRef = useRef<EventSource | null>(null);

  const stats = [
    { label: "Total Users", value: String(counts.totalUsers), icon: Users, color: "bg-primary/10 text-primary" },
    { label: "Verified Users", value: String(counts.verifiedUsers), icon: UserCheck, color: "bg-primary/10 text-primary" },
    { label: "Pending Users", value: String(counts.pendingUsers), icon: ClipboardList, color: "bg-accent/20 text-accent-foreground" },
    { label: "Blocked Users", value: String(counts.blockedUsers), icon: Shield, color: "bg-destructive/10 text-destructive" },
    { label: "Active Events", value: String(counts.activeEvents), icon: CalendarDays, color: "bg-primary/10 text-primary" },
    { label: "Donation Campaigns", value: counts.donationCampaigns == null ? "N/A" : String(counts.donationCampaigns), icon: Bell, color: "bg-accent/20 text-accent-foreground" },
  ];

  const quickActions = [
    { label: "Add admin", href: "/admin/settings#administrators", icon: UserPlus },
    { label: "Add Notice", href: "/admin/notices", icon: FileText },
    { label: "Add Event", href: "/admin/events", icon: CalendarDays },
    { label: "Add Achievement", href: "/admin/achievements", icon: Award },
    { label: "Create Election", href: "/admin/elections", icon: Vote },
  ];

  const modules = [
    { icon: Users, label: "Users", href: "/admin/users", desc: `Manage all users (${counts.totalUsers})` },
    { icon: Shield, label: "Committee", href: "/admin/committee", desc: "Manage committee" },
    { icon: Vote, label: "Elections", href: "/admin/elections", desc: `Manage elections (${counts.elections})` },
    { icon: ClipboardList, label: "Candidates", href: "/admin/candidates", desc: "Manage candidates" },
    { icon: Trophy, label: "Winners", href: "/admin/winners", desc: "Publish winners" },
    { icon: Award, label: "Achievements", href: "/admin/achievements", desc: `Alumni achievements (${counts.achievements})` },
    { icon: CalendarDays, label: "Events", href: "/admin/events", desc: `Manage events (${counts.activeEvents} active)` },
    { icon: Bell, label: "Donations", href: "/admin/donations", desc: "Donation campaigns (coming soon)" },
    { icon: FileText, label: "Notices", href: "/admin/notices", desc: `Manage notices (${counts.notices})` },
    { icon: FolderOpen, label: "Documents", href: "/admin/documents", desc: `File management (${counts.documents})` },
    { icon: ScrollText, label: "Audit Logs", href: "/admin/audit-logs", desc: "Activity history" },
    { icon: Settings, label: "Settings", href: "/admin/settings#administrators", desc: "Add admins & system config" },
  ];

  useEffect(() => {
    return () => {
      cleanupEventSourceRef.current?.close();
      cleanupEventSourceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    let cancelled = false;
    const loadDashboardCounts = async () => {
      setDashboardLoading(true);
      setDashboardError(null);
      try {
        const [
          users,
          events,
          achievements,
          memories,
          notices,
          elections,
          documents,
        ] = await Promise.all([
          fetchAdminList<AdminUserRow>("/api/admin/users", token),
          fetchAdminList<Record<string, unknown>>("/api/admin/events", token),
          fetchAdminList<Record<string, unknown>>("/api/admin/achievements", token),
          fetchAdminList<Record<string, unknown>>("/api/admin/memories", token),
          fetchAdminList<Record<string, unknown>>("/api/admin/notices", token),
          fetchAdminList<Record<string, unknown>>("/api/admin/elections", token),
          fetchAdminList<Record<string, unknown>>("/api/admin/documents", token),
        ]);
        if (cancelled) return;
        const next: DashboardCounts = {
          totalUsers: users.length,
          verifiedUsers: users.filter((u) => boolFlag(u.verified)).length,
          pendingUsers: users.filter((u) => boolFlag(u.profile_pending)).length,
          blockedUsers: users.filter((u) => boolFlag(u.blocked)).length,
          activeEvents: events.filter((e) => isEventActive(e)).length,
          donationCampaigns: null,
          achievements: achievements.length,
          memories: memories.length,
          notices: notices.length,
          elections: elections.length,
          documents: documents.length,
        };
        setCounts(next);
      } catch (e) {
        if (cancelled) return;
        setDashboardError(e instanceof Error ? e.message : "Failed to load dashboard stats");
      } finally {
        if (!cancelled) setDashboardLoading(false);
      }
    };
    loadDashboardCounts();
    return () => {
      cancelled = true;
    };
  }, []);

  const runCloudinaryCleanup = async (apply: boolean) => {
    const token = getAuthToken();
    if (!token) {
      setCleanupError("Missing auth token. Please log in again.");
      return;
    }
    cleanupEventSourceRef.current?.close();
    cleanupEventSourceRef.current = null;
    setCleanupLoading(true);
    setCleanupError(null);
    setCleanupResult(null);
    setCleanupProgress({
      progress: 0,
      phase: "queued",
      status: "queued",
      mode: apply ? "delete" : "scan",
    });
    try {
      const startRes = await fetch(`${API_BASE_URL}/api/admin/cloudinary/cleanup-orphans/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ apply }),
      });
      const startBody = await startRes.json().catch(() => ({}));
      if (!startRes.ok) throw new Error((startBody && startBody.error) || "Cloud cleanup failed");
      const jobId = String(startBody?.job_id || "").trim();
      if (!jobId) throw new Error("Cleanup job did not return job_id");

      const streamUrl = `${API_BASE_URL}/api/admin/cloudinary/cleanup-orphans/stream/${encodeURIComponent(
        jobId
      )}?token=${encodeURIComponent(token)}`;
      const source = new EventSource(streamUrl);
      cleanupEventSourceRef.current = source;

      source.addEventListener("progress", (evt) => {
        try {
          const payload = JSON.parse((evt as MessageEvent).data || "{}");
          setCleanupProgress(payload);
        } catch (_e) {
          // ignore malformed progress frames
        }
      });

      source.addEventListener("result", (evt) => {
        try {
          const payload = JSON.parse((evt as MessageEvent).data || "{}");
          setCleanupResult(payload);
          invalidateRequestCacheByPrefix("admin:list:");
          setCleanupProgress((prev) => ({ ...(prev || {}), progress: 100, status: "completed" }));
        } catch (_e) {
          setCleanupError("Failed to parse cleanup result stream.");
        } finally {
          setCleanupLoading(false);
          source.close();
          cleanupEventSourceRef.current = null;
        }
      });

      source.addEventListener("error", (evt) => {
        try {
          const payload = JSON.parse((evt as MessageEvent).data || "{}");
          setCleanupError(payload?.error || "Cloud cleanup failed");
        } catch (_e) {
          setCleanupError("Cloud cleanup stream disconnected.");
        } finally {
          setCleanupLoading(false);
          source.close();
          cleanupEventSourceRef.current = null;
        }
      });
    } catch (e) {
      setCleanupError(e instanceof Error ? e.message : "Cloud cleanup failed");
      setCleanupLoading(false);
      cleanupEventSourceRef.current?.close();
      cleanupEventSourceRef.current = null;
    }
  };

  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-6">
        {/* Welcome + Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Welcome, Admin</h1>
            <p className="text-muted-foreground text-sm">Full system control and management</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickActions.map(({ label, href, icon: Icon }) => (
              <Link key={label} to={href}>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  <Icon className="w-3.5 h-3.5" /> {label}
                </Button>
              </Link>
            ))}
          </div>
        </div>

        {/* Stats */}
        {dashboardError ? (
          <p className="text-sm text-destructive">{dashboardError}</p>
        ) : null}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="p-4 text-center">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-foreground tabular-nums">{dashboardLoading ? "…" : value}</p>
                <p className="text-[11px] text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Management Modules */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Management Modules</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {modules.map(({ icon: Icon, label, href, desc }) => (
              <Link key={label} to={href}>
                <Card className="hover:shadow-card-hover transition-shadow h-full cursor-pointer">
                  <CardContent className="p-4">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-medium text-sm text-foreground">{label}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Cloud storage cleanup */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cloud Storage Cleanup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Use this tool to keep Cloudinary storage clean.{" "}
              <span className="font-medium text-foreground">Scan Orphans</span> only checks unused images safely.
              <span className="font-medium text-foreground"> Delete Orphans</span> removes images that are no longer linked
              in the database (old replaced/deleted photos).
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={cleanupLoading}
                onClick={() => runCloudinaryCleanup(false)}
              >
                {cleanupLoading ? "Scanning..." : "Scan Orphans"}
              </Button>
              <Button
                size="sm"
                disabled={cleanupLoading}
                onClick={() => runCloudinaryCleanup(true)}
              >
                {cleanupLoading ? "Deleting..." : "Delete Orphans"}
              </Button>
            </div>

            {cleanupProgress ? (
              <div className="rounded-md border border-border bg-card/70 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {cleanupProgress.mode === "delete" ? "Delete job" : "Scan job"} ·{" "}
                    {String(cleanupProgress.phase || "queued").replace(/_/g, " ")}
                  </p>
                  <p className="text-lg font-bold tabular-nums text-foreground">
                    {Math.max(0, Math.min(100, Number(cleanupProgress.progress || 0)))}%
                  </p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-[width] duration-300"
                    style={{
                      width: `${Math.max(0, Math.min(100, Number(cleanupProgress.progress || 0)))}%`,
                    }}
                  />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground sm:grid-cols-4">
                  <p>Referenced: {cleanupProgress.referenced_count ?? 0}</p>
                  <p>Managed: {cleanupProgress.managed_count ?? 0}</p>
                  <p>Orphans: {cleanupProgress.orphan_count ?? 0}</p>
                  <p>Deleted: {cleanupProgress.deleted_count ?? 0}</p>
                </div>
              </div>
            ) : null}

            {cleanupError ? (
              <p className="text-sm text-destructive">{cleanupError}</p>
            ) : null}

            {cleanupResult ? (
              <div className="space-y-3 rounded-md border border-border bg-muted/40 p-3 text-xs sm:text-sm">
                <p>
                  Mode: <span className="font-medium">{cleanupResult.dry_run ? "Dry run (safe scan)" : "Delete mode"}</span>
                </p>
                <p>Referenced in DB: {cleanupResult.referenced_count ?? 0}</p>
                <p>Managed in Cloudinary: {cleanupResult.managed_count ?? 0}</p>
                <p>Orphans found: {cleanupResult.orphan_count ?? 0}</p>
                <p>Deleted: {cleanupResult.deleted_count ?? 0}</p>
                <p>Delete errors: {cleanupResult.delete_error_count ?? 0}</p>

                {cleanupResult.orphans_by_module ? (
                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">Orphan image details (module + folder)</p>
                    <div className="grid gap-2">
                      {Object.entries(cleanupResult.orphans_by_module)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([moduleName, entries]) => (
                          <div key={moduleName} className="rounded-md border border-border/70 bg-background/70 p-2">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
                              {moduleName} ({entries.length})
                            </p>
                            <div className="max-h-44 space-y-1 overflow-auto text-[11px]">
                              {entries.map((entry, idx) => (
                                <div key={`${entry.public_id}-${idx}`} className="rounded border border-border/50 bg-card/80 px-2 py-1">
                                  <p className="font-medium text-foreground">{entry.public_id}</p>
                                  <p className="text-muted-foreground">Folder: {entry.folder}</p>
                                  <p className="text-muted-foreground">
                                    Status: {entry.status || (cleanupResult.dry_run ? "will_delete" : "unknown")}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <BrokenPhotoScanCard compact />
    </div>
  );
};

export default AdminDashboard;
