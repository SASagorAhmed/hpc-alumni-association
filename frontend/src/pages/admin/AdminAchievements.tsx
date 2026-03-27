import React, { useState, useEffect } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Award, Plus, Pencil, Trash2, Pin, ArrowUp, ArrowDown, Search, Settings, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AchievementPhotoCropDialog } from "@/components/admin/AchievementPhotoCropDialog";
import { BANNER_DEFAULT_PHOTO_TAGLINE } from "@/constants/bannerCopy";
import { BANNER_MAX_WORDS, clampToWordLimit, countWords } from "@/lib/bannerWordLimit";
import { API_BASE_URL } from "@/api-production/api.js";
import { getAuthToken } from "@/lib/authToken";

interface Achievement {
  id: string;
  name: string;
  batch: string | null;
  photo_url: string | null;
  achievement_title: string;
  institution: string | null;
  message: string | null;
  tag: string | null;
  location: string | null;
  achievement_date: string | null;
  display_order: number;
  is_active: boolean;
  is_pinned: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  banner_photo_batch_text?: string | null;
  banner_photo_tagline?: string | null;
  banner_congratulations_text?: string | null;
  banner_theme?: "default" | "theme2" | null;
}

interface AchievementSettings {
  id: string;
  banner_enabled: boolean;
  slide_duration: number;
  max_display_count: number | null;
  banner_theme?: "default" | "theme2";
}

const emptyForm = {
  name: "",
  batch: "",
  photo_url: "",
  achievement_title: "",
  institution: "",
  message: "",
  tag: "",
  location: "",
  achievement_date: "",
  start_date: "",
  end_date: "",
  banner_photo_batch_text: "",
  banner_photo_tagline: "",
  banner_congratulations_text: "",
  banner_theme: "default" as "default" | "theme2",
};

