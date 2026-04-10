import { useEffect, useMemo, useRef, useState } from "react";
import { useSyncedQueryState } from "@/hooks/useSyncedQueryState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotices, NOTICE_TYPES, type Notice, type NoticeFormData } from "@/hooks/useNotices";
import NoticeFormDialog from "@/components/notices/NoticeFormDialog";
import NoticeEmailFilterPanel, { type NoticeEmailFilters, toFilterPayload } from "@/components/notices/NoticeEmailFilterPanel";
import NoticeEmailProgressPanel from "@/components/notices/NoticeEmailProgressPanel";
import NoticeEmailHistoryTable from "@/components/notices/NoticeEmailHistoryTable";
import NoticeEmailCampaignDetail from "@/components/notices/NoticeEmailCampaignDetail";
import NoticeEmailTemplateEditor, { type NoticeEmailTemplateConfig } from "@/components/notices/NoticeEmailTemplateEditor";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus, Search, Pin, AlertTriangle, Eye, EyeOff, Pencil, Trash2, Send,
  FileText, Image as ImageIcon, ExternalLink, Monitor,
} from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { API_BASE_URL } from "@/api-production/api.js";
import { getAuthToken } from "@/lib/authToken";

const defaultEmailFilters: NoticeEmailFilters = {
  include_admins: true,
  send_mode: "individual",
  batch: "",
  blood_group: "",
  profession: "",
  gender: "",
  university: "",
  department: "",
};

type PreviewSummary = {
  total_selected: number;
  total_eligible_verified: number;
  excluded_unverified: number;
  excluded_missing_email: number;
  sendable_now: number;
  queued_for_next_day: number;
  quota_remaining: number;
};

type CampaignHistoryRow = {
  id: string;
  notice_id: string;
  notice_title?: string;
  status: string;
  sent_count: number;
  failed_count: number;
  pending_count: number;
  created_at: string;
};

type CampaignStatusResponse = {
  id: string;
  status: string;
  sent_count: number;
  failed_count: number;
  pending_count: number;
  skipped_count: number;
  total_eligible_verified: number;
};

type CampaignRecipientRow = {
  id: string;
  email: string;
  status: string;
  failed_reason?: string | null;
};

type FilterOptions = {
  batch: string[];
  blood_group: string[];
  profession: string[];
  gender: string[];
  university: string[];
  department: string[];
};

type PreviewRecipient = {
  user_id: string;
  name: string;
  email: string;
  photo?: string;
};

type EmailGovernanceSummary = {
  date: string;
  provider: string;
  daily_limit: number;
  sent_today: number;
  available_today: number;
  grouped_by_type: Record<string, number>;
  grouped_by_status: Record<string, number>;
};

type EmailAuditRow = {
  id: string;
  created_at: string;
  created_at_unix?: number | string;
  title?: string;
  email_type: string;
  status: string;
  recipient_email: string;
  initiated_by_email?: string | null;
  campaign_id?: string | null;
  notice_id?: string | null;
  reason?: string | null;
};

function todayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

const AUDIT_BD_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Dhaka",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

function formatAuditTimeBd(row: EmailAuditRow) {
  const unix = Number(row.created_at_unix);
  let date: Date | null = null;
  if (Number.isFinite(unix) && unix > 0) {
    date = new Date(unix * 1000);
  } else if (row.created_at) {
    date = new Date(row.created_at);
  }
  if (!date || Number.isNaN(date.getTime())) return "-";
  return AUDIT_BD_TIME_FORMATTER.format(date);
}

function recipientKeyOf(r: { user_id: string; email: string }) {
  return `${String(r.user_id || "").trim()}::${String(r.email || "").trim().toLowerCase()}`;
}

