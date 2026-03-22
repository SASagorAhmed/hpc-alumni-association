import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NOTICE_TYPES, type Notice, type NoticeFormData } from "@/hooks/useNotices";
import { useDocuments } from "@/hooks/useDocuments";
import { Upload, FileText, Image as ImageIcon, X, Link2 } from "lucide-react";

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
  const [form, setForm] = useState<NoticeFormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const { documents } = useDocuments();

  useEffect(() => {
    if (notice) {
      setForm({
        title: notice.title,
        content: notice.content || "",
        notice_type: notice.notice_type || "general",
        summary: notice.summary || "",
        external_link: notice.external_link || "",
        pinned: notice.pinned,
        urgent: notice.urgent,
        show_top_bar: notice.show_top_bar,
        audience: notice.audience || "verified",
        published: notice.published,
        expiry_date: notice.expiry_date ? notice.expiry_date.slice(0, 16) : "",
        linked_document_id: notice.linked_document_id || "",
        attachment_file: null,
        image_file: null,
      });
    } else {
      setForm(defaultForm);
    }
  }, [notice, open]);

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const ok = await onSubmit(form);
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  const set = (key: keyof NoticeFormData, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

          {/* Image */}
          <div className="space-y-1.5">
            <Label>Image Attachment</Label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background text-sm cursor-pointer hover:bg-muted transition-colors">
                <ImageIcon className="w-4 h-4" />
                {form.image_file ? form.image_file.name : "Choose image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => set("image_file", e.target.files?.[0] || null)}
                />
              </label>
              {(form.image_file || notice?.image_url) && (
                <Button variant="ghost" size="sm" onClick={() => set("image_file", null)}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            {notice?.image_url && !form.image_file && (
              <p className="text-xs text-muted-foreground">Current image attached</p>
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
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="admin">Admin Only</SelectItem>
              </SelectContent>
            </Select>
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
      </DialogContent>
    </Dialog>
  );
}
