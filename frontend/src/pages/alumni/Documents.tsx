import { useState, useMemo, useEffect } from "react";
import { useSyncedQueryState } from "@/hooks/useSyncedQueryState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Search, FileText, Image as ImageIcon, Download, Pin, FolderOpen, Eye, Loader2, Calendar, Maximize2, X, ZoomIn, ZoomOut,
} from "lucide-react";
import { format } from "date-fns";
import { useDocuments, DOCUMENT_CATEGORIES, type Document } from "@/hooks/useDocuments";

function formatFileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadBase64File(dataUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const Documents = () => {
  const { documents, loading } = useDocuments(false);
  const [search, setSearch] = useSyncedQueryState("q", "");
  const [catFilter, setCatFilter] = useSyncedQueryState("cat", "all");
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);

  // Convert base64 PDF to blob URL so Chrome doesn't block it
  const pdfBlobUrl = useMemo(() => {
    if (!selectedDoc || selectedDoc.file_type !== "application/pdf") return null;
    try {
      const base64 = selectedDoc.file_url.split(",")[1];
      const bytes = atob(base64);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      const blob = new Blob([arr], { type: "application/pdf" });
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  }, [selectedDoc]);

  // Revoke blob URL on cleanup
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [pdfBlobUrl]);

  const filtered = documents.filter((d) => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase()) ||
      (d.description || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "all" || d.category === catFilter;
    return matchSearch && matchCat;
  });

  const categoryCount = DOCUMENT_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = documents.filter((d) => d.category === cat).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Documents</h1>
        <p className="text-sm text-muted-foreground">Browse and download official files and resources</p>
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
              <SelectItem key={c} value={c}>
                {c} {categoryCount[c] > 0 && `(${categoryCount[c]})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Document Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen className="w-10 h-10 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No documents available</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc) => (
            <Card key={doc.id} className="group hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedDoc(doc)}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    {doc.file_type?.startsWith("image") ? (
                      <ImageIcon className="w-5 h-5 text-primary" />
                    ) : (
                      <FileText className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-semibold text-foreground truncate">{doc.title}</h3>
                      {doc.pinned && <Pin className="w-3 h-3 text-amber-500 shrink-0" />}
                    </div>
                    {doc.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{doc.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{doc.category}</Badge>
                    {doc.file_size && (
                      <span className="text-[10px] text-muted-foreground">{formatFileSize(doc.file_size)}</span>
                    )}
                  </div>
                  {doc.created_at && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(doc.created_at), "dd MMM yy")}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 text-xs gap-1" onClick={(e) => { e.stopPropagation(); setSelectedDoc(doc); }}>
                    <Eye className="w-3 h-3" /> View
                  </Button>
                  <Button variant="default" size="sm" className="flex-1 text-xs gap-1" onClick={(e) => {
                    e.stopPropagation();
                    downloadBase64File(doc.file_url, doc.file_name || `${doc.title}.pdf`);
                  }}>
                    <Download className="w-3 h-3" /> Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={(o) => { if (!o) { setSelectedDoc(null); setFullscreen(false); setImageZoom(1); } }}>
        {selectedDoc && (
          <DialogContent className={fullscreen ? "max-w-[95vw] w-full h-[95vh] flex flex-col" : "max-w-4xl max-h-[90vh] flex flex-col"}>
            <DialogHeader className="shrink-0">
              <DialogDescription className="sr-only">Document preview and details</DialogDescription>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2 text-base">
                  {selectedDoc.file_type?.startsWith("image") ? (
                    <ImageIcon className="w-5 h-5 text-primary" />
                  ) : (
                    <FileText className="w-5 h-5 text-primary" />
                  )}
                  {selectedDoc.title}
                  {selectedDoc.pinned && <Pin className="w-4 h-4 text-amber-500" />}
                </DialogTitle>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFullscreen(!fullscreen)} title={fullscreen ? "Exit fullscreen" : "Fullscreen"}>
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                <Badge variant="outline">{selectedDoc.category}</Badge>
                {selectedDoc.file_size && (
                  <Badge variant="secondary">{formatFileSize(selectedDoc.file_size)}</Badge>
                )}
                {selectedDoc.created_at && (
                  <Badge variant="secondary" className="gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(selectedDoc.created_at), "dd MMMM yyyy")}
                  </Badge>
                )}
              </div>
              {selectedDoc.description && (
                <p className="text-sm text-muted-foreground mt-1">{selectedDoc.description}</p>
              )}
            </DialogHeader>

            {/* Preview Area */}
            <div className="flex-1 min-h-0 rounded-lg border bg-muted overflow-hidden relative">
              {selectedDoc.file_type === "application/pdf" && pdfBlobUrl ? (
                <iframe
                  src={pdfBlobUrl}
                  title={selectedDoc.title}
                  className="w-full h-full min-h-[400px]"
                  style={{ border: "none" }}
                />
              ) : selectedDoc.file_type?.startsWith("image") ? (
                <div className="w-full h-full min-h-[300px] flex items-center justify-center overflow-auto p-4 relative">
                  <img
                    src={selectedDoc.file_url}
                    alt={selectedDoc.title}
                    className="max-w-full transition-transform duration-200"
                    style={{ transform: `scale(${imageZoom})` }}
                  />
                  {/* Image zoom controls */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-lg border p-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setImageZoom((z) => Math.max(0.5, z - 0.25))}>
                      <ZoomOut className="w-3.5 h-3.5" />
                    </Button>
                    <span className="text-xs font-medium px-1 min-w-[3rem] text-center">{Math.round(imageZoom * 100)}%</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setImageZoom((z) => Math.min(3, z + 0.25))}>
                      <ZoomIn className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full min-h-[200px] flex items-center justify-center">
                  <div className="text-center">
                    <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Preview not available for this file type</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Download to view this file</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 flex items-center justify-between pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">{selectedDoc.file_name}</p>
              <Button className="gap-2" onClick={() => downloadBase64File(selectedDoc.file_url, selectedDoc.file_name || `${selectedDoc.title}.pdf`)}>
                <Download className="w-4 h-4" /> Download
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default Documents;
