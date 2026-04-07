import { useMemo, useState } from "react";
import { AlertTriangle, Download, Loader2, SearchCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/api-production/api.js";
import { getAuthToken } from "@/lib/authToken";
import { toast } from "sonner";

type AffectedProfile = {
  profile_id: string;
  name: string | null;
  alumni_id: string | null;
  broken_url: string;
  status: number;
  reason: string;
};

type AffectedCommitteeMember = {
  member_id: string;
  name: string | null;
  alumni_id: string | null;
  broken_url: string;
  status: number;
  reason: string;
};

type BrokenScanResponse = {
  ok: boolean;
  summary?: {
    broken_url_count: number;
    affected_profile_count: number;
    affected_committee_member_count: number;
  };
  affected_profiles?: AffectedProfile[];
  affected_committee_members?: AffectedCommitteeMember[];
};

function asCsvCell(value: string) {
  const v = value.replace(/"/g, '""');
  return `"${v}"`;
}

export default function BrokenPhotoScanCard({ compact = false }: { compact?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BrokenScanResponse | null>(null);

  const affectedProfiles = result?.affected_profiles ?? [];
  const affectedCommittee = result?.affected_committee_members ?? [];

  const allAlumniIds = useMemo(() => {
    const set = new Set<string>();
    for (const p of affectedProfiles) if (p.alumni_id) set.add(String(p.alumni_id).trim());
    for (const m of affectedCommittee) if (m.alumni_id) set.add(String(m.alumni_id).trim());
    return Array.from(set).filter(Boolean);
  }, [affectedProfiles, affectedCommittee]);

  const runScan = async () => {
    const token = getAuthToken();
    if (!token) {
      toast.error("Login required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/photos/broken?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await res.json().catch(() => ({}))) as BrokenScanResponse & { error?: string };
      if (!res.ok || !body?.ok) throw new Error(body?.error || "Failed to scan broken photos");
      setResult(body);
      toast.success("Broken photo scan completed");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to scan broken photos";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyAlumniIds = async () => {
    if (!allAlumniIds.length) return;
    const text = allAlumniIds.join(", ");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Affected Alumni IDs copied");
    } catch {
      toast.error("Could not copy Alumni IDs");
    }
  };

  const downloadCsv = () => {
    const rows: string[] = [];
    rows.push(
      [
        "source_type",
        "record_id",
        "name",
        "alumni_id",
        "broken_url",
        "status",
        "reason",
      ].join(",")
    );
    for (const p of affectedProfiles) {
      rows.push(
        [
          asCsvCell("profile"),
          asCsvCell(p.profile_id),
          asCsvCell(p.name || ""),
          asCsvCell(p.alumni_id || ""),
          asCsvCell(p.broken_url),
          asCsvCell(String(p.status ?? "")),
          asCsvCell(p.reason || ""),
        ].join(",")
      );
    }
    for (const m of affectedCommittee) {
      rows.push(
        [
          asCsvCell("committee_member"),
          asCsvCell(m.member_id),
          asCsvCell(m.name || ""),
          asCsvCell(m.alumni_id || ""),
          asCsvCell(m.broken_url),
          asCsvCell(String(m.status ?? "")),
          asCsvCell(m.reason || ""),
        ].join(",")
      );
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `broken-photos-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(href);
  };

  return (
    <Card>
      <CardHeader className={compact ? "pb-2" : undefined}>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Broken Photo Scan
        </CardTitle>
        <CardDescription>
          Find missing Cloudinary images (404) and list affected Alumni IDs from profile and committee records.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button onClick={runScan} size="sm" disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <SearchCheck className="w-4 h-4" />}
            {loading ? "Scanning..." : "Scan broken photos"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={copyAlumniIds}
            disabled={!allAlumniIds.length || loading}
          >
            Copy Alumni IDs
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadCsv}
            disabled={(!affectedProfiles.length && !affectedCommittee.length) || loading}
            className="gap-1.5"
          >
            <Download className="w-4 h-4" />
            Download CSV
          </Button>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {result ? (
          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs sm:text-sm space-y-1">
            <p>Broken URLs: {result.summary?.broken_url_count ?? 0}</p>
            <p>Affected profiles: {result.summary?.affected_profile_count ?? 0}</p>
            <p>Affected committee members: {result.summary?.affected_committee_member_count ?? 0}</p>
            <p>Affected Alumni IDs: {allAlumniIds.length}</p>
          </div>
        ) : null}

        {allAlumniIds.length ? (
          <div>
            <p className="text-xs font-medium text-foreground mb-1">Affected Alumni IDs</p>
            <div className="max-h-28 overflow-auto rounded-md border border-border bg-background px-2 py-1.5 text-xs text-muted-foreground">
              {allAlumniIds.join(", ")}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
