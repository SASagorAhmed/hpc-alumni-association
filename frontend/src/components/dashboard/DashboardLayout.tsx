import { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminViewAsAlumni } from "@/contexts/AdminViewAsAlumniContext";
import hpcLogo from "@/assets/hpc-logo.png";
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Users,
  Vote,
  Award,
  CalendarDays,
  FileText,
  Bell,
  FolderOpen,
  User,
  Shield,
  Settings,
  ClipboardList,
  UserCheck,
  Trophy,
  ScrollText,
  ChevronDown,
  Home,
  GraduationCap,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import TopNoticeBar from "@/components/notices/TopNoticeBar";
import ActiveElectionBanner from "@/components/elections/ActiveElectionBanner";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";
import AutoRepairBoundary from "@/components/ui/AutoRepairBoundary";

const SIDEBAR_OPEN_KEY = "hpc_layout_dashboard_sidebar_open";

function readSidebarOpenFromSession(): boolean {
  try {
    return sessionStorage.getItem(SIDEBAR_OPEN_KEY) === "1";
  } catch {
    return false;
  }
}

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

const alumniMenu = [
  { icon: Home, label: "Home", href: "/" },
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "Committee", href: "/committee" },
  { icon: UserCheck, label: "Directory", href: "/directory" },
  { icon: Vote, label: "Elections", href: "/elections" },
  { icon: CalendarDays, label: "Events", href: "/events" },
  { icon: Bell, label: "Donations", href: "/donations" },
  { icon: FileText, label: "Notices", href: "/notices" },
  { icon: FolderOpen, label: "Documents", href: "/documents" },
  { icon: User, label: "Profile", href: "/profile" },
];

const adminMenu = [
  { icon: Home, label: "Home", href: "/" },
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin/dashboard" },
  { icon: Users, label: "Users", href: "/admin/users" },
  { icon: Settings, label: "Settings", href: "/admin/settings" },
  { icon: Shield, label: "Committee", href: "/admin/committee" },
  { icon: Vote, label: "Elections", href: "/admin/elections" },
  { icon: ClipboardList, label: "Candidates", href: "/admin/candidates" },
  { icon: Trophy, label: "Winners", href: "/admin/winners" },
  { icon: Award, label: "Achievements", href: "/admin/achievements" },
  { icon: CalendarDays, label: "Events", href: "/admin/events" },
  { icon: Bell, label: "Donations", href: "/admin/donations" },
  { icon: FileText, label: "Notices", href: "/admin/notices" },
  { icon: FolderOpen, label: "Documents", href: "/admin/documents" },
  { icon: ScrollText, label: "Audit Logs", href: "/admin/audit-logs" },
  { icon: LayoutDashboard, label: "Landing Page", href: "/admin/landing-editor" },
  { icon: Award, label: "Memories", href: "/admin/memories" },
];

