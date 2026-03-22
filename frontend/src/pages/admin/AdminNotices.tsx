import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotices, NOTICE_TYPES, type Notice, type NoticeFormData } from "@/hooks/useNotices";
import NoticeFormDialog from "@/components/notices/NoticeFormDialog";
import {
  Plus, Search, Pin, AlertTriangle, Eye, EyeOff, Pencil, Trash2,
  FileText, Image as ImageIcon, ExternalLink, Monitor,
} from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminNotices() {
  const { notices, loading, createNotice, updateNotice, deleteNotice, togglePublish, togglePin } =
    useNotices();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editNotice, setEditNotice] = useState<Notice | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notice Management</h1>
          <p className="text-sm text-muted-foreground">Create and manage official notices</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="w-3.5 h-3.5" /> Add Notice
        </Button>
      </div>

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
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {NOTICE_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
                      <h3 className="text-sm font-semibold text-foreground">{n.title}</h3>
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
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
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
                      <span className="capitalize">Audience: {n.audience}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
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
    </div>
  );
}
