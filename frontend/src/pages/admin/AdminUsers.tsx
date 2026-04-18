import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { API_BASE_URL } from "@/api-production/api.js";
import { getAuthToken } from "@/lib/authToken";
import { cachedJsonFetch, invalidateRequestCacheByPrefix, primeJsonCache } from "@/lib/requestCache";
import { useAuth } from "@/contexts/AuthContext";
import { useSyncedQueryState } from "@/hooks/useSyncedQueryState";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Search, CheckCircle2, XCircle, Ban, ShieldCheck, ShieldOff, Eye, EyeOff,
  RefreshCw, Users, Clock, UserCheck, UserX, Crown, User,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
type ProfileRow = {
  id: string;
  email?: string | null;
  email_verified?: boolean | null;
  name: string;
  nickname?: string | null;
  phone: string | null;
  batch: string | null;
  roll?: string | null;
  registration_number?: string | null;
  gender?: string | null;
  blood_group?: string | null;
  department: string | null;
  session?: string | null;
  passing_year?: string | null;
  college_name?: string | null;
  profession: string | null;
  company: string | null;
  university: string | null;
  university_short_name?: string | null;
  address: string | null;
  bio: string | null;
  additional_info?: string | null;
  social_links?: Record<string, string> | string | null;
  photo: string | null;
  verified: boolean | null;
  approved: boolean | null;
  blocked: boolean | null;
  profile_pending: boolean | null;
  profile_review_note?: string | null;
  created_at: string | null;
  is_admin?: boolean;
  directory_visible?: boolean | number | null;
};

type Filter = "all" | "pending" | "verified" | "unverified" | "blocked";

const FILTER_VALUES: readonly Filter[] = ["all", "pending", "verified", "unverified", "blocked"];
const FILTER_SET = new Set<string>(FILTER_VALUES);
const PAGE_SIZE = 20;

