import { useState, useEffect, useRef, useCallback } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { FileText, Image as ImageIcon, X, Link2, Crop, ArrowLeft } from "lucide-react";

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

  // "form" = normal form view | "crop" = inline crop view
  const [view, setView] = useState<"form" | "crop">("form");

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">

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
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setCrop({ x: 0, y: 0 }); setZoom(1); setRotation(0); }}
                disabled={cropping}
              >
                Reset
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setView("form")}
                disabled={cropping}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleApplyCrop} disabled={cropping || !cropSrc}>
                {cropping ? "Processing…" : "Apply crop"}
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
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background text-sm cursor-pointer hover:bg-muted transition-colors">
                    <FileText className="w-4 h-4" />
                    {form.attachment_file ? form.attachment_file.name : "Choose PDF"}
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
              <div className="grid grid-cols-2 gap-4">
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
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={saving || !form.title.trim()}>
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
