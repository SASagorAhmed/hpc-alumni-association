import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";
import type { EventRow, EventInput } from "@/hooks/useEvents";

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: EventRow | null;
  onSave: (data: EventInput & { id?: string }) => void;
  loading?: boolean;
}

const STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "cancelled", label: "Cancelled" },
];

const EventFormDialog = ({ open, onOpenChange, event, onSave, loading }: EventFormDialogProps) => {
  const [form, setForm] = useState<EventInput>({
    title: "",
    description: "",
    event_date: "",
    start_time: "",
    end_time: "",
    location: "",
    online_link: "",
    form_link: "",
    banner_url: "",
    status: "draft",
  });

  useEffect(() => {
    if (event) {
      setForm({
        title: event.title,
        description: event.description || "",
        event_date: event.event_date ? event.event_date.split("T")[0] : "",
        start_time: event.start_time || "",
        end_time: event.end_time || "",
        location: event.location || "",
        online_link: event.online_link || "",
        form_link: event.form_link || "",
        banner_url: event.banner_url || "",
        status: event.status || "draft",
      });
    } else {
      setForm({ title: "", description: "", event_date: "", start_time: "", end_time: "", location: "", online_link: "", form_link: "", banner_url: "", status: "draft" });
    }
  }, [event, open]);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set("banner_url", reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    // Build proper ISO timestamps from date + time inputs
    const data: EventInput & { id?: string } = { ...form };
    if (event) data.id = event.id;

    // Combine event_date with time inputs for start_time/end_time
    if (form.event_date && form.start_time && !form.start_time.includes("T")) {
      data.start_time = new Date(`${form.event_date}T${form.start_time}`).toISOString();
    }
    if (form.event_date && form.end_time && !form.end_time.includes("T")) {
      data.end_time = new Date(`${form.event_date}T${form.end_time}`).toISOString();
    }

    onSave(data);
  };

  // Extract time from ISO string for input
  const displayStartTime = form.start_time?.includes("T")
    ? new Date(form.start_time).toTimeString().slice(0, 5)
    : form.start_time;
  const displayEndTime = form.end_time?.includes("T")
    ? new Date(form.end_time).toTimeString().slice(0, 5)
    : form.end_time;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? "Edit Event" : "Create Event"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Banner */}
          <div className="space-y-1.5">
            <Label>Banner Image</Label>
            {form.banner_url && (
              <img src={form.banner_url} alt="Banner" className="w-full h-36 object-cover rounded-lg border border-border" />
            )}
            <Input type="file" accept="image/*" onChange={handleBannerUpload} />
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Title *</Label>
              <Input maxLength={200} value={form.title} onChange={(e) => set("title", e.target.value)} required />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Description</Label>
              <Textarea maxLength={2000} rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
          </div>

          {/* Time */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Event Date</Label>
              <Input type="date" value={form.event_date} onChange={(e) => set("event_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Start Time</Label>
              <Input type="time" value={displayStartTime} onChange={(e) => set("start_time", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End Time</Label>
              <Input type="time" value={displayEndTime} onChange={(e) => set("end_time", e.target.value)} />
            </div>
          </div>

          {/* Location / Online */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Location (offline)</Label>
              <Input maxLength={300} placeholder="e.g. College Auditorium" value={form.location} onChange={(e) => set("location", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Online Link</Label>
              <Input maxLength={500} placeholder="Zoom/Meet link" value={form.online_link} onChange={(e) => set("online_link", e.target.value)} />
            </div>
          </div>

          {/* Registration & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Registration Form Link</Label>
              <Input maxLength={500} placeholder="Google Form URL" value={form.form_link} onChange={(e) => set("form_link", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full bg-gradient-hpc hover:opacity-90 text-primary-foreground font-semibold" disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Saving..." : event ? "Update Event" : "Create Event"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EventFormDialog;
