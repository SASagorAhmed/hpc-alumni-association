import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from "@/api-production/api.js";
import { getAuthToken } from "@/lib/authToken";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, ImageIcon } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  "Alumni Meetup",
  "Iftar Mahfil",
  "Teacher Congratulation",
  "College Picnic",
  "Reunion",
  "General",
];

interface MemoryForm {
  title: string;
  category: string;
  description: string;
  photo_url: string;
  event_date: string;
  published: boolean;
  display_order: number;
}

const emptyForm: MemoryForm = {
  title: "",
  category: "General",
  description: "",
  photo_url: "",
  event_date: "",
  published: false,
  display_order: 0,
};

const AdminMemories = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<MemoryForm>(emptyForm);

  const { data: memories = [], isLoading } = useQuery({
    queryKey: ["admin-memories"],
    queryFn: async () => {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/admin/memories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load memories");
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: MemoryForm & { id?: string }) => {
      const auth = getAuthToken();
      const { id, ...rest } = data;
      if (id) {
        const res = await fetch(`${API_BASE_URL}/api/admin/memories/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth}` },
          body: JSON.stringify(rest),
        });
        if (!res.ok) throw new Error("Failed to update memory");
      } else {
        const res = await fetch(`${API_BASE_URL}/api/admin/memories`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth}` },
          body: JSON.stringify(rest),
        });
        if (!res.ok) throw new Error("Failed to create memory");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-memories"] });
      toast.success(editId ? "Memory updated" : "Memory added");
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const auth = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/admin/memories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth}` },
      });
      if (!res.ok) throw new Error("Failed to delete memory");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-memories"] });
      toast.success("Memory deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const openEdit = (memory: any) => {
    setEditId(memory.id);
    setForm({
      title: memory.title,
      category: memory.category,
      description: memory.description || "",
      photo_url: memory.photo_url || "",
      event_date: memory.event_date || "",
      published: memory.published ?? false,
      display_order: memory.display_order ?? 0,
    });
    setDialogOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const auth = getAuthToken();
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_BASE_URL}/api/admin/uploads/memories`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth}` },
        body: fd,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body?.error || "Upload failed");
        return;
      }
      setForm((f) => ({ ...f, photo_url: body.secure_url as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    saveMutation.mutate({ ...form, id: editId || undefined });
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Memories</h1>
            <p className="text-sm text-muted-foreground">
              Manage alumni photos and event memories
            </p>
          </div>
          <Button onClick={() => { setForm(emptyForm); setEditId(null); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Memory
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Photo</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : memories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No memories yet. Click "Add Memory" to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  memories.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        {m.photo_url ? (
                          <img src={m.photo_url} alt="" className="w-12 h-12 rounded object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{m.title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{m.category}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {m.event_date || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.published ? "default" : "outline"}>
                          {m.published ? "Published" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(m)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => {
                              if (confirm("Delete this memory?")) deleteMutation.mutate(m.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Memory" : "Add Memory"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Annual Alumni Meetup 2025"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of this memory..."
                rows={3}
              />
            </div>
            <div>
              <Label>Photo (max 2MB)</Label>
              <Input type="file" accept="image/*" onChange={handlePhotoUpload} />
              {form.photo_url && (
                <img src={form.photo_url} alt="Preview" className="mt-2 h-32 rounded object-cover" />
              )}
            </div>
            <div>
              <Label>Event Date</Label>
              <Input
                type="date"
                value={form.event_date}
                onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
              />
            </div>
            <div>
              <Label>Display Order</Label>
              <Input
                type="number"
                value={form.display_order}
                onChange={(e) => setForm((f) => ({ ...f, display_order: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.published}
                onCheckedChange={(v) => setForm((f) => ({ ...f, published: v }))}
              />
              <Label>Published</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editId ? "Update" : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminMemories;
