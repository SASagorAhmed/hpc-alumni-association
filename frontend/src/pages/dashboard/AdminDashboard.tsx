import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Vote, Award, CalendarDays, FileText, Bell, Shield, Settings, ClipboardList, UserCheck, Trophy, FolderOpen, ScrollText } from "lucide-react";


const AdminDashboard = () => {
  const { user } = useAuth();

  const stats = [
    { label: "Total Users", value: "0", icon: Users, color: "bg-primary/10 text-primary" },
    { label: "Verified Users", value: "0", icon: UserCheck, color: "bg-primary/10 text-primary" },
    { label: "Pending Users", value: "0", icon: ClipboardList, color: "bg-accent/20 text-accent-foreground" },
    { label: "Blocked Users", value: "0", icon: Shield, color: "bg-destructive/10 text-destructive" },
    { label: "Active Events", value: "0", icon: CalendarDays, color: "bg-primary/10 text-primary" },
    { label: "Donation Campaigns", value: "0", icon: Bell, color: "bg-accent/20 text-accent-foreground" },
  ];

  const quickActions = [
    { label: "Add Notice", href: "/admin/notices", icon: FileText },
    { label: "Add Event", href: "/admin/events", icon: CalendarDays },
    { label: "Add Achievement", href: "/admin/achievements", icon: Award },
    { label: "Create Election", href: "/admin/elections", icon: Vote },
  ];

  const modules = [
    { icon: Users, label: "Users", href: "/admin/users", desc: "Manage all users" },
    { icon: Shield, label: "Committee", href: "/admin/committee", desc: "Manage committee" },
    { icon: Vote, label: "Elections", href: "/admin/elections", desc: "Manage elections" },
    { icon: ClipboardList, label: "Candidates", href: "/admin/candidates", desc: "Manage candidates" },
    { icon: Trophy, label: "Winners", href: "/admin/winners", desc: "Publish winners" },
    { icon: Award, label: "Achievements", href: "/admin/achievements", desc: "Alumni achievements" },
    { icon: CalendarDays, label: "Events", href: "/admin/events", desc: "Manage events" },
    { icon: Bell, label: "Donations", href: "/admin/donations", desc: "Donation campaigns" },
    { icon: FileText, label: "Notices", href: "/admin/notices", desc: "Manage notices" },
    { icon: FolderOpen, label: "Documents", href: "/admin/documents", desc: "File management" },
    { icon: ScrollText, label: "Audit Logs", href: "/admin/audit-logs", desc: "Activity history" },
    { icon: Settings, label: "Settings", href: "/admin/settings", desc: "System config" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
        {/* Welcome + Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Welcome, Admin</h1>
            <p className="text-muted-foreground text-sm">Full system control and management</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickActions.map(({ label, href, icon: Icon }) => (
              <Link key={label} to={href}>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  <Icon className="w-3.5 h-3.5" /> {label}
                </Button>
              </Link>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="p-4 text-center">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-[11px] text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Management Modules */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Management Modules</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {modules.map(({ icon: Icon, label, href, desc }) => (
              <Link key={label} to={href}>
                <Card className="hover:shadow-card-hover transition-shadow h-full cursor-pointer">
                  <CardContent className="p-4">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-medium text-sm text-foreground">{label}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
    </div>
  );
};

export default AdminDashboard;
