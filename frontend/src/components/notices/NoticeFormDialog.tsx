import { useState, useEffect, useRef, useCallback } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { NOTICE_TYPES, type Notice, type NoticeFormData } from "@/hooks/useNotices";
import { useDocuments } from "@/hooks/useDocuments";
import { NOTICE_CROP_ASPECT, getCroppedNoticeImageBlob } from "@/lib/noticeCrop";
import { toast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/api-production/api.js";
import { getAuthToken } from "@/lib/authToken";
import { FileText, Image as ImageIcon, X, Link2, Crop, ArrowLeft, Eye, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notice?: Notice | null;
  onSubmit: (data: NoticeFormData) => Promise<boolean>;
}

const defaultForm: NoticeFormData = {
  title: "",
  content: "",
  notice_type: "general",
  summary: "",
  external_link: "",
  pinned: false,
  urgent: false,
  show_top_bar: false,
  audience: "verified",
  published: false,
  expiry_date: "",
  linked_document_id: "",
  attachment_file: null,
  image_file: null,
};

export default function NoticeFormDialog({ open, onOpenChange, notice, onSubmit }: Props) {
  const [form, setForm]     = useState<NoticeFormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const { documents }       = useDocuments();

  // "form" = normal form view | "crop" = inline crop view | "preview" = email preview
  const [view, setView] = useState<"form" | "crop" | "preview">("form");

  // Source image (data URL) kept for re-crop
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  // react-easy-crop state
  const [crop, setCrop]                         = useState({ x: 0, y: 0 });
  const [zoom, setZoom]                         = useState(1);
  const [rotation, setRotation]                 = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [cropping, setCropping]                 = useState(false);

  // Preview of committed cropped image
  const [imagePreviewUrl, setImagePreviewUrl]   = useState<string | null>(null);
  const [previewPresidentName, setPreviewPresidentName] = useState("");
  const [previewFooterLinks, setPreviewFooterLinks] = useState({
    website_url: "",
    facebook_url: "",
    group_url: "",
  });

  const imageInputRef = useRef<HTMLInputElement>(null);

  // ── Reset on open/close ───────────────────────────────────────────────────
  useEffect(() => {
    if (notice) {
      setForm({
        title:               notice.title,
        content:             notice.content || "",
        notice_type:         notice.notice_type || "general",
        summary:             notice.summary || "",
        external_link:       notice.external_link || "",
        pinned:              notice.pinned,
        urgent:              notice.urgent,
        show_top_bar:        notice.show_top_bar,
        audience:            notice.audience || "verified",
        published:           notice.published,
        expiry_date:         notice.expiry_date ? notice.expiry_date.slice(0, 16) : "",
        linked_document_id:  notice.linked_document_id || "",
        attachment_file:     null,
        image_file:          null,
      });
      setImagePreviewUrl(notice.image_url || null);
    } else {
      setForm(defaultForm);
      setImagePreviewUrl(null);
    }
    setCropSrc(null);
    setView("form");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  }, [notice, open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const run = async () => {
      const token = getAuthToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/admin/notices/email-preview-context`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok || cancelled) return;
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      setPreviewPresidentName(String(data?.president_name || "").trim());
      setPreviewFooterLinks({
        website_url: String(data?.footer_links?.website_url || "").trim(),
        facebook_url: String(data?.footer_links?.facebook_url || "").trim(),
        group_url: String(data?.footer_links?.group_url || "").trim(),
      });
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const set = (key: keyof NoticeFormData, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  // File picker → read as data URL → switch to crop view
  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imageInputRef.current) imageInputRef.current.value = "";
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setCroppedAreaPixels(null);
      setView("crop");
    };
    reader.readAsDataURL(file);
  };

  // Apply crop → convert to File → back to form view
  const handleApplyCrop = async () => {
    if (!cropSrc || !croppedAreaPixels) {
      toast({ title: "Crop not ready", description: "Wait for the image to load then try again.", variant: "destructive" });
      return;
    }
    setCropping(true);
    try {
      const blob = await getCroppedNoticeImageBlob(cropSrc, croppedAreaPixels);
      const file = new File([blob], "notice-image.jpg", { type: "image/jpeg" });

      // Build preview URL
      const prevUrl = URL.createObjectURL(blob);
      setImagePreviewUrl((old) => { if (old?.startsWith("blob:")) URL.revokeObjectURL(old); return prevUrl; });

      set("image_file", file);
      setView("form");
    } catch (e) {
      toast({
        title: "Crop failed",
        description: e instanceof Error ? e.message : "Could not process image.",
        variant: "destructive",
      });
    } finally {
      setCropping(false);
    }
  };

  const clearImage = () => {
    set("image_file", null);
    if (imagePreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
    setCropSrc(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const ok = await onSubmit(form);
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  const hasImage = !!form.image_file || !!notice?.image_url;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-0 max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogDescription className="sr-only">
          Create or edit notice content, attachments, audience, and email preview settings.
        </DialogDescription>

        {/* ── CROP VIEW ───────────────────────────────────────────────────── */}
        {view === "crop" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setView("form")}
                  className="rounded p-0.5 hover:bg-muted transition-colors"
                  aria-label="Back to form"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                Crop notice image
                <Badge variant="outline" className="text-[10px] font-normal">16 : 9</Badge>
              </DialogTitle>
            </DialogHeader>

            <p className="text-sm text-muted-foreground">
              Drag to reposition · zoom to fill the frame. The cropped image will appear in both
              the card thumbnail and the detail view.
            </p>

            {/* Crop canvas */}
            <div
              className="relative overflow-hidden rounded-lg bg-muted"
              style={{ height: "min(52vh, 320px)" }}
            >
              {cropSrc && (
                <Cropper
                  image={cropSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={NOTICE_CROP_ASPECT}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  showGrid
                  cropShape="rect"
                />
              )}
            </div>

            {/* Sliders */}
            <div className="space-y-3 px-1">
              <div className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-xs text-muted-foreground">Zoom</span>
                <Slider value={[zoom]} min={1} max={3} step={0.02} onValueChange={(v) => setZoom(v[0] ?? 1)} className="flex-1" />
                <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{zoom.toFixed(1)}×</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-xs text-muted-foreground">Rotate</span>
                <Slider value={[rotation]} min={-45} max={45} step={1} onValueChange={(v) => setRotation(v[0] ?? 0)} className="flex-1" />
                <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {rotation > 0 ? `+${rotation}` : rotation}°
                </span>
              </div>
            </div>

            {/* Crop actions */}
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <Button
                type="button"
                className="w-full sm:w-auto"
                variant="outline"
                onClick={() => { setCrop({ x: 0, y: 0 }); setZoom(1); setRotation(0); }}
                disabled={cropping}
              >
                Reset
              </Button>
              <Button
                type="button"
                className="w-full sm:w-auto"
                variant="outline"
                onClick={() => setView("form")}
                disabled={cropping}
              >
                Cancel
              </Button>
              <Button type="button" className="w-full sm:w-auto" onClick={handleApplyCrop} disabled={cropping || !cropSrc}>
                {cropping ? "Processing…" : "Apply crop"}
              </Button>
            </div>
          </>
        )}

        {/* ── EMAIL PREVIEW VIEW ──────────────────────────────────────────── */}
        {view === "preview" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setView("form")}
                  className="rounded p-0.5 hover:bg-muted transition-colors"
                  aria-label="Back to form"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                Notice Email Preview
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 rounded-xl border bg-muted/20 p-4 sm:p-5">
              <div
                className={`rounded-lg border px-4 py-3 ${
                  form.urgent
                    ? "border-destructive/40 bg-destructive/10"
                    : "border-emerald-400/50 bg-emerald-50/80"
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  HPC Alumni Association
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      form.urgent
                        ? "bg-destructive/20 text-destructive"
                        : "bg-emerald-200 text-emerald-800"
                    }`}
                  >
                    {form.urgent ? <AlertTriangle className="h-3 w-3" /> : null}
                    {form.urgent ? "Urgent Notice" : "Official Notice"}
                  </span>
                </div>
              </div>

              <div className="min-w-0 rounded-xl border bg-background p-4 sm:p-5">
                <p className="text-sm text-muted-foreground">Dear Alumni Member,</p>
                <h3 className="mt-2 break-words text-3xl font-bold tracking-tight text-foreground">
                  {form.title.trim() || "Your notice title will appear here"}
                </h3>
                {form.summary.trim() ? (
                  <p className="mt-3 text-base leading-relaxed text-foreground/90">{form.summary}</p>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">Add a short summary for stronger email hierarchy.</p>
                )}

                {form.content.trim() ? (
                  <div
                    className={`mt-4 min-w-0 overflow-x-auto whitespace-pre-wrap break-words rounded-md border-l-4 bg-emerald-50/80 p-3 pl-4 text-[15px] leading-relaxed text-foreground ${
                      form.urgent ? "border-destructive/60" : "border-emerald-500/70"
                    }`}
                  >
                    {form.content}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">Main notice content will appear here.</p>
                )}

                {form.external_link.trim() ? (
                  <div className="mt-5">
                    <a
                      href={form.external_link}
                      target="_blank"
                      rel="noreferrer"
                      className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold text-white ${
                        form.urgent ? "bg-destructive hover:bg-destructive/90" : "bg-emerald-700 hover:bg-emerald-800"
                      }`}
                    >
                      View Full Notice
                    </a>
                  </div>
                ) : null}

                <div className="mt-6 border-t pt-4 text-xs text-muted-foreground">
                  <p>This is an official communication from HPC Alumni Association.</p>
                  <p className="mt-1 font-semibold text-foreground">
                    Sent by {previewPresidentName || "President"}, President
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {previewFooterLinks.website_url ? (
                      <a href={previewFooterLinks.website_url} target="_blank" rel="noreferrer" className="text-emerald-700">
                        🌐 Website
                      </a>
                    ) : (
                      <span className="text-emerald-700">🌐 Website</span>
                    )}
                    {previewFooterLinks.facebook_url ? (
                      <a href={previewFooterLinks.facebook_url} target="_blank" rel="noreferrer" className="text-blue-700">
                        📘 Facebook
                      </a>
                    ) : (
                      <span className="text-blue-700">📘 Facebook</span>
                    )}
                    {previewFooterLinks.group_url ? (
                      <a href={previewFooterLinks.group_url} target="_blank" rel="noreferrer" className="text-purple-700">
                        👥 Alumni Group
                      </a>
                    ) : (
                      <span className="text-purple-700">👥 Alumni Group</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" className="w-full sm:w-auto" variant="outline" onClick={() => setView("form")}>
                Back to Edit
              </Button>
            </div>
          </>
        )}

        {/* ── FORM VIEW ───────────────────────────────────────────────────── */}
        {view === "form" && (
          <>
            <DialogHeader>
              <DialogTitle>{notice ? "Edit Notice" : "Add Notice"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Notice title" />
              </div>

              {/* Type */}
              <div className="space-y-1.5">
                <Label>Notice Type</Label>
                <Select value={form.notice_type} onValueChange={(v) => set("notice_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NOTICE_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Content */}
              <div className="space-y-1.5">
                <Label>Content</Label>
                <Textarea rows={6} value={form.content} onChange={(e) => set("content", e.target.value)} placeholder="Full notice content..." />
              </div>

              {/* Summary */}
              <div className="space-y-1.5">
                <Label>Short Summary (for notifications)</Label>
                <Input value={form.summary} onChange={(e) => set("summary", e.target.value)} placeholder="Brief summary..." />
              </div>

              {/* ── Image with inline crop ──────────────────────────────── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4" /> Notice Image
                    <Badge variant="outline" className="text-[10px] font-normal">16 : 9</Badge>
                  </Label>
                  {hasImage && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearImage}
                      className="h-7 gap-1 text-destructive hover:text-destructive text-xs"
                    >
                      <X className="w-3.5 h-3.5" /> Remove
                    </Button>
                  )}
                </div>

                {/* Preview */}
                {imagePreviewUrl && (
                  <div
                    className="relative overflow-hidden rounded-lg border border-border bg-muted/30"
                    style={{ aspectRatio: "16/9" }}
                  >
                    <img src={imagePreviewUrl} alt="Notice preview" className="h-full w-full object-cover" />
                    {/* Re-crop only available when we have the original src */}
                    {cropSrc && (
                      <button
                        type="button"
                        onClick={() => { setCrop({ x: 0, y: 0 }); setZoom(1); setRotation(0); setView("crop"); }}
                        className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm hover:bg-black/80 transition-colors"
                      >
                        <Crop className="w-3 h-3" /> Re-crop
                      </button>
                    )}
                  </div>
                )}

                <label className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted transition-colors">
                  <ImageIcon className="w-4 h-4" />
                  {hasImage ? "Replace image" : "Choose image"}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImagePick}
                  />
                </label>

                {notice?.image_url && !form.image_file && (
                  <p className="text-xs text-muted-foreground">Current image attached. Choose a new one to replace it.</p>
                )}
              </div>

              {/* PDF */}
              <div className="space-y-1.5">
                <Label>PDF Attachment</Label>
                <div className="flex min-w-0 items-center gap-3">
                  <label className="flex min-w-0 items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-muted">
                    <FileText className="w-4 h-4" />
                    <span className="min-w-0 truncate">{form.attachment_file ? form.attachment_file.name : "Choose PDF"}</span>
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => set("attachment_file", e.target.files?.[0] || null)}
                    />
                  </label>
                  {(form.attachment_file || notice?.attachment_url) && (
                    <Button variant="ghost" size="sm" onClick={() => set("attachment_file", null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {notice?.attachment_url && !form.attachment_file && (
                  <p className="text-xs text-muted-foreground">Current PDF attached</p>
                )}
              </div>

              {/* External Link */}
              <div className="space-y-1.5">
                <Label>External Link</Label>
                <Input value={form.external_link} onChange={(e) => set("external_link", e.target.value)} placeholder="https://..." />
              </div>

              {/* Link Document */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Link2 className="w-4 h-4" /> Link Document</Label>
                <Select value={form.linked_document_id || "none"} onValueChange={(v) => set("linked_document_id", v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select a document..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {documents.filter(d => d.published).map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>{doc.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Expiry Date */}
              <div className="space-y-1.5">
                <Label>Expiry Date (optional)</Label>
                <Input type="datetime-local" value={form.expiry_date} onChange={(e) => set("expiry_date", e.target.value)} />
              </div>

              {/* Audience */}
              <div className="space-y-1.5">
                <Label>Audience</Label>
                <Select value={form.audience} onValueChange={(v) => set("audience", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verified">Verified Alumni Only</SelectItem>
                    <SelectItem value="public">Public (homepage + guests)</SelectItem>
                    <SelectItem value="admin">Admin Only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Public notices appear on the landing page and are visible before login.
                </p>
              </div>

              {/* Toggle controls */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label className="text-sm">Pin to Top</Label>
                  <Switch checked={form.pinned} onCheckedChange={(v) => set("pinned", v)} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label className="text-sm">Mark Urgent</Label>
                  <Switch checked={form.urgent} onCheckedChange={(v) => set("urgent", v)} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label className="text-sm">Show in Top Bar</Label>
                  <Switch checked={form.show_top_bar} onCheckedChange={(v) => set("show_top_bar", v)} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label className="text-sm">Publish Now</Label>
                  <Switch checked={form.published} onCheckedChange={(v) => set("published", v)} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setView("preview")} className="w-full gap-1.5 sm:w-auto">
                  <Eye className="w-4 h-4" /> Email Preview
                </Button>
                <Button className="w-full sm:w-auto" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button className="w-full sm:w-auto" onClick={handleSubmit} disabled={saving || !form.title.trim()}>
                  {saving ? "Saving..." : notice ? "Update Notice" : "Create Notice"}
                </Button>
              </div>
            </div>
          </>
        )}

      </DialogContent>
    </Dialog>
  );
}
