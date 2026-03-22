import { usePublishedEvents } from "@/hooks/useEvents";
import EventCard from "@/components/events/EventCard";
import { CalendarDays } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Events = () => {
  const { data: events = [], isLoading } = usePublishedEvents();

  const now = new Date();
  const upcoming = events.filter((e) => {
    if (e.status === "cancelled") return false;
    const endOrDate = e.end_time || e.start_time || e.event_date;
    return endOrDate ? new Date(endOrDate) >= now : true;
  });
  const past = events.filter((e) => {
    if (e.status === "cancelled") return false;
    const endOrDate = e.end_time || e.start_time || e.event_date;
    return endOrDate ? new Date(endOrDate) < now : false;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Events</h1>
        <p className="text-sm text-muted-foreground">Upcoming and past alumni events</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-12">Loading events...</p>
      ) : events.length === 0 ? (
        <div className="py-16 text-center">
          <CalendarDays className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No events available</p>
        </div>
      ) : (
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="mt-4">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No upcoming events</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcoming.map((e) => <EventCard key={e.id} event={e} />)}
              </div>
            )}
          </TabsContent>
          <TabsContent value="past" className="mt-4">
            {past.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No past events</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {past.map((e) => <EventCard key={e.id} event={e} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Events;