export default function AdminNotices() {
  const { notices, loading, createNotice, updateNotice, deleteNotice, togglePublish, togglePin } =
    useNotices();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editNotice, setEditNotice] = useState<Notice | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useSyncedQueryState("q", "");
  const [typeFilter, setTypeFilter] = useSyncedQueryState("type", "all");
  const [campaignNotice, setCampaignNotice] = useState<Notice | null>(null);
  const [filters, setFilters] = useState<NoticeEmailFilters>(defaultEmailFilters);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewSummary, setPreviewSummary] = useState<PreviewSummary | null>(null);
  const [previewRecipients, setPreviewRecipients] = useState<PreviewRecipient[]>([]);
  const [selectedRecipientKeys, setSelectedRecipientKeys] = useState<string[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [historyRows, setHistoryRows] = useState<CampaignHistoryRow[]>([]);
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [activeCampaignNoticeId, setActiveCampaignNoticeId] = useState<string | null>(null);
  const [activeCampaignStatus, setActiveCampaignStatus] = useState<CampaignStatusResponse | null>(null);
  const [activeCampaignGrouped, setActiveCampaignGrouped] = useState<Record<string, number>>({});
  const [activeCampaignQuota, setActiveCampaignQuota] = useState<{ remaining_count?: number } | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCampaignId, setDetailCampaignId] = useState<string | null>(null);
  const [detailRecipients, setDetailRecipients] = useState<CampaignRecipientRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const lastErrorRef = useRef<{ message: string; at: number } | null>(null);
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);
  const [templateConfig, setTemplateConfig] = useState<NoticeEmailTemplateConfig | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateResetting, setTemplateResetting] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateSavedAt, setTemplateSavedAt] = useState<string | null>(null);
  const [governanceDate, setGovernanceDate] = useState<string>(todayDateKey());
  const [governanceSummary, setGovernanceSummary] = useState<EmailGovernanceSummary | null>(null);
  const [governanceSummaryLoading, setGovernanceSummaryLoading] = useState(false);
  const [governanceSummaryError, setGovernanceSummaryError] = useState<string | null>(null);
  const [auditRows, setAuditRows] = useState<EmailAuditRow[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditTypeFilter, setAuditTypeFilter] = useState<string>("all");
  const [auditStatusFilter, setAuditStatusFilter] = useState<string>("all");
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const auditPageSize = 12;

  const filtered = notices.filter((n) => {
    const matchSearch = n.title.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || n.notice_type === typeFilter;
    return matchSearch && matchType;
  });

  const handleSubmit = async (data: NoticeFormData) => {
    if (editNotice) return updateNotice(editNotice.id, data);
    return createNotice(data);
  };

  const openEdit = (n: Notice) => {
    setEditNotice(n);
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditNotice(null);
    setDialogOpen(true);
  };

  const authHeaders = useMemo(() => {
    const token = getAuthToken();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/notices/email-campaigns/history?limit=40`, {
        headers: { Authorization: authHeaders.Authorization },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        reportCampaignError(String(data?.error || "Failed to load campaign history"));
        return;
      }
      setHistoryRows(data?.rows || []);
    } catch {
      reportCampaignError("Failed to load campaign history");
    }
  };

  useEffect(() => {
    void fetchHistory();
  }, []);

  const fetchGovernanceSummary = async () => {
    setGovernanceSummaryLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/email-governance/summary?date=${encodeURIComponent(governanceDate)}`,
        { headers: { Authorization: authHeaders.Authorization } }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGovernanceSummaryError(String(data?.error || "Failed to load email governance summary"));
        return;
      }
      setGovernanceSummary(data as EmailGovernanceSummary);
      setGovernanceSummaryError(null);
    } catch {
      setGovernanceSummaryError("Failed to load email governance summary");
    } finally {
      setGovernanceSummaryLoading(false);
    }
  };

  const fetchGovernanceAudit = async () => {
    setAuditLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("date", governanceDate);
      if (auditTypeFilter !== "all") q.set("type", auditTypeFilter);
      if (auditStatusFilter !== "all") q.set("status", auditStatusFilter);
      q.set("page", String(auditPage));
      q.set("pageSize", String(auditPageSize));

      const res = await fetch(`${API_BASE_URL}/api/admin/email-governance/audit?${q.toString()}`, {
        headers: { Authorization: authHeaders.Authorization },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAuditError(String(data?.error || "Failed to load email audit"));
        return;
      }
      setAuditRows(Array.isArray(data?.rows) ? data.rows : []);
      setAuditTotal(Number(data?.total || 0));
      setAuditError(null);
    } catch {
      setAuditError("Failed to load email audit");
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    void fetchGovernanceSummary();
  }, [governanceDate]);

  useEffect(() => {
    void fetchGovernanceAudit();
  }, [governanceDate, auditTypeFilter, auditStatusFilter, auditPage]);

  const closeCampaignPopups = () => {
    setCampaignNotice(null);
    setProgressOpen(false);
    setDetailOpen(false);
  };

  const reportCampaignError = (message: string) => {
    const normalized = String(message || "").trim() || "Something went wrong.";
    const now = Date.now();
    const last = lastErrorRef.current;
    if (last && last.message === normalized && now - last.at < 2000) return;
    lastErrorRef.current = { message: normalized, at: now };
    setCampaignError(normalized);
  };

  const loadTemplateConfig = async () => {
    setTemplateLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/notices/email-template-config?t=${Date.now()}`, {
        cache: "no-store",
        headers: { Authorization: authHeaders.Authorization },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTemplateError(String(data?.error || "Failed to load template config"));
        return null;
      }
      setTemplateConfig(data?.config || null);
      setTemplateError(null);
      return data?.config || null;
    } catch {
      setTemplateError("Failed to load template config");
      return null;
    } finally {
      setTemplateLoading(false);
    }
  };

  const openTemplateEditor = () => {
    closeCampaignPopups();
    setTemplateEditorOpen(true);
    setTemplateError(null);
    setTemplateSavedAt(null);
    void loadTemplateConfig();
  };

  const saveTemplateConfig = async () => {
    if (!templateConfig) return;
    setTemplateSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/notices/email-template-config`, {
        method: "PUT",
        cache: "no-store",
        headers: authHeaders,
        body: JSON.stringify(templateConfig),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTemplateError(String(data?.error || "Failed to save template config"));
        setTemplateSavedAt(null);
        return;
      }
      const canonical = await loadTemplateConfig();
      if (canonical) {
        setTemplateConfig(canonical);
        setTemplateSavedAt(new Date().toISOString());
      } else {
        setTemplateSavedAt(null);
      }
      setTemplateError(null);
    } catch {
      setTemplateError("Failed to save template config");
      setTemplateSavedAt(null);
    } finally {
      setTemplateSaving(false);
    }
  };

  const resetTemplateConfig = async () => {
    setTemplateResetting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/notices/email-template-config/reset`, {
        method: "POST",
        headers: { Authorization: authHeaders.Authorization },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTemplateError(String(data?.error || "Failed to reset template config"));
        setTemplateSavedAt(null);
        return;
      }
      setTemplateConfig(data?.config || null);
      setTemplateError(null);
      setTemplateSavedAt(new Date().toISOString());
    } catch {
      setTemplateError("Failed to reset template config");
      setTemplateSavedAt(null);
    } finally {
      setTemplateResetting(false);
    }
  };

  const openCampaignForNotice = (notice: Notice) => {
    closeCampaignPopups();
    setCampaignError(null);
    setCampaignNotice(notice);
    setFilters(defaultEmailFilters);
    setPreviewSummary(null);
    setPreviewRecipients([]);
    setSelectedRecipientKeys([]);
    void fetchFilterOptions();
  };

  const fetchFilterOptions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/notices/email-campaigns/filter-options`, {
        headers: { Authorization: authHeaders.Authorization },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        reportCampaignError(String(data?.error || "Failed to load filter options"));
        return;
      }
      setFilterOptions(data?.options || null);
    } catch {
      reportCampaignError("Failed to load filter options");
    }
  };

  const handlePreviewRecipients = async () => {
    if (!campaignNotice) return;
    setPreviewLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/notices/${campaignNotice.id}/email-campaigns/preview-recipients`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(toFilterPayload(filters)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        reportCampaignError(String(data?.error || "Failed to preview recipients"));
        return;
      }
      setCampaignError(null);
      setPreviewSummary({
        ...data.summary,
        sendable_now: data.sendable_now,
        queued_for_next_day: data.queued_for_next_day,
        quota_remaining: data?.quota?.remaining_count || 0,
      });
      const recipients = data?.eligible_recipients || [];
      setPreviewRecipients(recipients);
      setSelectedRecipientKeys(
        recipients.map((r: PreviewRecipient) => recipientKeyOf({ user_id: r.user_id, email: r.email }))
      );
    } catch {
      reportCampaignError("Failed to preview recipients");
    } finally {
      setPreviewLoading(false);
    }
  };

  const toggleRecipientSelection = (row: PreviewRecipient, checked: boolean) => {
    const key = recipientKeyOf(row);
    setSelectedRecipientKeys((prev) => {
      if (checked) {
        if (prev.includes(key)) return prev;
        return [...prev, key];
      }
      return prev.filter((k) => k !== key);
    });
  };

  const selectAllPreviewRecipients = () => {
    setSelectedRecipientKeys(previewRecipients.map((r) => recipientKeyOf(r)));
  };

  const clearAllPreviewRecipients = () => {
    setSelectedRecipientKeys([]);
  };

  const createAndStartCampaign = async () => {
    if (!campaignNotice) return;
    setCreatingCampaign(true);
    const selectedRows =
      selectedRecipientKeys.length > 0
        ? previewRecipients.filter((r) => selectedRecipientKeys.includes(recipientKeyOf(r)))
        : previewRecipients;
    try {
      const createRes = await fetch(`${API_BASE_URL}/api/admin/notices/${campaignNotice.id}/email-campaigns`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          ...toFilterPayload(filters),
          selected_recipients: selectedRows.map((r) => ({
            user_id: r.user_id,
            email: r.email,
          })),
        }),
      });
      const createData = await createRes.json().catch(() => ({}));
      if (!createRes.ok || !createData?.campaign_id) {
        reportCampaignError(String(createData?.error || "Failed to create campaign"));
        return;
      }

      const campaignId = String(createData.campaign_id);
      const startRes = await fetch(`${API_BASE_URL}/api/admin/notices/${campaignNotice.id}/email-campaigns/${campaignId}/start`, {
        method: "POST",
        headers: authHeaders,
      });
      const startData = await startRes.json().catch(() => ({}));
      if (!startRes.ok) {
        reportCampaignError(String(startData?.error || "Failed to start campaign"));
        return;
      }

      setCampaignError(null);
      closeCampaignPopups();
      setActiveCampaignId(campaignId);
      setActiveCampaignNoticeId(campaignNotice.id);
      setProgressOpen(true);
      void fetchHistory();
    } catch {
      reportCampaignError("Failed to create/start campaign");
    } finally {
      setCreatingCampaign(false);
    }
  };

  useEffect(() => {
    if (!progressOpen || !activeCampaignNoticeId || !activeCampaignId) return;
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/admin/notices/${activeCampaignNoticeId}/email-campaigns/${activeCampaignId}/status`,
          { headers: { Authorization: authHeaders.Authorization } }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok || cancelled) {
          if (!cancelled) reportCampaignError(String(data?.error || "Failed to refresh campaign status"));
          return;
        }
        if (cancelled) return;
        setCampaignError(null);
        setActiveCampaignStatus(data?.campaign || null);
        setActiveCampaignGrouped(data?.grouped || {});
        setActiveCampaignQuota(data?.quota || null);
      } catch {
        if (!cancelled) reportCampaignError("Failed to refresh campaign status");
      }
    };
    void run();
    const t = setInterval(() => {
      void run();
    }, 2500);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [progressOpen, activeCampaignNoticeId, activeCampaignId, authHeaders.Authorization]);

  const continuePending = async () => {
    if (!activeCampaignNoticeId || !activeCampaignId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/notices/${activeCampaignNoticeId}/email-campaigns/${activeCampaignId}/continue-pending`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        reportCampaignError(String(data?.error || "Failed to continue pending recipients"));
        return;
      }
      setCampaignError(null);
    } catch {
      reportCampaignError("Failed to continue pending recipients");
    }
  };

  const resendFailed = async () => {
    if (!activeCampaignNoticeId || !activeCampaignId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/notices/${activeCampaignNoticeId}/email-campaigns/${activeCampaignId}/resend-failed`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        reportCampaignError(String(data?.error || "Failed to resend failed recipients"));
        return;
      }
      setCampaignError(null);
    } catch {
      reportCampaignError("Failed to resend failed recipients");
    }
  };

  const openCampaignDetail = async (campaignId: string) => {
    const noticeId = historyRows.find((r) => r.id === campaignId)?.notice_id as string | undefined;
    if (!noticeId) return;
    try {
      setCampaignError(null);
      closeCampaignPopups();
      setDetailCampaignId(campaignId);
      setActiveCampaignNoticeId(noticeId);
      setDetailRecipients([]);
      setDetailLoading(true);
      setDetailOpen(true);

      const res = await fetch(`${API_BASE_URL}/api/admin/notices/${noticeId}/email-campaigns/${campaignId}/recipients`, {
        headers: { Authorization: authHeaders.Authorization },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        reportCampaignError(String(data?.error || "Failed to load campaign details"));
        setDetailLoading(false);
        return;
      }
      setDetailRecipients(data?.recipients || []);
      setDetailLoading(false);
    } catch {
      reportCampaignError("Failed to load campaign details");
      setDetailLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notice Management</h1>
          <p className="text-sm text-muted-foreground">Create and manage official notices</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={openTemplateEditor}>
            <FileText className="w-3.5 h-3.5" /> Email Template
          </Button>
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5" /> Add Notice
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Email Governance</h2>
              <p className="text-xs text-muted-foreground">
                Global Brevo quota and daily audit across verification, reset, notices, and notification emails.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={governanceDate}
                onChange={(e) => {
                  setGovernanceDate(e.target.value || todayDateKey());
                  setAuditPage(1);
                }}
                className="h-8 w-[170px]"
              />
              <Button type="button" size="sm" variant="outline" onClick={() => { void fetchGovernanceSummary(); void fetchGovernanceAudit(); }}>
                Refresh
              </Button>
            </div>
          </div>

          {governanceSummaryError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive break-words">
              {governanceSummaryError}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-md border p-3">
              <p className="text-[11px] text-muted-foreground">Daily Limit</p>
              <p className="text-xl font-bold text-foreground">{governanceSummary?.daily_limit ?? 300}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-[11px] text-muted-foreground">Sent Today</p>
              <p className="text-xl font-bold text-foreground">{governanceSummary?.sent_today ?? 0}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-[11px] text-muted-foreground">Available Today</p>
              <p className="text-xl font-bold text-emerald-700">{governanceSummary?.available_today ?? 0}</p>
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-2">
            <p className="text-sm font-semibold text-foreground">Type Counts</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(governanceSummary?.grouped_by_type || {}).map(([k, v]) => (
                <Badge key={k} variant="outline">{k}: {v}</Badge>
              ))}
              {governanceSummaryLoading ? <Badge variant="secondary">Loading...</Badge> : null}
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-foreground">Email Audit</p>
              <div className="flex flex-wrap gap-2">
                <Select value={auditTypeFilter} onValueChange={(v) => { setAuditTypeFilter(v); setAuditPage(1); }}>
                  <SelectTrigger className="h-8 w-[170px]"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="auth_verify">auth_verify</SelectItem>
                    <SelectItem value="auth_reset">auth_reset</SelectItem>
                    <SelectItem value="auth_login_otp">auth_login_otp</SelectItem>
                    <SelectItem value="notice_publish">notice_publish</SelectItem>
                    <SelectItem value="notice_campaign">notice_campaign</SelectItem>
                    <SelectItem value="notification">notification</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={auditStatusFilter} onValueChange={(v) => { setAuditStatusFilter(v); setAuditPage(1); }}>
                  <SelectTrigger className="h-8 w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="sent">sent</SelectItem>
                    <SelectItem value="failed">failed</SelectItem>
                    <SelectItem value="blocked_limit">blocked_limit</SelectItem>
                    <SelectItem value="queued_next_day">queued_next_day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {auditError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive break-words">
                {auditError}
              </div>
            ) : null}

            <div className="max-h-80 overflow-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-2 py-2">Time</th>
                    <th className="px-2 py-2">Title</th>
                    <th className="px-2 py-2">Type</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Recipient</th>
                    <th className="px-2 py-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLoading ? (
                    <tr>
                      <td colSpan={6} className="px-2 py-3 text-muted-foreground">Loading audit...</td>
                    </tr>
                  ) : auditRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-2 py-3 text-muted-foreground">No email audit records for this filter/date.</td>
                    </tr>
                  ) : (
                    auditRows.map((row) => (
                      <tr key={row.id} className="border-t align-top">
                        <td className="px-2 py-2 whitespace-nowrap">{formatAuditTimeBd(row)}</td>
                        <td className="px-2 py-2 max-w-[260px]">
                          <p className="truncate" title={row.title || "-"}>
                            {row.title || "-"}
                          </p>
                        </td>
                        <td className="px-2 py-2">{row.email_type}</td>
                        <td className="px-2 py-2"><Badge variant="outline">{row.status}</Badge></td>
                        <td className="px-2 py-2 break-all">{row.recipient_email || "-"}</td>
                        <td className="px-2 py-2 break-words">{row.reason || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">Total records: {auditTotal}</p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  disabled={auditPage <= 1}
                >
                  Previous
                </Button>
                <Badge variant="secondary">Page {auditPage}</Badge>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setAuditPage((p) => p + 1)}
                  disabled={auditPage * auditPageSize >= auditTotal}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search notices..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {NOTICE_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <NoticeEmailProgressPanel
        open={progressOpen}
        campaign={activeCampaignStatus}
        quotaRemaining={activeCampaignQuota?.remaining_count || 0}
        grouped={activeCampaignGrouped}
        onContinuePending={continuePending}
        onResendFailed={resendFailed}
        onDismiss={() => setProgressOpen(false)}
        errorMessage={campaignError}
      />

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground text-sm">
            No notices found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => (
            <Card key={n.id} className={`${n.urgent ? "border-destructive/50" : ""}`}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="min-w-0 break-words text-sm font-semibold text-foreground">{n.title}</h3>
                      {n.pinned && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <Pin className="w-3 h-3" /> Pinned
                        </Badge>
                      )}
                      {n.urgent && (
                        <Badge variant="destructive" className="text-[10px] gap-1">
                          <AlertTriangle className="w-3 h-3" /> Urgent
                        </Badge>
                      )}
                      {n.show_top_bar && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Monitor className="w-3 h-3" /> Top Bar
                        </Badge>
                      )}
                      <Badge variant={n.published ? "default" : "secondary"} className="text-[10px]">
                        {n.published ? "Published" : "Draft"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {n.notice_type}
                      </Badge>
                    </div>
                    {n.content && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.content}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {n.created_at && <span>{format(new Date(n.created_at), "dd MMM yyyy")}</span>}
                      {n.attachment_url && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" /> PDF
                        </span>
                      )}
                      {n.image_url && (
                        <span className="flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" /> Image
                        </span>
                      )}
                      {n.external_link && (
                        <span className="flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> Link
                        </span>
                      )}
                      {(n as any).linked_document_id && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3 text-primary" /> Doc Linked
                        </span>
                      )}
                      <span className="capitalize break-words">Audience: {n.audience}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openCampaignForNotice(n)} title="Send Email Campaign">
                      <Send className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePin(n.id, !n.pinned)}
                      title={n.pinned ? "Unpin" : "Pin"}
                    >
                      <Pin className={`w-4 h-4 ${n.pinned ? "text-primary" : ""}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePublish(n.id, !n.published)}
                      title={n.published ? "Unpublish" : "Publish"}
                    >
                      {n.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(n)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(n.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <NoticeEmailHistoryTable rows={historyRows} onOpenDetail={openCampaignDetail} />

      <NoticeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        notice={editNotice}
        onSubmit={handleSubmit}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notice?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteNotice(deleteId);
                setDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!campaignNotice} onOpenChange={(open) => !open && setCampaignNotice(null)}>
        <DialogContent className="min-w-0 max-w-3xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="break-words">
              Email Campaign · {campaignNotice?.title || ""}
            </DialogTitle>
            <DialogDescription>
              Filter, preview, and select recipients before starting this notice email campaign.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {campaignError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive break-words">
                {campaignError}
              </div>
            ) : null}
            <NoticeEmailFilterPanel
              value={filters}
              onChange={setFilters}
              onPreview={handlePreviewRecipients}
              previewLoading={previewLoading}
              options={filterOptions}
              summary={previewSummary}
            />

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
              Admin inclusion default is enabled. You can switch to exclude admins.
            </div>

            <div className="rounded-lg border bg-background p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">Available Recipient Emails</p>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Badge variant="outline">Selected: {selectedRecipientKeys.length}</Badge>
                  <Button type="button" variant="outline" size="sm" onClick={selectAllPreviewRecipients}>
                    Select All
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={clearAllPreviewRecipients}>
                    Clear All
                  </Button>
                </div>
              </div>
              {previewRecipients.length === 0 ? (
                <p className="text-xs text-muted-foreground">Click “Preview Recipients” to load filtered users.</p>
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {previewRecipients.map((r) => (
                    <div key={`${r.user_id}-${r.email}`} className="flex min-w-0 items-center gap-2 rounded-md border p-2">
                      <Checkbox
                        checked={selectedRecipientKeys.includes(recipientKeyOf(r))}
                        onCheckedChange={(checked) => toggleRecipientSelection(r, checked === true)}
                        aria-label={`Select ${r.email}`}
                      />
                      {r.photo ? (
                        <img src={r.photo} alt="" className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                          {(r.name || "A").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-foreground">{r.name || "Alumni Member"}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{r.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button className="w-full sm:w-auto" variant="outline" onClick={() => setCampaignNotice(null)}>
                Cancel
              </Button>
              <Button className="w-full sm:w-auto" onClick={createAndStartCampaign} disabled={creatingCampaign}>
                {creatingCampaign ? "Starting..." : "Create & Start Sending"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <NoticeEmailCampaignDetail
        open={detailOpen}
        onOpenChange={setDetailOpen}
        campaignId={detailCampaignId}
        recipients={detailRecipients}
        loading={detailLoading}
        errorMessage={campaignError}
      />

      <NoticeEmailTemplateEditor
        open={templateEditorOpen}
        onOpenChange={setTemplateEditorOpen}
        config={templateConfig}
        loading={templateLoading}
        saving={templateSaving}
        resetting={templateResetting}
        error={templateError}
        savedAt={templateSavedAt}
        onChange={setTemplateConfig}
        onSave={saveTemplateConfig}
        onReset={resetTemplateConfig}
      />
    </div>
  );
}
