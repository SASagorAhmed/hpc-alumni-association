import { useState } from "react";
import { getAuthToken } from "@/lib/authToken";
import { useSyncedQueryState } from "@/hooks/useSyncedQueryState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API_BASE_URL } from "@/api-production/api.js";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Search, Edit, Trash2, Pin, Eye, EyeOff, FileText, Image as ImageIcon, Download, Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useDocuments, DOCUMENT_CATEGORIES, type Document } from "@/hooks/useDocuments";
import DocumentFormDialog from "@/components/documents/DocumentFormDialog";

function formatFileSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const AdminDocuments = () => {
  const { documents, loading, refetch } = useDocuments(true);
  const [search, setSearch] = useSyncedQueryState("q", "");
  const [catFilter, setCatFilter] = useSyncedQueryState("cat", "all");
  const [formOpen, setFormOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<Document | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = documents.filter((d) => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "all" || d.category === catFilter;
    return matchSearch && matchCat;
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const token = getAuthToken();
    if (!token) {
      toast.error("Not authenticated");
      setDeleting(false);
      return;
    }

    const res = await fetch(`${API_BASE_URL}/api/admin/documents/${deleteId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      toast.error("Failed to delete");
    } else {
      toast.success("Document deleted");
      refetch();
    }
    setDeleting(false);
    setDeleteId(null);
  };

  const togglePublish = async (doc: Document) => {
    const token = getAuthToken();
    if (!token) {
      toast.error("Not authenticated");
      return;
    }

    const res = await fetch(`${API_BASE_URL}/api/admin/documents/${doc.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ published: !doc.published }),
    });

    if (!res.ok) toast.error("Failed to update");
    else {
      toast.success(doc.published ? "Unpublished" : "Published");
      refetch();
    }
  };

  const togglePin = async (doc: Document) => {
    const token = getAuthToken();
    if (!token) {
      toast.error("Not authenticated");
      return;
    }

    const res = await fetch(`${API_BASE_URL}/api/admin/documents/${doc.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ pinned: !doc.pinned }),
    });

    if (!res.ok) toast.error("Failed to update");
    else {
      toast.success(doc.pinned ? "Unpinned" : "Pinned");
      refetch();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Document Management</h1>
          <p className="text-sm text-muted-foreground">Upload and manage documents for alumni</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => { setEditDoc(null); setFormOpen(true); }}>
          <Plus className="w-3.5 h-3.5" /> Upload Document
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search documents…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {DOCUMENT_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-10 h-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No documents found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {doc.file_type?.startsWith("image") ? (
                            <ImageIcon className="w-4 h-4 text-primary shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-primary shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate max-w-[200px]">{doc.title}</p>
                            {doc.file_name && (
                              <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{doc.file_name}</p>
                            )}
                          </div>
                          {doc.pinned && <Pin className="w-3 h-3 text-amber-500 shrink-0" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{doc.category}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatFileSize(doc.file_size)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge variant={doc.published ? "default" : "secondary"} className="text-[10px]">
                            {doc.published ? "Published" : "Draft"}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] capitalize">{doc.visibility}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {doc.created_at ? format(new Date(doc.created_at), "dd MMM yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => togglePublish(doc)} title={doc.published ? "Unpublish" : "Publish"}>
                            {doc.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => togglePin(doc)} title={doc.pinned ? "Unpin" : "Pin"}>
                            <Pin className={`w-4 h-4 ${doc.pinned ? "text-amber-500" : ""}`} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditDoc(doc); setFormOpen(true); }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(doc.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <DocumentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        document={editDoc}
        onSuccess={refetch}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDocuments;
