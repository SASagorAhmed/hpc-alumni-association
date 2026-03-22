import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
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
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import TopNoticeBar from "@/components/notices/TopNoticeBar";
import ActiveElectionBanner from "@/components/elections/ActiveElectionBanner";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";

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
  { icon: Settings, label: "Settings", href: "/admin/settings" },
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
}: {
  menu: typeof alumniMenu;
  isActive: (href: string) => boolean;
  user: any;
  logout: () => void;
  onNavigate?: () => void;
  showClose?: boolean;
}) => (
  <>
    <div
      className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-2"
      style={{ background: "var(--theme-navbar-bg)" }}
    >
      <Link to={user?.role === "admin" ? "/admin/dashboard" : "/dashboard"} className="flex min-w-0 items-center gap-1.5">
        <img src={hpcLogo} alt="HPC Logo" className="h-7 w-7 shrink-0 rounded-full shadow-sm ring-1 ring-[hsl(43,96%,56%)]/50" />
        <div className="min-w-0 leading-none">
          <span className="block truncate text-[10px] font-bold tracking-tight text-white">Hamdard Public College</span>
          <span className="mt-px block truncate text-[7px] font-semibold uppercase tracking-wide" style={{ color: "hsl(43, 96%, 56%)" }}>
            {user?.role === "admin" ? "Admin Panel" : "Alumni Association"}
          </span>
        </div>
      </Link>
      {showClose && (
        <button onClick={onNavigate} className="shrink-0 rounded p-0.5 hover:bg-muted/50 transition-colors duration-300">
          <X className="h-3.5 w-3.5 text-white" />
        </button>
      )}
    </div>
    <nav className="flex-1 overflow-y-auto py-4 px-3">
      <ul className="space-y-1">
        {menu.map(({ icon: Icon, label, href }) => (
          <li key={href}>
            <Link
              to={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] transition-all duration-300 ease-in-out ${
                isActive(href)
                  ? "text-primary font-semibold bg-primary/10 border-l-4 border-primary"
                  : "text-muted-foreground font-medium hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon
                className={`w-[18px] h-[18px] shrink-0 ${
                  isActive(href) ? "text-primary" : "text-muted-foreground"
                }`}
              />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
    <div className="px-3 py-4 border-t border-border">
      <button
        onClick={() => { logout(); onNavigate?.(); }}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium bg-red-600 text-white hover:bg-red-700 transition-colors w-full"
      >
        <LogOut className="w-[18px] h-[18px]" />
        Logout
      </button>
    </div>
  </>
);

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const menu = user?.role === "admin" ? adminMenu : alumniMenu;
  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="min-h-screen bg-background">
      {/* Backdrop for outside click */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Fixed Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 flex h-screen flex-col overflow-hidden border-r border-border/80 bg-sidebar transition-all duration-300 ease-in-out ${
          sidebarOpen ? "w-64" : "w-0"
        }`}
      >
        <div className="min-w-[16rem] h-full flex flex-col">
          <SidebarContent
            menu={menu}
            isActive={isActive}
            user={user}
            logout={logout}
            showClose={sidebarOpen}
            onNavigate={() => setSidebarOpen(false)}
          />
        </div>
      </aside>

      {/* Main wrapper: ml must match aside w-64 (both 16rem) — fixed px caused a gap when html font-size ≠ 16px */}
      <div
        className={`flex min-h-screen flex-col transition-[margin] duration-300 ease-in-out ${
          sidebarOpen ? "ml-64" : "ml-0"
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
                  className="rounded p-0.5 hover:bg-gray-900/10"
                  aria-label="Open menu"
                >
                  <Menu className="h-3.5 w-3.5 text-white" />
                </button>
              )}
              <h1 className="hidden truncate text-[12px] font-semibold leading-tight text-white sm:block">
                {menu.find((m) => isActive(m.href))?.label || "Dashboard"}
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <ThemeToggle
                rootClassName="shrink-0"
                buttonClassName="!h-6 !w-6 min-h-0 border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                iconClassName="!h-3 !w-3 !text-white"
              />
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
            {children ?? <Outlet />}
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
