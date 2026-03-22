import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from "@/api-production/api.js";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Search, CheckCircle2, XCircle, Ban, ShieldCheck, ShieldOff, Eye,
  RefreshCw, Users, Clock, UserCheck, UserX, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

type ProfileRow = {
  id: string;
  name: string;
  phone: string | null;
  batch: string | null;
  department: string | null;
  profession: string | null;
  company: string | null;
  university: string | null;
  address: string | null;
  bio: string | null;
  photo: string | null;
  verified: boolean | null;
  approved: boolean | null;
  blocked: boolean | null;
  profile_pending: boolean | null;
  created_at: string | null;
};

type Filter = "all" | "pending" | "verified" | "unverified" | "blocked";

const AdminUsers = () => {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedUser, setSelectedUser] = useState<ProfileRow | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchProfiles = async () => {
    setLoading(true);
    const token = localStorage.getItem("hpc_auth_token");
    const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => []);
    if (!res.ok) {
      toast.error("Failed to load users");
    } else {
      setProfiles((data as ProfileRow[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchProfiles(); }, []);

  const filtered = useMemo(() => {
    let list = profiles;
    if (filter === "pending") list = list.filter((p) => p.profile_pending);
    else if (filter === "verified") list = list.filter((p) => p.verified && !p.blocked);
    else if (filter === "unverified") list = list.filter((p) => !p.verified && !p.blocked);
    else if (filter === "blocked") list = list.filter((p) => p.blocked);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
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
    verified: profiles.filter((p) => p.verified && !p.blocked).length,
    unverified: profiles.filter((p) => !p.verified && !p.blocked).length,
    blocked: profiles.filter((p) => p.blocked).length,
  }), [profiles]);

  const updateUser = async (id: string, updates: Record<string, unknown>, successMsg: string) => {
    setActionLoading(id);
    const token = localStorage.getItem("hpc_auth_token");
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
      if (selectedUser?.id === id) {
        setSelectedUser((prev) => prev ? { ...prev, ...updates } as ProfileRow : null);
      }
    }
    setActionLoading(null);
  };

  const approveProfile = (id: string) =>
    updateUser(id, { profile_pending: false, approved: true }, "Profile approved.");

  const rejectProfile = (id: string) =>
    updateUser(id, { profile_pending: false }, "Profile update rejected.");

  const verifyUser = (id: string) =>
    updateUser(id, { verified: true }, "User verified.");

  const unverifyUser = (id: string) =>
    updateUser(id, { verified: false }, "User unverified.");

  const blockUser = (id: string) =>
    updateUser(id, { blocked: true }, "User blocked.");

  const unblockUser = (id: string) =>
    updateUser(id, { blocked: false }, "User unblocked.");

  const filters: { key: Filter; label: string; icon: React.ElementType }[] = [
    { key: "all", label: "All", icon: Users },
    { key: "pending", label: "Pending", icon: Clock },
    { key: "verified", label: "Verified", icon: UserCheck },
    { key: "unverified", label: "Unverified", icon: UserX },
    { key: "blocked", label: "Blocked", icon: Ban },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
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
              placeholder="Search name, batch..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button size="icon" variant="outline" onClick={fetchProfiles} disabled={loading}>
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
            onClick={() => setFilter(key)}
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
                      <TableHead>Batch</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <button
                            onClick={() => setSelectedUser(p)}
                            className="text-left hover:underline font-medium text-foreground"
                          >
                            {p.name || "—"}
                          </button>
                          {p.phone && (
                            <p className="text-xs text-muted-foreground">{p.phone}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{p.batch || "—"}</TableCell>
                        <TableCell className="text-sm">{p.department || "—"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {p.profile_pending && (
                              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-[10px]">
                                <Clock className="w-3 h-3 mr-1" /> Pending
                              </Badge>
                            )}
                            {p.blocked ? (
                              <Badge variant="destructive" className="text-[10px]">Blocked</Badge>
                            ) : p.verified ? (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px]">Verified</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">Unverified</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {p.profile_pending && (
                              <>
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-emerald-600" onClick={() => approveProfile(p.id)} disabled={actionLoading === p.id}>
                                  <CheckCircle2 className="w-3 h-3" /> Approve
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive" onClick={() => rejectProfile(p.id)} disabled={actionLoading === p.id}>
                                  <XCircle className="w-3 h-3" /> Reject
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSelectedUser(p)}>
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-border">
                {filtered.map((p) => (
                  <div key={p.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <button
                          onClick={() => setSelectedUser(p)}
                          className="font-medium text-foreground text-sm hover:underline text-left"
                        >
                          {p.name || "—"}
                        </button>
                        <p className="text-xs text-muted-foreground">
                          {[p.batch, p.department].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {p.profile_pending && (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-[10px]">
                            Pending
                          </Badge>
                        )}
                        {p.blocked ? (
                          <Badge variant="destructive" className="text-[10px]">Blocked</Badge>
                        ) : p.verified ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px]">Verified</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Unverified</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.profile_pending && (
                        <>
                          <Button size="sm" className="h-7 text-xs gap-1 flex-1" onClick={() => approveProfile(p.id)} disabled={actionLoading === p.id}>
                            <CheckCircle2 className="w-3 h-3" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 flex-1 text-destructive" onClick={() => rejectProfile(p.id)} disabled={actionLoading === p.id}>
                            <XCircle className="w-3 h-3" /> Reject
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setSelectedUser(p)}>
                        <Eye className="w-3 h-3" /> View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* User detail dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg">{selectedUser.name || "User Details"}</DialogTitle>
                <DialogDescription>Manage this user's profile and status</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {selectedUser.profile_pending && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-sm text-amber-800">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>This user has a pending profile update awaiting your review.</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ["Name", selectedUser.name],
                    ["Phone", selectedUser.phone],
                    ["Batch", selectedUser.batch],
                    ["Department", selectedUser.department],
                    ["Profession", selectedUser.profession],
                    ["Company", selectedUser.company],
                    ["University", selectedUser.university],
                    ["Address", selectedUser.address],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <p className="text-muted-foreground text-xs">{label}</p>
                      <p className="font-medium text-foreground">{(value as string) || "—"}</p>
                    </div>
                  ))}
                </div>

                {selectedUser.bio && (
                  <div className="text-sm">
                    <p className="text-muted-foreground text-xs">Bio</p>
                    <p className="text-foreground">{selectedUser.bio}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  {selectedUser.profile_pending && (
                    <>
                      <Button size="sm" className="gap-1.5" onClick={() => approveProfile(selectedUser.id)} disabled={actionLoading === selectedUser.id}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve Profile
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5 text-destructive" onClick={() => rejectProfile(selectedUser.id)} disabled={actionLoading === selectedUser.id}>
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </Button>
                    </>
                  )}

                  {!selectedUser.verified ? (
                    <Button size="sm" variant="outline" className="gap-1.5 text-emerald-600" onClick={() => verifyUser(selectedUser.id)} disabled={actionLoading === selectedUser.id}>
                      <ShieldCheck className="w-3.5 h-3.5" /> Verify
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => unverifyUser(selectedUser.id)} disabled={actionLoading === selectedUser.id}>
                      <ShieldOff className="w-3.5 h-3.5" /> Unverify
                    </Button>
                  )}

                  {!selectedUser.blocked ? (
                    <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => blockUser(selectedUser.id)} disabled={actionLoading === selectedUser.id}>
                      <Ban className="w-3.5 h-3.5" /> Block
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => unblockUser(selectedUser.id)} disabled={actionLoading === selectedUser.id}>
                      <Ban className="w-3.5 h-3.5" /> Unblock
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