const AdminAchievements = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [settings, setSettings] = useState<AchievementSettings | null>(null);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const cropObjectUrlRef = React.useRef<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const token = getAuthToken();

  const revokeCropPreview = React.useCallback(() => {
    if (cropObjectUrlRef.current) {
      URL.revokeObjectURL(cropObjectUrlRef.current);
      cropObjectUrlRef.current = null;
    }
    setCropImageSrc(null);
  }, []);

  const handleCropDialogOpenChange = (open: boolean) => {
    setCropDialogOpen(open);
    if (!open) revokeCropPreview();
  };

  const uploadPhotoBlob = async (blob: Blob) => {
    if (blob.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Cropped image is still over 2MB. Try zooming out in the cropper or use a smaller source image.",
        variant: "destructive",
      });
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append("file", blob, "achievement-banner.jpg");
    try {
      const r = await fetch(`${API_BASE_URL}/api/admin/uploads/achievements`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.error || "Upload failed");
      setForm((prev) => ({ ...prev, photo_url: body.secure_url as string }));
      toast({ title: "Photo uploaded", description: "Banner crop saved." });
    } catch (err) {
      toast({ title: "Upload failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  /** Open crop dialog — banner uses a fixed wide frame (8∶5) after crop */
  const handlePhotoFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 8MB before cropping (export is JPEG under 2MB).",
        variant: "destructive",
      });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file", variant: "destructive" });
      return;
    }
    revokeCropPreview();
    const url = URL.createObjectURL(file);
    cropObjectUrlRef.current = url;
    setCropImageSrc(url);
    setCropDialogOpen(true);
  };

  const fetchData = async () => {
    const [achRes, settingsRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/admin/achievements`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_BASE_URL}/api/admin/achievement-settings`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const achData = achRes.ok ? await achRes.json().catch(() => []) : [];
    const settingsRaw = settingsRes.ok ? await settingsRes.json().catch(() => null) : null;
    if (Array.isArray(achData)) setAchievements(achData as unknown as Achievement[]);
    if (
      settingsRaw &&
      typeof settingsRaw === "object" &&
      !Array.isArray(settingsRaw) &&
      "banner_enabled" in settingsRaw &&
      !("ok" in settingsRaw && (settingsRaw as { ok?: boolean }).ok === false)
    ) {
      const s = settingsRaw as AchievementSettings & { banner_enabled: boolean | number | string };
      const allowedSlides = [3, 4, 5, 7, 10];
      let slide = Number(s.slide_duration);
      if (!Number.isFinite(slide) || slide < 2) slide = 4;
      if (!allowedSlides.includes(slide)) slide = 4;
      let maxDisplay: number | null = null;
      const mdc = s.max_display_count as number | null | undefined;
      if (mdc !== null && mdc !== undefined && mdc !== "") {
        const n = Number(mdc);
        if (Number.isFinite(n)) maxDisplay = n;
      }
      setSettings({
        ...(s as AchievementSettings),
        banner_enabled: s.banner_enabled === true || s.banner_enabled === 1 || s.banner_enabled === "1",
        slide_duration: slide,
        max_display_count: maxDisplay,
        banner_theme: (() => {
          const rawTheme =
            typeof (s as { banner_theme?: unknown }).banner_theme === "string"
              ? String((s as { banner_theme?: unknown }).banner_theme).toLowerCase()
              : "";
          if (rawTheme === "theme2" || rawTheme === "tomato") return "theme2";
          return "default";
        })(),
      });
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = achievements.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.achievement_title.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (a: Achievement) => {
    setEditId(a.id);
    setForm({
      name: a.name,
      batch: a.batch || "",
      photo_url: a.photo_url || "",
      achievement_title: a.achievement_title,
      institution: a.institution || "",
      message: a.message || "",
      tag: a.tag || "",
      location: a.location || "",
      achievement_date: a.achievement_date || "",
      start_date: a.start_date ? a.start_date.slice(0, 16) : "",
      end_date: a.end_date ? a.end_date.slice(0, 16) : "",
      banner_photo_batch_text: a.banner_photo_batch_text ?? "",
      banner_photo_tagline: a.banner_photo_tagline ?? "",
      banner_congratulations_text: a.banner_congratulations_text ?? "",
      banner_theme:
        a.banner_theme === "theme2" || a.banner_theme === "tomato"
          ? "theme2"
          : "default",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.achievement_title) {
      toast({ title: "Name and Achievement Title are required", variant: "destructive" });
      return;
    }
    const bannerFields: { label: string; value: string }[] = [
      { label: "Achievement title", value: form.achievement_title },
      { label: "Message", value: form.message },
      { label: "Batch line on image", value: form.banner_photo_batch_text },
      { label: "Alumni line on image", value: form.banner_photo_tagline },
      { label: "Congratulations heading", value: form.banner_congratulations_text },
    ];
    for (const { label, value } of bannerFields) {
      if (countWords(value) > BANNER_MAX_WORDS) {
        toast({
          title: "Word limit exceeded",
          description: `${label} must be at most ${BANNER_MAX_WORDS} words.`,
          variant: "destructive",
        });
        return;
      }
    }
    setLoading(true);
    const payload = {
      name: form.name,
      batch: form.batch || null,
      photo_url: form.photo_url || null,
      achievement_title: form.achievement_title,
      institution: form.institution || null,
      message: form.message || null,
      tag: form.tag || null,
      location: form.location || null,
      achievement_date: form.achievement_date || null,
      start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
      end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
      updated_at: new Date().toISOString(),
      banner_photo_batch_text: form.banner_photo_batch_text.trim() || null,
      banner_photo_tagline: form.banner_photo_tagline.trim() || null,
      banner_congratulations_text: form.banner_congratulations_text.trim() || null,
      banner_theme: form.banner_theme,
    };

    const readErr = async (res: Response) => {
      try {
        const j = await res.json();
        return (j && typeof j === "object" && "error" in j && (j as { error?: string }).error) || res.statusText;
      } catch {
        return res.statusText;
      }
    };

    if (editId) {
      const res = await fetch(`${API_BASE_URL}/api/admin/achievements/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        toast({ title: "Error updating", description: String(await readErr(res)), variant: "destructive" });
      } else {
        toast({ title: "Achievement updated" });
      }
    } else {
      const res = await fetch(`${API_BASE_URL}/api/admin/achievements`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...payload, display_order: achievements.length }),
      });
      if (!res.ok) {
        toast({ title: "Error creating", description: String(await readErr(res)), variant: "destructive" });
      } else {
        toast({ title: "Achievement created" });
      }
    }
    setLoading(false);
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this achievement?")) return;
    await fetch(`${API_BASE_URL}/api/admin/achievements/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    toast({ title: "Achievement deleted" });
    fetchData();
  };

  const toggleActive = async (a: Achievement) => {
    await fetch(`${API_BASE_URL}/api/admin/achievements/${a.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_active: !a.is_active }),
    });
    fetchData();
  };

  const togglePin = async (a: Achievement) => {
    await fetch(`${API_BASE_URL}/api/admin/achievements/${a.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_pinned: !a.is_pinned }),
    });
    fetchData();
  };

  const moveOrder = async (a: Achievement, direction: "up" | "down") => {
    const idx = achievements.findIndex((x) => x.id === a.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= achievements.length) return;
    const other = achievements[swapIdx];
    await Promise.all([
      fetch(`${API_BASE_URL}/api/admin/achievements/${a.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ display_order: other.display_order }),
      }),
      fetch(`${API_BASE_URL}/api/admin/achievements/${other.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ display_order: a.display_order }),
      }),
    ]);
    fetchData();
  };

  const saveSettings = async () => {
    if (!settings) return;
    const res = await fetch(`${API_BASE_URL}/api/admin/achievement-settings/${settings.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        banner_enabled: settings.banner_enabled,
        slide_duration: settings.slide_duration,
        max_display_count: settings.max_display_count,
        banner_theme: settings.banner_theme || "default",
      }),
    });
    try {
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Could not save banner settings",
          description: (j as { error?: string })?.error || res.statusText,
          variant: "destructive",
        });
      } else {
        toast({ title: "Settings saved" });
      }
    } catch {
      if (!res.ok) toast({ title: "Could not save banner settings", variant: "destructive" });
      else toast({ title: "Settings saved" });
    }
  };

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Achievement Management</h1>
            <p className="text-sm text-muted-foreground">Manage alumni achievements and banner settings</p>
          </div>
        </div>

        <Tabs defaultValue="achievements">
          <TabsList>
            <TabsTrigger value="achievements" className="gap-1.5"><Award className="w-3.5 h-3.5" /> Achievements</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5"><Settings className="w-3.5 h-3.5" /> Banner Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="achievements" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search achievements..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Button size="sm" className="gap-1.5" onClick={openAdd}><Plus className="w-3.5 h-3.5" /> Add Achievement</Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Achievement</TableHead>
                      <TableHead>Tag</TableHead>
                      <TableHead>Theme</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No achievements found</TableCell></TableRow>
                    ) : filtered.map((a) => (
                      <TableRow key={a.id} className={cn(!a.is_active && "opacity-50")}>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <button onClick={() => moveOrder(a, "up")} className="text-muted-foreground hover:text-foreground"><ArrowUp className="w-3 h-3" /></button>
                            <button onClick={() => moveOrder(a, "down")} className="text-muted-foreground hover:text-foreground"><ArrowDown className="w-3 h-3" /></button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {a.photo_url && <img src={a.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />}
                            <div>
                              <span className="font-medium text-sm">{a.name}</span>
                              {a.batch && <span className="text-xs text-muted-foreground ml-1">({a.batch})</span>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{a.achievement_title}</TableCell>
                        <TableCell>{a.tag && <Badge variant="outline" className="text-xs">{a.tag}</Badge>}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {a.banner_theme === "tomato"
                              ? "Theme 2"
                              : a.banner_theme === "theme2"
                                ? "Theme 2"
                                : "Default"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch checked={Boolean(a.is_active)} onCheckedChange={() => toggleActive(a)} />
                            <button onClick={() => togglePin(a)} className={cn("p-1 rounded", a.is_pinned ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                              <Pin className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}><Pencil className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(a.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            {!settings ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground space-y-3">
                  <p>Banner settings could not be loaded. Ensure you are logged in as admin and the database has the achievement_settings table.</p>
                  <Button type="button" variant="outline" onClick={() => fetchData()}>
                    Retry
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader><CardTitle className="text-lg">Banner Settings</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Banner Enabled</Label>
                      <p className="text-xs text-muted-foreground">Show achievement banner on landing page</p>
                    </div>
                    <Switch
                      checked={Boolean(settings.banner_enabled)}
                      onCheckedChange={(v) => setSettings({ ...settings, banner_enabled: v })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Slide Duration (seconds)</Label>
                      <Select value={String(settings.slide_duration)} onValueChange={(v) => setSettings({ ...settings, slide_duration: Number(v) })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 seconds</SelectItem>
                          <SelectItem value="4">4 seconds (default)</SelectItem>
                          <SelectItem value="5">5 seconds</SelectItem>
                          <SelectItem value="7">7 seconds</SelectItem>
                          <SelectItem value="10">10 seconds</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Banner Color Theme</Label>
                      <Select
                        value={settings.banner_theme || "default"}
                        onValueChange={(v) =>
                          setSettings({
                            ...settings,
                            banner_theme: v === "theme2" ? "theme2" : "default",
                          })
                        }
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default (current)</SelectItem>
                          <SelectItem value="theme2">Theme 2</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Default stays unchanged unless you switch it.</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Max Display Count</Label>
                      <Input
                        type="number"
                        placeholder="All (leave empty)"
                        value={settings.max_display_count ?? ""}
                        onChange={(e) => setSettings({ ...settings, max_display_count: e.target.value ? Number(e.target.value) : null })}
                      />
                      <p className="text-xs text-muted-foreground">Leave empty to show all</p>
                    </div>
                  </div>
                  <Button onClick={saveSettings}>Save Settings</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "Edit" : "Add"} Achievement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Batch</Label>
                  <Input value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Achievement Title *</Label>
                <Input
                  value={form.achievement_title}
                  onChange={(e) =>
                    setForm({ ...form, achievement_title: clampToWordLimit(e.target.value, BANNER_MAX_WORDS) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {countWords(form.achievement_title)} / {BANNER_MAX_WORDS} words (banner)
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Banner Theme (This Post)</Label>
                <Select
                  value={form.banner_theme}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      banner_theme: v === "theme2" ? "theme2" : "default",
                    })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="theme2">Theme 2</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Applies only to this banner post. You can mix different themes across posts.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Institution / Company</Label>
                <Input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Photo</Label>
                <div className="flex items-center gap-3">
                  {form.photo_url ? (
                    <div className="relative">
                      <img
                        src={form.photo_url}
                        alt="Preview"
                        className="h-14 w-[89px] rounded-md border border-border object-cover sm:h-16 sm:w-[102px]"
                        style={{ aspectRatio: "8 / 5" }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setForm({ ...form, photo_url: "" });
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border border-dashed border-border">
                      <Upload className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 space-y-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {uploading ? "Uploading..." : form.photo_url ? "Change Photo" : "Upload Photo"}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoFileChosen}
                    />
                    <p className="text-xs text-muted-foreground">Choose a photo, then crop to the banner frame (8∶5). Source up to 8MB; upload must stay under 2MB.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-sm font-semibold text-foreground">Banner — text on photo</p>
                <p className="text-xs text-muted-foreground">
                  Shown on the bottom of the left banner image (highlighted). Batch field above is still used if the batch line below is empty.
                </p>
                <div className="space-y-1.5">
                  <Label>Batch line on image (optional)</Label>
                  <Input
                    value={form.banner_photo_batch_text}
                    onChange={(e) =>
                      setForm({ ...form, banner_photo_batch_text: clampToWordLimit(e.target.value, BANNER_MAX_WORDS) })
                    }
                    placeholder='e.g. "Batch 2018 — Science" — leave empty to use "Batch of …" from Batch field'
                  />
                  <p className="text-xs text-muted-foreground">
                    {countWords(form.banner_photo_batch_text)} / {BANNER_MAX_WORDS} words
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Alumni line on image</Label>
                  <Input
                    value={form.banner_photo_tagline}
                    onChange={(e) =>
                      setForm({ ...form, banner_photo_tagline: clampToWordLimit(e.target.value, BANNER_MAX_WORDS) })
                    }
                    placeholder={BANNER_DEFAULT_PHOTO_TAGLINE}
                  />
                  <p className="text-xs text-muted-foreground">
                    {countWords(form.banner_photo_tagline)} / {BANNER_MAX_WORDS} words — leave empty for default:{" "}
                    <span className="font-medium text-foreground">{BANNER_DEFAULT_PHOTO_TAGLINE}</span>
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Congratulations heading (banner)</Label>
                  <Input
                    value={form.banner_congratulations_text}
                    onChange={(e) =>
                      setForm({ ...form, banner_congratulations_text: clampToWordLimit(e.target.value, BANNER_MAX_WORDS) })
                    }
                    placeholder='e.g. "Well Done!" — leave empty to use "Congratulations"'
                  />
                  <p className="text-xs text-muted-foreground">
                    {countWords(form.banner_congratulations_text)} / {BANNER_MAX_WORDS} words — leave empty for default:{" "}
                    <span className="font-medium text-foreground">Congratulations</span>
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Message (congratulations)</Label>
                <Textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: clampToWordLimit(e.target.value, BANNER_MAX_WORDS) })}
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  {countWords(form.message)} / {BANNER_MAX_WORDS} words (banner)
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tag</Label>
                  <Select value={form.tag} onValueChange={(v) => setForm({ ...form, tag: v })}>
                    <SelectTrigger><SelectValue placeholder="Select tag" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New Job">New Job</SelectItem>
                      <SelectItem value="Scholarship">Scholarship</SelectItem>
                      <SelectItem value="Award">Award</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Location</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Achievement Date</Label>
                <Input type="date" value={form.achievement_date} onChange={(e) => setForm({ ...form, achievement_date: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Schedule Start</Label>
                  <Input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Schedule End</Label>
                  <Input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              <Button onClick={handleSave} disabled={loading} className="w-full">
                {loading ? "Saving..." : editId ? "Update Achievement" : "Create Achievement"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <AchievementPhotoCropDialog
          open={cropDialogOpen}
          imageSrc={cropImageSrc}
          onOpenChange={handleCropDialogOpenChange}
          onCropped={uploadPhotoBlob}
        />
      </div>
    </>
  );
};

export default AdminAchievements;