const SidebarContent = ({
  menu,
  isActive,
  user,
  logout,
  onNavigate,
  showClose,
  dashboardHref,
  panelSubtitle,
}: {
  menu: typeof alumniMenu;
  isActive: (href: string) => boolean;
  user: any;
  logout: () => void;
  onNavigate?: () => void;
  showClose?: boolean;
  dashboardHref: string;
  panelSubtitle: string;
}) => (
  <>
    <div
      className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-2"
      style={{ background: "var(--theme-navbar-bg)" }}
    >
      <Link to={dashboardHref} onClick={onNavigate} className="flex min-w-0 items-center gap-1.5">
        <img src={hpcLogo} alt="HPC Logo" className="h-7 w-7 shrink-0 rounded-full shadow-sm ring-1 ring-[hsl(43,96%,56%)]/50" />
        <div className="min-w-0 leading-none">
          <span className="block truncate text-[10px] font-bold tracking-tight text-white">HPCAA</span>
          <span className="mt-px block truncate text-[7px] font-semibold uppercase tracking-wide" style={{ color: "hsl(43, 96%, 56%)" }}>
            {panelSubtitle}
          </span>
        </div>
      </Link>
      {showClose && (
        <button onClick={onNavigate} className="shrink-0 rounded p-0.5 hover:bg-muted/50 transition-colors duration-300">
          <X className="h-3.5 w-3.5 text-white" />
        </button>
      )}
    </div>
    <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
      <ul className="space-y-1">
        {menu.map(({ icon: Icon, label, href }) => (
          <li key={href}>
            <Link
              to={href}
              onClick={onNavigate}
              className={`flex items-center gap-2 px-2.5 py-2 sm:gap-2.5 sm:px-3 sm:py-2.5 rounded-lg text-[12px] sm:text-[13px] lg:text-[14px] transition-all duration-300 ease-in-out ${
                isActive(href)
                  ? "text-primary font-semibold bg-primary/10 border-l-4 border-primary"
                  : "text-muted-foreground font-medium hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon
                className={`h-4 w-4 sm:h-[17px] sm:w-[17px] lg:h-[18px] lg:w-[18px] shrink-0 ${
                  isActive(href) ? "text-primary" : "text-muted-foreground"
                }`}
              />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
    <div className="sticky bottom-0 mt-auto border-t border-border bg-sidebar px-3 py-3">
      <button
        onClick={() => { logout(); onNavigate?.(); }}
        className="flex items-center gap-2 px-2.5 py-2 sm:gap-2.5 sm:px-3 sm:py-2.5 rounded-lg text-[12px] sm:text-[13px] lg:text-[14px] font-medium bg-red-600 text-white hover:bg-red-700 transition-colors w-full"
      >
        <LogOut className="h-4 w-4 sm:h-[17px] sm:w-[17px] lg:h-[18px] lg:w-[18px]" />
        Logout
      </button>
    </div>
  </>
);

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const showThemeToggle = false; // Match public Navbar / floating toggle — keep code, hidden for now.
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarOpenFromSession);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { viewAsAlumni, setViewAsAlumni } = useAdminViewAsAlumni();
  /**
   * After turning preview ON we still briefly sit on /admin/*. Stays true until we're on a non-admin path.
   */
  const pendingAlumniNavigationRef = useRef(false);
  /**
   * False until we've left the /admin tree once with preview on. First /admin segment redirects to /dashboard
   * (covers refresh); a later /admin visit while preview stays on exits preview (e.g. Settings link).
   */
  const alumniPreviewDidLeaveAdminTreeRef = useRef(false);

  useEffect(() => {
    try {
      sessionStorage.setItem(SIDEBAR_OPEN_KEY, sidebarOpen ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [sidebarOpen]);

  const isAdmin = user?.role === "admin";
  const useAlumniShell = !isAdmin || viewAsAlumni;
  const menu = useAlumniShell ? alumniMenu : adminMenu;
  const dashboardHref = useAlumniShell ? "/dashboard" : "/admin/dashboard";
  const panelSubtitle =
    isAdmin && viewAsAlumni ? "Alumni view (preview)" : isAdmin ? "Admin Panel" : "Alumni Association";

  useEffect(() => {
    if (!isAdmin) return;
    if (!viewAsAlumni) {
      pendingAlumniNavigationRef.current = false;
      alumniPreviewDidLeaveAdminTreeRef.current = false;
      return;
    }
    if (!location.pathname.startsWith("/admin")) {
      pendingAlumniNavigationRef.current = false;
      alumniPreviewDidLeaveAdminTreeRef.current = true;
      return;
    }

    if (!alumniPreviewDidLeaveAdminTreeRef.current) {
      alumniPreviewDidLeaveAdminTreeRef.current = true;
      pendingAlumniNavigationRef.current = true;
      navigate("/dashboard", { replace: true });
      return;
    }
    if (pendingAlumniNavigationRef.current) {
      return;
    }
    setViewAsAlumni(false);
  }, [isAdmin, viewAsAlumni, location.pathname, setViewAsAlumni, navigate]);

  const onViewAsAlumniChange = (checked: boolean) => {
    if (checked) {
      pendingAlumniNavigationRef.current = true;
      flushSync(() => setViewAsAlumni(true));
      navigate("/dashboard", { replace: true });
    } else {
      pendingAlumniNavigationRef.current = false;
      setViewAsAlumni(false);
      navigate("/admin/dashboard", { replace: true });
    }
  };

  const isActive = (href: string) => {
    if (location.pathname === href) return true;
    if (href === "/" || !href) return false;
    const base = href.endsWith("/") ? href.slice(0, -1) : href;
    return location.pathname.startsWith(`${base}/`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Backdrop for outside click */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Fixed Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 flex h-screen flex-col overflow-hidden border-r border-border/80 bg-sidebar transition-all duration-300 ease-in-out ${
          sidebarOpen ? "w-[55vw] lg:w-64" : "w-0"
        }`}
      >
        <div className="h-full w-full min-w-0 flex flex-col">
          <SidebarContent
            menu={menu}
            isActive={isActive}
            user={user}
            logout={logout}
            showClose={sidebarOpen}
            onNavigate={() => setSidebarOpen(false)}
            dashboardHref={dashboardHref}
            panelSubtitle={panelSubtitle}
          />
        </div>
      </aside>

      {/* Main wrapper: keep mobile as overlay (no push), keep desktop push for wide view */}
      <div
        className={`flex min-h-screen flex-col transition-[margin] duration-300 ease-in-out ${
          sidebarOpen ? "ml-0 lg:ml-64" : "ml-0"
        }`}
      >
        <div className="flex flex-col min-h-screen">
          {/* Fixed Header */}
          <header
            className="sticky top-0 z-30 flex h-10 items-center justify-between border-b border-white/[0.07] px-1.5 lg:px-3"
            style={{
              background: "var(--theme-header-bg)",
            }}
          >
            <div className="flex min-w-0 items-center gap-1">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="rounded p-1.5 sm:p-1 md:p-0.5 hover:bg-gray-900/10"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5 sm:h-4 sm:w-4 md:h-3.5 md:w-3.5 text-white" />
                </button>
              )}
              <h1 className="hidden truncate text-[12px] font-semibold leading-tight text-white sm:block">
                {menu.find((m) => isActive(m.href))?.label || "Dashboard"}
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {isAdmin ? (
                <div
                  className="flex items-center gap-1.5 rounded-md border border-white/25 bg-black/25 px-1.5 py-0.5 sm:px-2 shadow-sm"
                  title="See the same sidebar and pages as alumni (your account stays an admin)"
                >
                  <GraduationCap className="h-3 w-3 text-amber-300 shrink-0 hidden sm:block" />
                  <Label htmlFor="view-as-alumni" className="text-[10px] text-white cursor-pointer whitespace-nowrap hidden md:inline">
                    View as alumni
                  </Label>
                  <Switch
                    id="view-as-alumni"
                    checked={viewAsAlumni}
                    onCheckedChange={onViewAsAlumniChange}
                    className="scale-[0.65] sm:scale-75 origin-center border border-white/20 data-[state=unchecked]:bg-white/15 data-[state=checked]:bg-amber-500 [&>span]:bg-white"
                    aria-label="View as alumni"
                  />
                </div>
              ) : null}
              {showThemeToggle ? (
                <ThemeToggle
                  rootClassName="shrink-0"
                  buttonClassName="!h-6 !w-6 min-h-0 border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                  iconClassName="!h-3 !w-3 !text-white"
                />
              ) : null}
              <div className="shrink-0">
                <NotificationDropdown compact />
              </div>

              {/* Profile dropdown */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-0.5 rounded px-0.5 py-0.5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                    <User className="h-2.5 w-2.5 text-white" />
                  </div>
                  <span className="hidden max-w-[92px] truncate text-[10px] font-medium text-white sm:block">
                    {user?.name}
                  </span>
                  <ChevronDown className="hidden h-2 w-2 text-white/60 sm:block" />
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-card-hover z-50 py-1"
                      >
                        <Link
                          to="/profile"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-[13px] text-foreground hover:bg-secondary transition-colors"
                        >
                          <User className="w-4 h-4" /> My Profile
                        </Link>
                        {user?.role === "admin" && (
                          <Link
                            to="/admin/settings"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2 px-4 py-2.5 text-[13px] text-foreground hover:bg-secondary transition-colors"
                          >
                            <Settings className="w-4 h-4" /> Settings
                          </Link>
                        )}
                        <div className="border-t border-border my-1" />
                        <button
                          onClick={() => { logout(); setProfileOpen(false); }}
                          className="flex items-center gap-2 px-4 py-2.5 text-[13px] text-destructive hover:bg-destructive/10 transition-colors w-full"
                        >
                          <LogOut className="w-4 h-4" /> Logout
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Logout */}
              <button
                type="button"
                onClick={() => logout()}
                className="shrink-0 rounded p-0.5 hover:bg-white/10 transition-colors"
                title="Logout"
              >
                <LogOut className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
          </header>

          {/* Active Election Banner */}
          <ActiveElectionBanner />

          {/* Top Notice Bar */}
          <TopNoticeBar />

          {/* Page Content */}
          <main className="flex-1 p-4 lg:p-6">
            <AutoRepairBoundary title="Page content">
              {children ?? <Outlet />}
            </AutoRepairBoundary>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
