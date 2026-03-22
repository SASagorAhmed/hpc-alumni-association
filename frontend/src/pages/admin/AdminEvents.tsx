import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Eye, EyeOff, Megaphone, CalendarDays, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  useAllEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useAutoCreateNotice,
  type EventRow,
  type EventInput,
} from "@/hooks/useEvents";
import { getEventStatus } from "@/components/events/CountdownTimer";
import EventFormDialog from "@/components/events/EventFormDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statusBadge: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  published: { label: "Published", className: "bg-primary/10 text-primary border-primary/20" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const AdminEvents = () => {
  const { data: events = [], isLoading } = useAllEvents();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const autoNotice = useAutoCreateNotice();

  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleSave = async (data: EventInput & { id?: string }) => {
    const wasPublishing = data.status === "published";
    if (data.id) {
      await updateEvent.mutateAsync({ ...data, id: data.id });
    } else {
      await createEvent.mutateAsync(data);
      // Auto-create notice on publish
      if (wasPublishing) {
        await autoNotice.mutateAsync({
          title: data.title,
          description: data.description,
          event_date: data.event_date,
        });
        toast.info("Notice auto-created for this event");
      }
    }
    setFormOpen(false);
    setEditingEvent(null);
  };

  const handlePublishToggle = async (event: EventRow) => {
    const newStatus = event.status === "published" ? "draft" : "published";
    await updateEvent.mutateAsync({ id: event.id, title: event.title, status: newStatus });
    if (newStatus === "published") {
      await autoNotice.mutateAsync({
        title: event.title,
        description: event.description || undefined,
        event_date: event.event_date || undefined,
      });
      toast.info("Notice auto-created for this event");
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteEvent.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Event Management</h1>
          <p className="text-sm text-muted-foreground">Create and manage alumni events</p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => { setEditingEvent(null); setFormOpen(true); }}
        >
          <Plus className="w-3.5 h-3.5" /> Add Event
        </Button>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground text-center">Loading events...</p></CardContent></Card>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CalendarDays className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No events yet. Create your first event!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const computed = event.status === "cancelled" ? "cancelled" : event.status === "published" ? getEventStatus(event.start_time, event.end_time) : "draft";
            const badge = statusBadge[event.status] || statusBadge.draft;

            return (
              <Card key={event.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    {event.banner_url && (
                      <div className="sm:w-36 h-28 sm:h-auto shrink-0">
                        <img src={event.banner_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">{event.title}</h3>
                          <Badge variant="outline" className={`shrink-0 text-[11px] ${badge.className}`}>
                            {badge.label}
                          </Badge>
                          {computed === "live" && (
                            <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[11px] animate-pulse">Live</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {event.event_date && (
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3 h-3" />
                              {format(new Date(event.event_date), "dd MMM yyyy")}
                            </span>
                          )}
                          {event.start_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(event.start_time), "hh:mm a")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title={event.status === "published" ? "Unpublish" : "Publish"}
                          onClick={() => handlePublishToggle(event)}
                        >
                          {event.status === "published" ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => { setEditingEvent(event); setFormOpen(true); }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(event.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <EventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        event={editingEvent}
        onSave={handleSave}
        loading={createEvent.isPending || updateEvent.isPending}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this event.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminEvents;
