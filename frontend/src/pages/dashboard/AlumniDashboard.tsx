import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { CalendarDays, Vote, AlertCircle, Megaphone, MapPin, Pin, AlertTriangle } from "lucide-react";

import AchievementBanner from "@/components/landing/AchievementBanner";
import CommitteeSection from "@/components/landing/CommitteeSection";
import AchievementsSection from "@/components/landing/AchievementsSection";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from "@/api-production/api.js";
import { cachedJsonFetch } from "@/lib/requestCache";
import { saveNavScrollRestore } from "@/lib/navScrollRestore";
import AutoRepairBoundary from "@/components/ui/AutoRepairBoundary";

interface Notice {
  id: string;
  title: string;
  content: string | null;
  created_at: string | null;
}

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  start_time: string | null;
  location: string | null;
  status: string;
}

const AlumniDashboard = () => {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      // Avoid a full skeleton flash when cache resolves quickly.
      const showLoadingTimer = window.setTimeout(() => {
        if (!cancelled) setDashboardLoading(true);
      }, 120);
      try {
        const [noticesData, eventsData] = await Promise.all([
          cachedJsonFetch<Notice[]>({
            cacheKey: "alumni:dashboard:notices",
            url: `${API_BASE_URL}/api/public/notices?limit=5`,
            ttlMs: 45_000,
          }),
          cachedJsonFetch<Event[]>({
            cacheKey: "alumni:dashboard:events",
            url: `${API_BASE_URL}/api/public/events?status=published&limit=10`,
            ttlMs: 45_000,
          }),
        ]);

        if (!cancelled && Array.isArray(noticesData)) setNotices(noticesData as Notice[]);

        if (!cancelled && Array.isArray(eventsData)) {
          const now = new Date();
          const upcoming = (eventsData as Event[]).filter((e) => {
            // Show event if end_time hasn't passed, or start_time hasn't passed, or event_date is today or future
            const ref = e.start_time || e.event_date;
            if (!ref) return true;
            // Use end of day for event_date comparison
            const refDate = new Date(ref);
            return refDate >= now || (e.event_date && new Date(e.event_date).toDateString() === now.toDateString());
          });
          setEvents(upcoming.slice(0, 5));
        }
      } finally {
        window.clearTimeout(showLoadingTimer);
        if (!cancelled) setDashboardLoading(false);
      }
    };
    void fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back, {user?.name}!</h1>
          <p className="text-muted-foreground text-sm">Stay updated with alumni activities and announcements.</p>
          {user?.profilePending && (
            <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent/20 border border-accent text-sm text-accent-foreground">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Your profile update is awaiting admin approval.
            </div>
          )}
        </div>

        {/* Notices & Events */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-primary" /> Latest Notices
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3.5 pb-3.5 sm:px-4 sm:pb-4">
              {dashboardLoading ? (
                <div className="space-y-3">
                  <div className="h-20 animate-pulse rounded-lg border border-border bg-muted/35" />
                  <div className="h-20 animate-pulse rounded-lg border border-border bg-muted/35" />
                </div>
              ) : notices.length > 0 ? (
                <div className="space-y-3">
                  {notices.map((n) => (
                    <Link
                      to={`/notices/${n.id}`}
                      key={n.id}
                      className="block p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/30 transition-colors"
                      onClick={() => saveNavScrollRestore()}
                    >
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-foreground">{n.title}</h4>
                        {(n as any).pinned && <Badge variant="secondary" className="text-[9px] gap-0.5"><Pin className="w-2.5 h-2.5" />Pinned</Badge>}
                        {(n as any).urgent && <Badge variant="destructive" className="text-[9px] gap-0.5"><AlertTriangle className="w-2.5 h-2.5" />Urgent</Badge>}
                      </div>
                      {n.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.content}</p>}
                      {n.created_at && (
                        <p className="text-xs text-muted-foreground mt-1.5">{format(new Date(n.created_at), "dd MMM yyyy")}</p>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="h-32 rounded-lg bg-muted flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">No notices available</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" /> Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3.5 pb-3.5 sm:px-4 sm:pb-4">
              {dashboardLoading ? (
                <div className="space-y-3">
                  <div className="h-20 animate-pulse rounded-lg border border-border bg-muted/35" />
                  <div className="h-20 animate-pulse rounded-lg border border-border bg-muted/35" />
                </div>
              ) : events.length > 0 ? (
                <div className="space-y-3">
                  {events.map((e) => (
                    <Link
                      to={`/events/${e.id}`}
                      key={e.id}
                      className="block p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/30 transition-colors"
                      onClick={() => saveNavScrollRestore()}
                    >
                      <h4 className="text-sm font-medium text-foreground">{e.title}</h4>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        {e.event_date && (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {format(new Date(e.event_date), "dd MMM yyyy")}
                          </span>
                        )}
                        {e.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {e.location}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="h-32 rounded-lg bg-muted flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">No upcoming events</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Achievement Banner Slider */}
        <div className="rounded-2xl border border-border p-0 overflow-hidden">
          <AutoRepairBoundary title="Achievement banner">
            <AchievementBanner embedded />
          </AutoRepairBoundary>
        </div>

        {/* Executive Committee */}
        <div className="rounded-2xl border border-border p-0 overflow-hidden">
          <AutoRepairBoundary title="Committee section">
            <CommitteeSection embedded />
          </AutoRepairBoundary>
        </div>

        {/* Achievements of Our Alumni */}
        <div className="rounded-2xl border border-border p-0 overflow-hidden">
          <AutoRepairBoundary title="Achievements section">
            <AchievementsSection embedded />
          </AutoRepairBoundary>
        </div>

        {/* Election Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Vote className="w-4 h-4 text-primary" /> Election Status
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3.5 pb-3.5 sm:px-4 sm:pb-4">
              <div className="h-32 rounded-lg bg-muted flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No active elections</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  );
};

export default AlumniDashboard;
