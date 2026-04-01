import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Globe, Clock } from "lucide-react";
import { format } from "date-fns";
import { getEventStatus } from "./CountdownTimer";
import { Link } from "react-router-dom";
import { saveNavScrollRestore } from "@/lib/navScrollRestore";

interface EventCardProps {
  event: {
    id: string;
    title: string;
    description: string | null;
    event_date: string | null;
    start_time: string | null;
    end_time: string | null;
    location: string | null;
    online_link: string | null;
    banner_url: string | null;
    status: string;
  };
}

const statusConfig: Record<string, { label: string; className: string }> = {
  upcoming: { label: "Upcoming", className: "bg-primary/10 text-primary border-primary/20" },
  live: { label: "Live", className: "bg-red-500/10 text-red-600 border-red-500/20 animate-pulse" },
  completed: { label: "Completed", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const EventCard = ({ event }: EventCardProps) => {
  const computedStatus = event.status === "cancelled"
    ? "cancelled"
    : getEventStatus(event.start_time, event.end_time);
  const config = statusConfig[computedStatus] || statusConfig.upcoming;

  return (
    <Link to={`/events/${event.id}`} className="block group" onClick={() => saveNavScrollRestore()}>
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-md hover:border-primary/30">
        {event.banner_url && (
          <div className="h-40 overflow-hidden">
            <img
              src={event.banner_url}
              alt={event.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        )}
        <CardContent className={event.banner_url ? "p-4" : "p-5"}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
              {event.title}
            </h3>
            <Badge variant="outline" className={`shrink-0 text-[11px] ${config.className}`}>
              {config.label}
            </Badge>
          </div>
          {event.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{event.description}</p>
          )}
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
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {event.location}
              </span>
            )}
            {event.online_link && !event.location && (
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3" />
                Online Event
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default EventCard;
