import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export type NoticeEmailFilters = {
  include_admins: boolean;
  send_mode: "individual" | "cc" | "bcc";
  batch: string;
  blood_group: string;
  profession: string;
  gender: string;
  university: string;
  department: string;
};

type Props = {
  value: NoticeEmailFilters;
  onChange: (next: NoticeEmailFilters) => void;
  onPreview: () => void;
  previewLoading?: boolean;
  options?: {
    batch: string[];
    blood_group: string[];
    profession: string[];
    gender: string[];
    university: string[];
    department: string[];
  } | null;
  summary?: {
    total_selected: number;
    total_eligible_verified: number;
    excluded_unverified: number;
    excluded_missing_email: number;
    sendable_now?: number;
    queued_for_next_day?: number;
  } | null;
};

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDER_OPTIONS = ["male", "female", "other"];
const ALL_OPTION = "__all__";

function splitCsv(value: string) {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function toFilterPayload(v: NoticeEmailFilters) {
  return {
    include_admins: v.include_admins,
    send_mode: v.send_mode,
    batch: splitCsv(v.batch),
    blood_group: splitCsv(v.blood_group),
    profession: splitCsv(v.profession),
    gender: splitCsv(v.gender),
    university: splitCsv(v.university),
    department: splitCsv(v.department),
  };
}

export default function NoticeEmailFilterPanel({ value, onChange, onPreview, previewLoading, options, summary }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const set = <K extends keyof NoticeEmailFilters>(key: K, next: NoticeEmailFilters[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <div className="space-y-4 rounded-xl border bg-muted/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Recipient Filters</p>
          <p className="text-xs text-muted-foreground">Use comma-separated values for text filters.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setShowAdvanced((s) => !s)}>
          {showAdvanced ? "Hide advanced" : "Show advanced"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-lg border bg-background p-3">
          <Label className="text-sm">Include Admins</Label>
          <Switch checked={value.include_admins} onCheckedChange={(next) => set("include_admins", next)} />
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Send Mode</Label>
          <Select value={value.send_mode} onValueChange={(mode) => set("send_mode", mode as NoticeEmailFilters["send_mode"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Individual (recommended)</SelectItem>
              <SelectItem value="cc">CC (limited personalization)</SelectItem>
              <SelectItem value="bcc">BCC (limited personalization)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {showAdvanced ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-sm">Batch</Label>
            <Select value={value.batch || ALL_OPTION} onValueChange={(next) => set("batch", next === ALL_OPTION ? "" : next)}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_OPTION}>All</SelectItem>
                {(options?.batch || []).map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Profession</Label>
            <Select value={value.profession || ALL_OPTION} onValueChange={(next) => set("profession", next === ALL_OPTION ? "" : next)}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_OPTION}>All</SelectItem>
                {(options?.profession || []).map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-sm">University</Label>
            <Select value={value.university || ALL_OPTION} onValueChange={(next) => set("university", next === ALL_OPTION ? "" : next)}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_OPTION}>All</SelectItem>
                {(options?.university || []).map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Department</Label>
            <Select value={value.department || ALL_OPTION} onValueChange={(next) => set("department", next === ALL_OPTION ? "" : next)}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_OPTION}>All</SelectItem>
                {(options?.department || []).map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Blood Group</Label>
            <Select
              value={value.blood_group || ALL_OPTION}
              onValueChange={(next) => set("blood_group", next === ALL_OPTION ? "" : next)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select or All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_OPTION}>All</SelectItem>
                {(options?.blood_group?.length ? options.blood_group : BLOOD_GROUPS).map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Gender</Label>
            <Select value={value.gender || ALL_OPTION} onValueChange={(next) => set("gender", next === ALL_OPTION ? "" : next)}>
              <SelectTrigger>
                <SelectValue placeholder="Select or All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_OPTION}>All</SelectItem>
                {(options?.gender?.length ? options.gender : GENDER_OPTIONS).map((g) => (
                  <SelectItem key={g} value={g}>
                    <span className="capitalize">{g}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={onPreview} disabled={previewLoading}>
          {previewLoading ? "Checking..." : "Preview Recipients"}
        </Button>
        {summary ? (
          <>
            <Badge variant="secondary">Selected: {summary.total_selected}</Badge>
            <Badge variant="default">Eligible: {summary.total_eligible_verified}</Badge>
            <Badge variant="outline">Unverified: {summary.excluded_unverified}</Badge>
            <Badge variant="outline">Missing Email: {summary.excluded_missing_email}</Badge>
            {typeof summary.sendable_now === "number" ? <Badge variant="default">Send Now: {summary.sendable_now}</Badge> : null}
            {typeof summary.queued_for_next_day === "number" ? (
              <Badge variant="destructive">Queued: {summary.queued_for_next_day}</Badge>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
