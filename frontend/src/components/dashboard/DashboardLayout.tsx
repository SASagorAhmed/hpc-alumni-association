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
import { API_BASE_URL } from "@/api-production/api.js";
import { getAuthToken } from "@/lib/authToken";
import { primeJsonCache } from "@/lib/requestCache";
import { queryClient } from "@/lib/queryClient";
import { ALUMNI_DIRECTORY_STALE_MS, alumniDirectoryQueryKey, fetchAlumniDirectory } from "@/lib/publicDataQueries";
import { ACHIEVEMENT_BANNER_QUERY_KEY, fetchAchievementBannerData } from "@/hooks/useAchievementBannerData";
import { fetchLandingContent, LANDING_CONTENT_QUERY_KEY } from "@/hooks/useLandingContent";
import TopNoticeBar from "@/components/notices/TopNoticeBar";
import ActiveElectionBanner from "@/components/elections/ActiveElectionBanner";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";
import AutoRepairBoundary from "@/components/ui/AutoRepairBoundary";

const SIDEBAR_OPEN_KEY = "hpc_layout_dashboard_sidebar_open";
/** Alumni shell: tablet/desktop — slightly narrower rail when open (no expand control). */
const SIDEBAR_MD_UP_MQ = "(min-width: 768px)";

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
  onCloseSidebar,
  onPrefetchRoute,
  showClose,
  dashboardHref,
  panelSubtitle,
}: {
  menu: typeof alumniMenu;
  isActive: (href: string) => boolean;
  user: any;
  logout: () => void;
  /** Only the X button closes the sidebar (not nav, logo, or outside clicks). */
  onCloseSidebar?: () => void;
  onPrefetchRoute?: (href: string) => void;
  showClose?: boolean;
  dashboardHref: string;
  panelSubtitle: string;
}) => (
  <>
    <div
      className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-2"
      style={{ background: "var(--theme-navbar-bg)" }}
    >
      <Link to={dashboardHref} className="flex min-w-0 items-center gap-1.5">
        <img src={hpcLogo} alt="HPC Logo" className="h-7 w-7 shrink-0 rounded-full shadow-sm ring-1 ring-[hsl(43,96%,56%)]/50" />
        <div className="min-w-0 leading-none">
          <span className="block truncate text-[10px] font-bold tracking-tight text-white">HPCAA</span>
          <span className="mt-px block truncate text-[7px] font-semibold uppercase tracking-wide" style={{ color: "hsl(43, 96%, 56%)" }}>
            {panelSubtitle}
          </span>
        </div>
      </Link>
      <div className="flex shrink-0 items-center gap-0.5">
        {showClose && (
          <button
            type="button"
            onClick={onCloseSidebar}
            className="shrink-0 rounded p-0.5 hover:bg-muted/50 transition-colors duration-300"
            aria-label="Close menu"
          >
            <X className="h-3.5 w-3.5 text-white" aria-hidden />
          </button>
        )}
      </div>
    </div>
    <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
      <ul className="space-y-1">
        {menu.map(({ icon: Icon, label, href }) => (
          <li key={href}>
            <Link
              to={href}
              onPointerDown={() => onPrefetchRoute?.(href)}
              onMouseEnter={() => onPrefetchRoute?.(href)}
              onFocus={() => onPrefetchRoute?.(href)}
              onTouchStart={() => onPrefetchRoute?.(href)}
              className={`flex items-center gap-2 px-2.5 py-2 sm:gap-2.5 sm:px-3 sm:py-2.5 rounded-xl text-[12px] sm:text-[13px] lg:text-[14px] transition-all duration-300 ease-in-out ${
                isActive(href)
                  ? "text-primary font-semibold bg-primary/12 border-l-[3px] border-primary shadow-sm ring-1 ring-primary/10"
                  : "text-muted-foreground font-medium hover:bg-muted/80 hover:text-foreground hover:shadow-sm"
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
    <div className="mt-auto shrink-0 border-t border-sidebar-border/80 bg-sidebar px-3 py-3 shadow-[0_-8px_24px_-16px_hsl(var(--foreground)_/_0.06)]">
      <button
        type="button"
        onClick={() => {
          logout();
        }}
        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[12px] font-medium text-white shadow-md transition-all duration-200 hover:brightness-110 hover:shadow-lg active:scale-[0.99] sm:gap-2.5 sm:px-3 sm:py-2.5 sm:text-[13px] lg:text-[14px] bg-red-600 hover:bg-red-700"
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
  const [mqMd, setMqMd] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(SIDEBAR_MD_UP_MQ).matches : false
  );
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(SIDEBAR_MD_UP_MQ);
    const sync = () => setMqMd(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const isAdmin = user?.role === "admin";
  const useAlumniShell = !isAdmin || viewAsAlumni;
  /** Landing metaverse palette + mesh (scoped in index.css); admin-only dashboard keeps theme shell. */
  const alumniMetaverseShell = useAlumniShell;
  const menu = useAlumniShell ? alumniMenu : adminMenu;
  const dashboardHref = useAlumniShell ? "/dashboard" : "/admin/dashboard";
  const panelSubtitle =
    isAdmin && viewAsAlumni ? "Alumni view (preview)" : isAdmin ? "Admin Panel" : "Alumni Association";

  /** Alumni metaverse + tablet/desktop: fixed narrow rail width when sidebar is open. */
  const alumniRailMd = Boolean(alumniMetaverseShell && mqMd);

  useEffect(() => {
    if (!alumniMetaverseShell) {
      document.body.classList.remove("hpc-alumni-metaverse-body");
      return;
    }
    document.body.classList.add("hpc-alumni-metaverse-body");
    return () => {
      document.body.classList.remove("hpc-alumni-metaverse-body");
    };
  }, [alumniMetaverseShell]);

  /** Warm directory list before the user opens `/directory` (same query as Directory.tsx). */
  useEffect(() => {
    if (!user?.verified || !useAlumniShell) return;
    void queryClient.prefetchQuery({
      queryKey: alumniDirectoryQueryKey,
      queryFn: fetchAlumniDirectory,
      staleTime: ALUMNI_DIRECTORY_STALE_MS,
    });
  }, [user?.verified, useAlumniShell]);

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

  const prefetchRoute = (href: string) => {
    if (href === "/") {
      void queryClient.prefetchQuery({
        queryKey: LANDING_CONTENT_QUERY_KEY,
        queryFn: fetchLandingContent,
      });
      void queryClient.prefetchQuery({
        queryKey: ACHIEVEMENT_BANNER_QUERY_KEY,
        queryFn: fetchAchievementBannerData,
      });
      return;
    }

    const token = getAuthToken();
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    const enqueue = (path: string, key = path) =>
      void primeJsonCache({
        cacheKey: `admin:list:${key}`,
        url: `${API_BASE_URL}${path}`,
        headers,
        ttlMs: 45_000,
      });

    switch (href) {
      case "/directory":
        void queryClient.prefetchQuery({
          queryKey: alumniDirectoryQueryKey,
          queryFn: fetchAlumniDirectory,
          staleTime: ALUMNI_DIRECTORY_STALE_MS,
        });
        break;
      case "/admin/dashboard":
      case "/admin/users":
        enqueue("/api/admin/users");
        break;
      case "/admin/events":
        enqueue("/api/admin/events");
        break;
      case "/admin/achievements":
        enqueue("/api/admin/achievements");
        break;
      case "/admin/notices":
        enqueue("/api/admin/notices");
        break;
      case "/admin/elections":
        enqueue("/api/admin/elections");
        break;
      case "/admin/documents":
        enqueue("/api/admin/documents");
        break;
      case "/admin/settings":
        enqueue("/api/admin/admins");
        break;
      default:
        break;
    }
  };

  const closeSidebarViaX = () => {
    setSidebarOpen(false);
  };

  /** Alumni metaverse + md+: ~70% of `w-64` when open (no outside / nav auto-close). */
  const asideWidthClass = (() => {
    if (sidebarOpen && alumniRailMd) {
      return "w-[11.2rem]";
    }
    if (!sidebarOpen) return "w-0";
    return alumniMetaverseShell ? "w-[55vw]" : "w-[55vw] lg:w-64";
  })();

  const mainMarginClass = (() => {
    if (sidebarOpen && alumniRailMd) {
      return "ml-0 md:ml-[11.2rem]";
    }
    return sidebarOpen ? "ml-0 lg:ml-64" : "ml-0";
  })();

  return (
    <div
      className={
        alumniMetaverseShell
          ? "min-h-screen hpc-alumni-landing-shell"
          : "min-h-screen bg-background bg-gradient-to-br from-background via-background to-muted/25"
      }
    >
      {/* Fixed Sidebar — no backdrop: outside clicks do not close; only X closes. */}
      <aside
        className={`fixed top-0 left-0 z-50 flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden border-r border-sidebar-border/90 bg-sidebar shadow-[4px_0_32px_-12px_hsl(var(--foreground)_/_0.08)] transition-all duration-150 ease-in-out lg:duration-300 ${asideWidthClass}`}
      >
        <div className="h-full w-full min-h-0 min-w-0 flex flex-col">
          <SidebarContent
            menu={menu}
            isActive={isActive}
            user={user}
            logout={logout}
            showClose={sidebarOpen}
            onCloseSidebar={closeSidebarViaX}
            onPrefetchRoute={prefetchRoute}
            dashboardHref={dashboardHref}
            panelSubtitle={panelSubtitle}
          />
        </div>
      </aside>

      {/* Main wrapper: keep mobile as overlay (no push); alumni md+ uses rail margin; admin lg uses ml-64. */}
      <div
        className={`flex min-h-screen flex-col transition-[margin] duration-150 lg:duration-300 ease-in-out ${mainMarginClass}`}
      >
        <div
          className={
            alumniMetaverseShell
              ? "flex min-h-screen flex-1 flex-col hpc-alumni-dashboard-column-mesh"
              : "flex flex-col min-h-screen"
          }
        >
          {/* Fixed Header */}
          <header
            className={
              alumniMetaverseShell
                ? "landing-navbar-metaverse sticky top-0 z-30 flex h-12 items-center justify-between border-b border-white/10 px-2 lg:h-10 lg:px-3"
                : "sticky top-0 z-30 flex h-12 items-center justify-between border-b border-white/10 px-2 shadow-[0_4px_28px_-8px_rgba(0,209,255,0.1),0_8px_32px_-12px_rgba(255,149,0,0.12)] lg:h-10 lg:px-3"
            }
            style={{
              background: "var(--theme-header-bg)",
            }}
          >
            <div className="flex min-w-0 items-center gap-1.5">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="rounded-lg p-2.5 transition-colors duration-200 hover:bg-white/15 hover:shadow-md sm:p-2 md:p-1.5"
                  aria-label="Open menu"
                >
                  <Menu className="h-6 w-6 text-white sm:h-[22px] sm:w-[22px] md:h-5 md:w-5" />
                </button>
              )}
              <h1 className="block max-w-[42vw] truncate text-[13px] font-semibold leading-tight text-white sm:max-w-none sm:text-[12px]">
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
              <AutoRepairBoundary title="Notifications" className="shrink-0">
                <div className="shrink-0">
                  <NotificationDropdown compact />
                </div>
              </AutoRepairBoundary>

              {/* Profile dropdown */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-1.5 rounded px-1.5 py-1 hover:bg-white/10 transition-colors sm:gap-1 sm:px-1"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 sm:h-6 sm:w-6">
                    <User className="h-4 w-4 text-white sm:h-3.5 sm:w-3.5" />
                  </div>
                  <span className="hidden max-w-[120px] truncate text-[12px] font-medium text-white sm:block sm:max-w-[100px] sm:text-[11px]">
                    {user?.name}
                  </span>
                  <ChevronDown className="hidden h-3.5 w-3.5 text-white/60 sm:block sm:h-3 sm:w-3" />
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
                className="shrink-0 rounded p-1.5 hover:bg-white/10 transition-colors sm:p-1"
                title="Logout"
              >
                <LogOut className="h-5 w-5 text-white sm:h-[18px] sm:w-[18px]" />
              </button>
            </div>
          </header>

          {/* Active Election Banner */}
          <AutoRepairBoundary title="Active election banner">
            <ActiveElectionBanner />
          </AutoRepairBoundary>

          {/* Top Notice Bar */}
          <AutoRepairBoundary title="Top notice bar">
            <TopNoticeBar />
          </AutoRepairBoundary>

          {/* Page Content */}
          <main
            className={
              alumniMetaverseShell
                ? "min-w-0 flex-1 bg-transparent px-2.5 py-4 sm:px-3 lg:px-4 lg:py-6 xl:px-5"
                : "min-w-0 flex-1 px-2.5 py-4 sm:px-3 lg:px-4 lg:py-6 xl:px-5"
            }
          >
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
