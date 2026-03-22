import { useParams, Link } from "react-router-dom";
import { useEvent } from "@/hooks/useEvents";
import CountdownTimer from "@/components/events/CountdownTimer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Clock, MapPin, Globe, ExternalLink, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { getEventStatus } from "@/components/events/CountdownTimer";

const statusConfig: Record<string, { label: string; className: string }> = {
  upcoming: { label: "Upcoming", className: "bg-primary/10 text-primary border-primary/20" },
  live: { label: "Live Now", className: "bg-red-500/10 text-red-600 border-red-500/20 animate-pulse" },
  completed: { label: "Completed", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: event, isLoading, error } = useEvent(id || "");

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-sm text-muted-foreground">Loading event...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-sm text-destructive">Event not found</p>
        <Link to="/events" className="text-sm text-primary hover:underline mt-2 inline-block">← Back to Events</Link>
      </div>
    );
  }

  const computedStatus = event.status === "cancelled"
    ? "cancelled"
    : getEventStatus(event.start_time, event.end_time);
  const config = statusConfig[computedStatus] || statusConfig.upcoming;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link to="/events" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Events
      </Link>

      {/* Banner */}
      {event.banner_url && (
        <div className="rounded-xl overflow-hidden border border-border">
          <img src={event.banner_url} alt={event.title} className="w-full h-48 sm:h-64 object-cover" />
        </div>
      )}

      {/* Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{event.title}</h1>
        </div>
        <Badge variant="outline" className={`shrink-0 ${config.className}`}>{config.label}</Badge>
      </div>

      {/* Countdown */}
      {computedStatus !== "cancelled" && (
        <CountdownTimer startTime={event.start_time} endTime={event.end_time} />
      )}

      {/* Details */}
      <Card>
        <CardContent className="p-5 space-y-4">
          {/* Meta */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {event.event_date && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4" />
                {format(new Date(event.event_date), "EEEE, dd MMMM yyyy")}
              </span>
            )}
            {event.start_time && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {format(new Date(event.start_time), "hh:mm a")}
                {event.end_time && ` – ${format(new Date(event.end_time), "hh:mm a")}`}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {event.location}
              </span>
            )}
            {event.online_link && (
              <a
                href={event.online_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-primary hover:underline"
              >
                <Globe className="w-4 h-4" />
                Join Online
              </a>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <div className="pt-2 border-t border-border">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{event.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registration */}
      {event.form_link && computedStatus !== "completed" && computedStatus !== "cancelled" && (
        <a href={event.form_link} target="_blank" rel="noopener noreferrer">
          <Button size="lg" className="w-full bg-gradient-hpc hover:opacity-90 text-primary-foreground font-semibold gap-2">
            <ExternalLink className="w-4 h-4" />
            Register for this Event
          </Button>
        </a>
      )}
    </div>
  );
};

export default EventDetail;