const initialsFromName = (name: string | null | undefined) => {
  const safe = String(name || "").trim();
  if (!safe) return "A";
  const parts = safe.split(/\s+/).slice(0, 2);
  return parts
    .map((p) => p[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 2) || "A";
};

const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const myId = currentUser?.id;
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useSyncedQueryState("q", "");
  const [filterRaw, setFilterRaw] = useSyncedQueryState("f", "all");
  const [pageParam, setPageParam] = useSyncedQueryState("page", "1");
  const filter: Filter = FILTER_SET.has(filterRaw) ? (filterRaw as Filter) : "all";
  const page = Math.max(1, Number.parseInt(pageParam, 10) || 1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [authUnauthorized, setAuthUnauthorized] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<ProfileRow | null>(null);
  const [rejectMessage, setRejectMessage] = useState("");
  const token = getAuthToken();

  const prefetchUserDetail = (id: string) => {
    if (!id || !token || authUnauthorized) return;
    void primeJsonCache({
      cacheKey: `admin:user:${id}`,
      url: `${API_BASE_URL}/api/admin/users/${id}`,
      headers: { Authorization: `Bearer ${token}` },
      ttlMs: 30_000,
    });
  };

  const fetchProfiles = async (force = false) => {
    if (!token) {
      setLoading(false);
      setProfiles([]);
      setAuthUnauthorized(true);
      return;
    }
    setLoading(true);
    try {
      const data = await cachedJsonFetch<ProfileRow[]>({
        cacheKey: "admin:list:/api/admin/users",
        url: `${API_BASE_URL}/api/admin/users`,
        headers: { Authorization: `Bearer ${token}` },
        ttlMs: 45_000,
        force,
      });
      setProfiles(Array.isArray(data) ? data : []);
      setAuthUnauthorized(false);
    } catch (err) {
      const msg = String((err as Error)?.message || "");
      if (msg.includes("401")) {
        // Prevent repeated prefetch calls when session/token is unauthorized.
        setAuthUnauthorized(true);
      }
      toast.error("Failed to load users");
    }
    setLoading(false);
  };

  useEffect(() => { fetchProfiles(); }, []);

  const filtered = useMemo(() => {
    let list = profiles;
    if (filter === "pending") list = list.filter((p) => p.profile_pending);
    else if (filter === "verified") list = list.filter((p) => p.verified && p.approved && !p.blocked);
    else if (filter === "unverified") list = list.filter((p) => !(p.verified && p.approved) && !p.blocked);
    else if (filter === "blocked") list = list.filter((p) => p.blocked);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.nickname?.toLowerCase().includes(q) ||
          p.university_short_name?.toLowerCase().includes(q) ||
          p.batch?.toLowerCase().includes(q) ||
          p.department?.toLowerCase().includes(q) ||
          p.phone?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [profiles, filter, search]);

  const counts = useMemo(() => ({
    all: profiles.length,
    pending: profiles.filter((p) => p.profile_pending).length,
    verified: profiles.filter((p) => p.verified && p.approved && !p.blocked).length,
    unverified: profiles.filter((p) => !(p.verified && p.approved) && !p.blocked).length,
    blocked: profiles.filter((p) => p.blocked).length,
  }), [profiles]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const activePage = Math.min(page, totalPages);
  useEffect(() => {
    if (page !== activePage) setPageParam(String(activePage));
  }, [activePage, page, setPageParam]);
  const pagedUsers = useMemo(() => {
    const start = (activePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [activePage, filtered]);

  const updateUser = async (id: string, updates: Record<string, unknown>, successMsg: string) => {
    setActionLoading(id);
    const res = await fetch(`${API_BASE_URL}/api/admin/users/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body?.error || "Update failed");
    } else {
      toast.success(successMsg);
      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } as ProfileRow : p))
      );
      invalidateRequestCacheByPrefix("admin:list:");
      invalidateRequestCacheByPrefix(`admin:user:${id}`);
      void primeJsonCache<ProfileRow[]>({
        cacheKey: "admin:list:/api/admin/users",
        url: `${API_BASE_URL}/api/admin/users`,
        headers: { Authorization: `Bearer ${token}` },
        ttlMs: 45_000,
      });
    }
    setActionLoading(null);
  };

  const approveProfile = (id: string) =>
    updateUser(id, { profile_pending: false, approved: true, profile_review_note: null }, "Profile approved.");

  const rejectProfileWithMessage = (id: string, message: string) =>
    updateUser(
      id,
      {
        profile_pending: true,
        approved: false,
        verified: false,
        profile_review_note: message.trim(),
      },
      "Correction feedback sent to alumni."
    );

  const verifyUser = (id: string) =>
    updateUser(
      id,
      { verified: true, approved: true, profile_pending: false, profile_review_note: null },
      "User verified."
    );

  const unverifyUser = (id: string) =>
    updateUser(id, { verified: false, approved: false }, "User unverified.");

  const blockUser = (id: string) =>
    updateUser(id, { blocked: true }, "User blocked.");

  const unblockUser = (id: string) =>
    updateUser(id, { blocked: false }, "User unblocked.");

  const openRejectDialog = (p: ProfileRow) => {
    setRejectTarget(p);
    setRejectMessage(p.profile_review_note || "");
    setRejectDialogOpen(true);
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    if (!rejectMessage.trim()) {
      toast.error("Please write a message so user knows what to fix.");
      return;
    }
    await rejectProfileWithMessage(rejectTarget.id, rejectMessage);
    setRejectDialogOpen(false);
    setRejectTarget(null);
    setRejectMessage("");
  };

  const filters: { key: Filter; label: string; icon: React.ElementType }[] = [
    { key: "all", label: "All", icon: Users },
    { key: "pending", label: "Pending", icon: Clock },
    { key: "verified", label: "Verified", icon: UserCheck },
    { key: "unverified", label: "Unverified", icon: UserX },
    { key: "blocked", label: "Blocked", icon: Ban },
  ];

  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground">Approve, verify, or block users</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search name, batch, session..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button size="icon" variant="outline" onClick={() => fetchProfiles(true)} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            size="sm"
            variant={filter === key ? "default" : "outline"}
            onClick={() => setFilterRaw(key)}
            className="gap-1.5"
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">{label}</span>
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
              {counts[key]}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Table (desktop) / Cards (mobile) */}
      <Card>
        <CardContent className="p-0 sm:p-0">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Users className="w-8 h-8 mb-2" />
              <p className="text-sm">No users found</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedUsers.map((p) => {
                      const rowIsSelf = Boolean(myId && p.id === myId);
                      return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="flex items-center gap-3 min-w-0">
                            {p.photo ? (
                              <img
                                src={p.photo}
                                alt={p.name || "Profile photo"}
                                className="h-14 w-14 rounded-full border object-cover shrink-0"
                              />
                            ) : (
                              <div className="h-14 w-14 rounded-full border bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                                {p.name ? <span className="text-xs font-semibold">{initialsFromName(p.name)}</span> : <User className="w-5 h-5" />}
                              </div>
                            )}
                            {p.is_admin ? (
                              <span title="Administrator" className="shrink-0 text-amber-600 dark:text-amber-400">
                                <Crown className="w-4 h-4" aria-hidden />
                              </span>
                            ) : null}
                            <div className="min-w-0">
                              <Link
                                to={`/admin/users/${p.id}`}
                                onMouseEnter={() => prefetchUserDetail(p.id)}
                                onFocus={() => prefetchUserDetail(p.id)}
                                className="text-left font-medium text-foreground hover:underline truncate min-w-0 block"
                              >
                                {p.name || "—"}
                              </Link>
                              <p className="text-xs text-muted-foreground">Alumni ID: {p.registration_number || "—"}</p>
                              {p.phone && (
                                <p className="text-xs text-muted-foreground">{p.phone}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {p.profile_pending && (
                              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-[10px]">
                                <Clock className="w-3 h-3 mr-1" /> Pending
                              </Badge>
                            )}
                            {p.email_verified ? (
                              <Badge variant="outline" className="text-[10px] border-blue-300 bg-blue-50 text-blue-700">
                                Email Verified
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">
                                Email Unverified
                              </Badge>
                            )}
                            {p.blocked ? (
                              <Badge variant="destructive" className="text-[10px]">Blocked</Badge>
                            ) : p.verified && p.approved ? (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px]">Admin Verified</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">Admin Unverified</Badge>
                            )}
                            {Number(p.directory_visible ?? 1) === 0 ? (
                              <Badge variant="outline" className="text-[10px] border-muted-foreground/40 text-muted-foreground gap-0.5">
                                <EyeOff className="w-3 h-3" /> Directory hidden
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!rowIsSelf && p.profile_pending && (
                              <>
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-emerald-600" onClick={() => approveProfile(p.id)} disabled={actionLoading === p.id}>
                                  <CheckCircle2 className="w-3 h-3" /> Approve
                                </Button>
                              </>
                            )}
                            {!rowIsSelf && !(p.verified && p.approved) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 text-amber-700"
                                onClick={() => openRejectDialog(p)}
                                disabled={actionLoading === p.id}
                              >
                                <XCircle className="w-3 h-3" /> Correction
                              </Button>
                            )}
                            {!rowIsSelf && (
                              p.verified && p.approved ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => unverifyUser(p.id)}
                                  disabled={actionLoading === p.id}
                                >
                                  <ShieldOff className="w-3 h-3" /> Unverify
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs gap-1 text-emerald-700"
                                  onClick={() => verifyUser(p.id)}
                                  disabled={actionLoading === p.id}
                                >
                                  <ShieldCheck className="w-3 h-3" /> Verify
                                </Button>
                              )
                            )}
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" asChild>
                              <Link
                                to={`/admin/users/${p.id}`}
                                onMouseEnter={() => prefetchUserDetail(p.id)}
                                onFocus={() => prefetchUserDetail(p.id)}
                              >
                              <Eye className="w-3.5 h-3.5" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-border">
                {pagedUsers.map((p) => {
                  const rowIsSelf = Boolean(myId && p.id === myId);
                  return (
                  <div key={p.id} className="p-4 space-y-3 overflow-x-hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex items-start gap-3">
                        {p.photo ? (
                          <img
                            src={p.photo}
                            alt={p.name || "Profile photo"}
                            className="h-14 w-14 rounded-full border object-cover shrink-0"
                          />
                        ) : (
                          <div className="h-14 w-14 rounded-full border bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                            {p.name ? <span className="text-xs font-semibold">{initialsFromName(p.name)}</span> : <User className="w-5 h-5" />}
                          </div>
                        )}
                        {p.is_admin ? (
                          <span title="Administrator" className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5">
                            <Crown className="w-4 h-4" aria-hidden />
                          </span>
                        ) : null}
                        <div className="min-w-0">
                          <Link
                            to={`/admin/users/${p.id}`}
                            onMouseEnter={() => prefetchUserDetail(p.id)}
                            onFocus={() => prefetchUserDetail(p.id)}
                            className="font-medium text-foreground text-sm hover:underline text-left block"
                          >
                            {p.name || "—"}
                          </Link>
                          <p className="text-xs text-muted-foreground">Alumni ID: {p.registration_number || "—"}</p>
                          {p.phone ? <p className="text-xs text-muted-foreground">{p.phone}</p> : null}
                        </div>
                      </div>
                      <div className="max-w-[46%] flex flex-wrap justify-end gap-1.5">
                        {p.profile_pending && (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-[10px]">
                            Pending
                          </Badge>
                        )}
                        {p.email_verified ? (
                          <Badge variant="outline" className="text-[10px] border-blue-300 bg-blue-50 text-blue-700">
                            Email Verified
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            Email Unverified
                          </Badge>
                        )}
                        {p.blocked ? (
                          <Badge variant="destructive" className="text-[10px]">Blocked</Badge>
                        ) : p.verified && p.approved ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px]">Admin Verified</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Admin Unverified</Badge>
                        )}
                        {Number(p.directory_visible ?? 1) === 0 ? (
                          <Badge variant="outline" className="text-[10px] border-muted-foreground/40 text-muted-foreground gap-0.5">
                            <EyeOff className="w-3 h-3" /> Directory hidden
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {!rowIsSelf && p.profile_pending && (
                        <>
                          <Button
                            size="sm"
                            className="h-8 text-xs gap-1 min-w-[calc(50%-0.25rem)] flex-1 justify-center"
                            onClick={() => approveProfile(p.id)}
                            disabled={actionLoading === p.id}
                          >
                            <CheckCircle2 className="w-3 h-3" /> Approve
                          </Button>
                        </>
                      )}
                      {!rowIsSelf && !(p.verified && p.approved) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1 text-amber-700 min-w-[calc(50%-0.25rem)] flex-1 justify-center"
                          onClick={() => openRejectDialog(p)}
                          disabled={actionLoading === p.id}
                        >
                          <XCircle className="w-3 h-3" /> Correction
                        </Button>
                      )}
                      {!rowIsSelf && (
                        p.verified && p.approved ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1 min-w-[calc(50%-0.25rem)] flex-1 justify-center"
                          onClick={() => unverifyUser(p.id)}
                          disabled={actionLoading === p.id}
                        >
                          <ShieldOff className="w-3 h-3" /> Unverify
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1 text-emerald-700 min-w-[calc(50%-0.25rem)] flex-1 justify-center"
                          onClick={() => verifyUser(p.id)}
                          disabled={actionLoading === p.id}
                        >
                          <ShieldCheck className="w-3 h-3" /> Verify
                        </Button>
                      )
                      )}
                      <Button size="sm" variant="ghost" className="h-8 text-xs gap-1 min-w-[calc(50%-0.25rem)] flex-1 justify-center" asChild>
                        <Link
                          to={`/admin/users/${p.id}`}
                          onMouseEnter={() => prefetchUserDetail(p.id)}
                          onFocus={() => prefetchUserDetail(p.id)}
                        >
                        <Eye className="w-3 h-3" /> View
                        </Link>
                      </Button>
                    </div>
                  </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      {filtered.length > 0 && totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={activePage <= 1}
            onClick={() => setPageParam(String(activePage - 1))}
          >
            Prev
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {activePage} of {totalPages}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={activePage >= totalPages}
            onClick={() => setPageParam(String(activePage + 1))}
          >
            Next
          </Button>
        </div>
      ) : null}

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Correction Feedback</DialogTitle>
            <DialogDescription>
              Send one clear correction message before verification. The alumni will see this in their pending dashboard and can update profile data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-message">Correction message</Label>
            <Textarea
              id="reject-message"
              rows={5}
              value={rejectMessage}
              onChange={(e) => setRejectMessage(e.target.value)}
              placeholder="Example: Please add your university name, blood group, and complete address."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={submitReject}
              disabled={!rejectTarget || actionLoading === rejectTarget.id}
            >
              Send Correction
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
