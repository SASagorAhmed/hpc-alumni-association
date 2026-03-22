import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/api-production/api.js";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DOCUMENT_CATEGORIES, type Document } from "@/hooks/useDocuments";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document?: Document | null;
  onSuccess: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function DocumentFormDialog({ open, onOpenChange, document, onSuccess }: Props) {
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Others");
  const [visibility, setVisibility] = useState("public");
  const [published, setPublished] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [existingFileName, setExistingFileName] = useState<string | null>(null);

  useEffect(() => {
    if (document) {
      setTitle(document.title);
      setDescription(document.description || "");
      setCategory(document.category);
      setVisibility(document.visibility);
      setPublished(document.published);
      setPinned(document.pinned || false);
      setExistingFileName(document.file_name);
      setFile(null);
    } else {
      setTitle("");
      setDescription("");
      setCategory("Others");
      setVisibility("public");
      setPublished(false);
      setPinned(false);
      setFile(null);
      setExistingFileName(null);
    }
  }, [document, open]);

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!document && !file) { toast.error("Please select a file"); return; }

    if (file && file.size > MAX_FILE_SIZE) {
      toast.error("File size must be under 5MB");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("hpc_auth_token");
      if (!token) {
        toast.error("Not authenticated");
        return;
      }

      const formData = new FormData();
      if (file) formData.append("file", file);
      formData.append("title", title.trim());
      formData.append("description", description.trim() || "");
      formData.append("category", category);
      formData.append("visibility", visibility);
      formData.append("published", String(published));
      formData.append("pinned", String(pinned));

      const res = await fetch(
        document
          ? `${API_BASE_URL}/api/admin/documents/${document.id}`
          : `${API_BASE_URL}/api/admin/documents`,
        {
          method: document ? "PUT" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || `Upload failed (${res.status})`);
      }

      toast.success(document ? "Document updated" : "Document uploaded");

      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to save document");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{document ? "Edit Document" : "Upload Document"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" rows={3} />
          </div>

          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOCUMENT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>File {!document && "*"}</Label>
            {existingFileName && !file && (
              <p className="text-xs text-muted-foreground mb-1">Current: {existingFileName}</p>
            )}
            <label className="flex items-center gap-2 border border-dashed border-border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <Upload className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {file ? file.name : "Click to select file (PDF, Image — max 5MB)"}
              </span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          <div>
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public — All Users</SelectItem>
                <SelectItem value="verified">Verified Alumni Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label>Published</Label>
            <Switch checked={published} onCheckedChange={setPublished} />
          </div>

          <div className="flex items-center justify-between">
            <Label>Pinned</Label>
            <Switch checked={pinned} onCheckedChange={setPinned} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            {document ? "Update" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
