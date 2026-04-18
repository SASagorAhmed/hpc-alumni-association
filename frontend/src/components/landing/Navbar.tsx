import { useState, useEffect, useCallback, useMemo, useId, type MouseEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Menu, X, LogOut } from "lucide-react";
import { Link, useLocation, useNavigate, type Location } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminViewAsAlumni } from "@/contexts/AdminViewAsAlumniContext";
import { cn } from "@/lib/utils";
import { getAuthToken } from "@/lib/authToken";
import { primeJsonCache } from "@/lib/requestCache";
import { consumeFreshLandingNavTarget, setLandingNavIntent } from "@/lib/landingNavIntent";
import { captureRegisterBackSnapshot } from "@/lib/registerBackSnapshot";
import hpcLogo from "@/assets/hpc-logo.png";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { StructuredCommitteePayload } from "@/components/committee/StructuredCommitteeDisplay";
import type { AchievementPublicRecord } from "@/lib/achievementPublic";
import { useCommitteeMemberProfilePrefetch } from "@/hooks/useCommitteeMemberProfilePrefetch";
import { useLandingContent } from "@/hooks/useLandingContent";
import { API_BASE_URL } from "@/api-production/api.js";

const navLinks = [
  { label: "Home", href: "#" },
  { label: "Committee", href: "#committee" },
  { label: "Achievements", href: "#achievements" },
  { label: "Notices", href: "#notices" },
  { label: "Memories", href: "#memories" },
  { label: "Community", href: "#community" },
  { label: "Contact", href: "#contact" },
];
const NAVBAR_SCROLL_OFFSET = 72;
const SECTION_SWITCH_BIAS_PX = 220;
const LANDING_SECTION_IDS_FOR_ACTIVE = [
  "committee",
  "achievements",
  "notices",
  "memories",
  "academics",
  "campus",
  "community",
  "contact",
] as const;

const SECTION_ID_TO_NAV_HREF: Partial<Record<(typeof LANDING_SECTION_IDS_FOR_ACTIVE)[number], string>> = {
  academics: "#community",
  campus: "#community",
  community: "#community",
};

function sectionIdToNavHref(id: (typeof LANDING_SECTION_IDS_FOR_ACTIVE)[number]) {
  return SECTION_ID_TO_NAV_HREF[id] ?? `#${id}`;
}

function landingHrefToScrollId(href: string) {
  if (href === "#community") return "academics";
  return href.replace("#", "");
}

type NavDropItem = { key: string; label: string; to: string; external?: boolean };

/** Rows for nav: one per assigned member; label is always post title + member name (when name exists). */
function committeeAssignedNavItems(structured: StructuredCommitteePayload | null | undefined) {
  if (!structured?.posts?.length) return [] as NavDropItem[];
  const out: NavDropItem[] = [];
  for (const post of structured.posts) {
    const members = post.members ?? [];
    if (members.length === 0) continue;
    const postTitle = String(post.title || "").trim();
    for (const member of members) {
      if (!member?.id) continue;
      const name = String(member.name || "").trim();
      const label = name && postTitle ? `${postTitle} — ${name}` : postTitle || name || "Member";
      out.push({
        key: `${post.id}-${member.id}`,
        label,
        to: `/committee/member/${member.id}`,
      });
    }
  }
  return out;
}

function achievementNavItemsFrom(rows: AchievementPublicRecord[] | undefined) {
  if (!rows?.length) return [] as NavDropItem[];
  const out: NavDropItem[] = [];
  for (const a of rows) {
    if (!a?.id) continue;
    const title = String(a.achievement_title || "").trim();
    if (!title) continue;
    const name = String(a.name || "").trim();
    const label = name ? `${title} — ${name}` : title;
    out.push({ key: a.id, label, to: `/achievements/${a.id}` });
  }
  return out;
}

/** Public landing notices — same audience filter as NoticesSection (`landing=1`). */
type PublicNoticeNavRow = { id: string; title: string };

function noticeNavItemsFrom(rows: PublicNoticeNavRow[] | undefined) {
  if (!rows?.length) return [] as NavDropItem[];
  const out: NavDropItem[] = [];
  for (const n of rows) {
    if (!n?.id) continue;
    const title = String(n.title || "").trim();
    if (!title) continue;
    out.push({ key: n.id, label: title, to: `/notices/${n.id}` });
  }
  return out;
}

/** Same list source as MemoriesSection (`/api/public/memories?published=true`). */
type MemoryPublicNavRow = { id: string; title: string; event_date?: string | null };

function formatMemoryNavLabel(m: MemoryPublicNavRow): string {
  const title = String(m.title || "").trim();
  if (!title) return "";
  const ed = m.event_date;
  if (!ed) return title;
  const d = new Date(ed);
  if (Number.isNaN(d.getTime())) return title;
  const dateStr = d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return `${dateStr} — ${title}`;
}

function memoryNavItemsFrom(rows: MemoryPublicNavRow[] | undefined) {
  if (!rows?.length) return [] as NavDropItem[];
  const out: NavDropItem[] = [];
  for (const m of rows) {
    if (!m?.id) continue;
    const label = formatMemoryNavLabel(m).trim();
    if (!label) continue;
    out.push({ key: m.id, label, to: `/memories/${m.id}` });
  }
  return out;
}

/** Same URLs/labels as CommunitySection / landing editor (`community` block). */
function communityNavItemsFromLanding(community: Record<string, unknown> | undefined) {
  const telegramUrl = String(community?.telegramUrl ?? "https://t.me/hpcalumni").trim();
  const facebookUrl = String(community?.facebookUrl ?? "https://facebook.com/hpcalumni").trim();
  const telegramLabel = String(community?.telegramButtonLabel ?? "Join Telegram Group").trim();
  const facebookLabel = String(community?.facebookButtonLabel ?? "Facebook Group").trim();
  const out: NavDropItem[] = [];
  if (telegramUrl) {
    out.push({
      key: "community-telegram",
      label: telegramLabel || "Join Telegram Group",
      to: telegramUrl,
      external: true,
    });
  }
  if (facebookUrl) {
    out.push({
      key: "community-facebook",
      label: facebookLabel || "Facebook Group",
      to: facebookUrl,
      external: true,
    });
  }
  return out;
}

function DesktopNavDropdown({
  link,
  activeSection,
  items,
  ariaLabel,
  onLandingClick,
  onMenuItemIntent,
}: {
  link: (typeof navLinks)[number];
  activeSection: string;
  items: NavDropItem[];
  ariaLabel: string;
  onLandingClick: (e: MouseEvent<HTMLAnchorElement>, href: string) => void;
  onMenuItemIntent?: (item: NavDropItem) => void;
}) {
  return (
    <div className="group relative inline-flex h-8 shrink-0 items-center">
      <Link
        to="/"
        onClick={(e) => onLandingClick(e, link.href)}
        className={cn(
            "nav-role-link topnav-btn-text relative inline-flex h-8 min-h-0 items-center whitespace-nowrap rounded-md px-1.5 font-semibold transition-colors lg:px-2",
          activeSection === link.href
            ? "text-primary"
            : "text-muted-foreground hover:text-primary"
        )}
      >
        <span>{link.label}</span>
        <span
          className={cn(
            "absolute bottom-0 left-1/2 h-px w-0 -translate-x-1/2 rounded-full bg-primary transition-all duration-300",
            activeSection === link.href ? "w-3/4" : "group-hover:w-3/4"
          )}
        />
      </Link>
      <div
        className="pointer-events-none absolute left-1/2 top-full z-[60] flex w-max min-w-[14rem] max-w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 flex-col -mt-2 pt-2 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
        role="menu"
        aria-label={ariaLabel}
      >
        <div className="max-h-[min(70vh,28rem)] overflow-y-auto overscroll-contain rounded-md border border-border/80 bg-card py-1 shadow-lg">
          {items.map((item) =>
            item.external ? (
              <a
                key={item.key}
                role="menuitem"
                href={item.to}
                target="_blank"
                rel="noopener noreferrer"
                className="nav-role-row block w-full whitespace-normal break-words px-3 py-2 text-left font-medium leading-snug text-foreground transition-colors hover:bg-muted/70 hover:text-primary [overflow-wrap:anywhere]"
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.key}
                role="menuitem"
                to={item.to}
                onPointerEnter={() => onMenuItemIntent?.(item)}
                onMouseEnter={() => onMenuItemIntent?.(item)}
                onFocus={() => onMenuItemIntent?.(item)}
                onTouchStart={() => onMenuItemIntent?.(item)}
                className="nav-role-row block w-full whitespace-normal break-words px-3 py-2 text-left font-medium leading-snug text-foreground transition-colors hover:bg-muted/70 hover:text-primary [overflow-wrap:anywhere]"
              >
                {item.label}
              </Link>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function MobileNavDropSection({
  link,
  activeSection,
  items,
  onLandingClick,
  onItemNavigate,
  onMenuItemIntent,
}: {
  link: (typeof navLinks)[number];
  activeSection: string;
  items: NavDropItem[];
  onLandingClick: (href: string) => void;
  onItemNavigate: () => void;
  onMenuItemIntent?: (item: NavDropItem) => void;
}) {
  const [subOpen, setSubOpen] = useState(false);
  const subMenuId = useId();
  const toggleBtnId = `${subMenuId}-toggle`;

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex min-w-0 items-stretch gap-1">
        <button
          type="button"
          onClick={() => onLandingClick(link.href)}
          className={cn(
            "nav-role-link topnav-btn-text inline-flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold transition-colors",
            activeSection === link.href
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted/60 hover:text-primary"
          )}
        >
          {link.label}
        </button>
        <button
          type="button"
          id={toggleBtnId}
          aria-expanded={subOpen}
          aria-controls={subMenuId}
          aria-label={subOpen ? `Hide ${link.label} links` : `Show ${link.label} links`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSubOpen((v) => !v);
          }}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <ChevronDown
            className={cn("nav-icon-inline shrink-0 transition-transform duration-200", subOpen && "rotate-180")}
            aria-hidden
          />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {subOpen && (
          <motion.div
            id={subMenuId}
            role="region"
            aria-labelledby={toggleBtnId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="ml-2 flex flex-col gap-0.5 border-l border-border/40 pl-2.5 pt-0.5">
              {items.map((item) =>
                item.external ? (
                  <a
                    key={item.key}
                    href={item.to}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onItemNavigate}
                    className="nav-role-row topnav-btn-text block w-full whitespace-normal break-words rounded-md px-2 py-1.5 text-left font-medium leading-snug text-muted-foreground transition-colors hover:bg-muted/60 hover:text-primary [overflow-wrap:anywhere]"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.key}
                    to={item.to}
                    onClick={onItemNavigate}
                    onPointerEnter={() => onMenuItemIntent?.(item)}
                    onMouseEnter={() => onMenuItemIntent?.(item)}
                    onFocus={() => onMenuItemIntent?.(item)}
                    onTouchStart={() => onMenuItemIntent?.(item)}
                    className="nav-role-row topnav-btn-text block w-full whitespace-normal break-words rounded-md px-2 py-1.5 text-left font-medium leading-snug text-muted-foreground transition-colors hover:bg-muted/60 hover:text-primary [overflow-wrap:anywhere]"
                  >
                    {item.label}
                  </Link>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface NavbarProps {
  /** Full RGBRO metaverse chrome on the home page only (navbar + tokens). */
  landingMetaverse?: boolean;
}

const Navbar = ({ landingMetaverse = true }: NavbarProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("#");
  const { user, isLoading, isAuthReady, logout } = useAuth();
  const { viewAsAlumni } = useAdminViewAsAlumni();
  const location = useLocation();
  const navigate = useNavigate();
  const showThemeToggle = false; // Keep code for later; hidden for now.
  const isLandingRoute = location.pathname === "/";

  const { data: committeeStructured } = useQuery({
    queryKey: ["committee-active-public"],
    queryFn: async (): Promise<StructuredCommitteePayload | null> => {
      const res = await fetch(`${API_BASE_URL}/api/public/committee/active`);
      if (!res.ok) return null;
      const raw = await res.json();
      if (!raw || !raw.term) return null;
      return raw as StructuredCommitteePayload;
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    enabled: isLandingRoute,
  });
  const committeeNavItems = committeeAssignedNavItems(committeeStructured);

  const { data: achievementsRaw } = useQuery({
    queryKey: ["public-achievements-active"],
    queryFn: async (): Promise<AchievementPublicRecord[]> => {
      const res = await fetch(`${API_BASE_URL}/api/public/achievements?active=true`);
      if (!res.ok) return [];
      const raw = await res.json();
      return Array.isArray(raw) ? (raw as AchievementPublicRecord[]) : [];
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    enabled: isLandingRoute,
  });
  const achievementNavItems = useMemo(
    () => achievementNavItemsFrom(achievementsRaw),
    [achievementsRaw]
  );

  const { data: noticesRaw } = useQuery({
    queryKey: ["public-notices-navbar"],
    queryFn: async (): Promise<PublicNoticeNavRow[]> => {
      const res = await fetch(`${API_BASE_URL}/api/public/notices?limit=30&landing=1`);
      if (!res.ok) return [];
      const raw = await res.json();
      return Array.isArray(raw) ? (raw as PublicNoticeNavRow[]) : [];
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    enabled: isLandingRoute,
  });
  const noticeNavItems = useMemo(() => noticeNavItemsFrom(noticesRaw), [noticesRaw]);

  const { data: memoriesRaw } = useQuery({
    queryKey: ["memories-public"],
    queryFn: async (): Promise<MemoryPublicNavRow[]> => {
      const res = await fetch(`${API_BASE_URL}/api/public/memories?published=true`);
      if (!res.ok) throw new Error("Failed to load memories");
      return res.json() as Promise<MemoryPublicNavRow[]>;
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    enabled: isLandingRoute,
  });
  const memoryNavItems = useMemo(() => memoryNavItemsFrom(memoriesRaw), [memoriesRaw]);

  const { data: landingContent } = useLandingContent({ enabled: isLandingRoute });
  const communityNavItems = useMemo(
    () =>
      communityNavItemsFromLanding(
        landingContent?.community as Record<string, unknown> | undefined
      ),
    [landingContent]
  );

  const dashboardPath =
    user?.role === "admin" && !viewAsAlumni ? "/admin/dashboard" : "/dashboard";
  const authPending = !isAuthReady || isLoading;

  const prefetchDashboardDestination = useCallback(() => {
    if (!user) return;
    if (dashboardPath === "/admin/dashboard") {
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
      enqueue("/api/admin/users");
      enqueue("/api/admin/events");
      enqueue("/api/admin/achievements");
      enqueue("/api/admin/notices");
      enqueue("/api/admin/elections");
      enqueue("/api/admin/documents");
      enqueue("/api/admin/admins");
      return;
    }
    void primeJsonCache({
      cacheKey: "alumni:dashboard:notices",
      url: `${API_BASE_URL}/api/public/notices?limit=5`,
      ttlMs: 45_000,
    });
    void primeJsonCache({
      cacheKey: "alumni:dashboard:events",
      url: `${API_BASE_URL}/api/public/events?status=published&limit=10`,
      ttlMs: 45_000,
    });
  }, [dashboardPath, user]);

  const handleDashboardTap = useCallback(() => {
    prefetchDashboardDestination();
  }, [prefetchDashboardDestination]);

  const prefetchCommitteeProfile = useCommitteeMemberProfilePrefetch();
  const onCommitteeNavItemIntent = useCallback(
    (item: NavDropItem) => {
      const m = /^\/committee\/member\/([^/]+)\/?$/.exec(item.to);
      if (m) prefetchCommitteeProfile(m[1]);
    },
    [prefetchCommitteeProfile]
  );

  const closeMobileMenu = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const handleRegisterNavigationCapture = useCallback(() => {
    captureRegisterBackSnapshot();
  }, []);

  const scrollToLandingSection = useCallback((href: string) => {
    const cleanUrl = `${window.location.pathname}${window.location.search}`;
    if (window.location.hash) {
      window.history.replaceState({}, "", cleanUrl);
    }
    const id = landingHrefToScrollId(href);
    const maxFrames = 24;
    let frame = 0;
    const applyScroll = () => {
      const prevScrollBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      if (!id) {
        window.scrollTo(0, 0);
        document.documentElement.style.scrollBehavior = prevScrollBehavior;
        setActiveSection("#");
        return;
      }
      const target = document.getElementById(id);
      if (!target && frame < maxFrames) {
        frame += 1;
        requestAnimationFrame(applyScroll);
        return;
      }
      if (!target) {
        document.documentElement.style.scrollBehavior = prevScrollBehavior;
        return;
      }
      const y = Math.max(0, target.getBoundingClientRect().top + window.scrollY - NAVBAR_SCROLL_OFFSET);
      window.scrollTo(0, y);
      document.documentElement.style.scrollBehavior = prevScrollBehavior;
      setActiveSection(href);
    };
    applyScroll();
  }, []);

  const runLandingNavigation = useCallback(
    (href: string) => {
      const pushLandingTarget = () => {
        try {
          setLandingNavIntent(href);
          window.dispatchEvent(new CustomEvent("hpc:landing-nav-target", { detail: href }));
        } catch {
          /* ignore */
        }
      };
      if (location.pathname !== "/") {
        pushLandingTarget();
        const state = location.state as { backgroundLocation?: Location } | null;
        if (state?.backgroundLocation) {
          navigate(-1);
          return;
        }
        navigate("/");
        return;
      }
      // Already on landing: use direct one-click section scroll only.
      // Do not set cross-route nav intent/event here, which can cause
      // duplicate scroll paths and active-section desync.
      scrollToLandingSection(href);
    },
    [location.pathname, navigate, scrollToLandingSection]
  );

  const handleLandingNavClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>, href: string) => {
      e.preventDefault();
      runLandingNavigation(href);
    },
    [runLandingNavigation]
  );

  const handleMobileLandingNavClick = useCallback(
    (href: string) => {
      closeMobileMenu();
      runLandingNavigation(href);
    },
    [closeMobileMenu, runLandingNavigation]
  );

  useEffect(() => {
    // Fallback for cross-route/overlay flows:
    // when we arrive back on landing, consume pending target and
    // apply the section scroll once so first click always works.
    if (location.pathname !== "/") return;
    const pendingTarget = consumeFreshLandingNavTarget();
    if (!pendingTarget) return;
    scrollToLandingSection(pendingTarget);
  }, [location.pathname, scrollToLandingSection]);

  useEffect(() => {
    if (mobileOpen) setMobileOpen(false);
  }, [location.pathname, mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeIfDesktop = () => {
      if (window.matchMedia("(min-width: 1025px)").matches) setMobileOpen(false);
    };
    window.addEventListener("resize", closeIfDesktop);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("resize", closeIfDesktop);
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!isLandingRoute || typeof window === "undefined") return;

    let raf = 0;
    let settleRaf = 0;
    const resolveActiveSection = () => {
      const scrollY = window.scrollY;
      // Switch section when previous section is effectively out of view
      // (user preference), not too early at heading touch.
      const activationY = scrollY + NAVBAR_SCROLL_OFFSET + SECTION_SWITCH_BIAS_PX;

      if (scrollY < NAVBAR_SCROLL_OFFSET) {
        setActiveSection((prev) => (prev === "#" ? prev : "#"));
        return;
      }

      if (window.innerHeight + scrollY >= document.body.scrollHeight - 50) {
        const lastLink = navLinks[navLinks.length - 1];
        setActiveSection((prev) => (prev === lastLink.href ? prev : lastLink.href));
        return;
      }

      let next = "#";
      let currentTop = 0;
      for (const id of LANDING_SECTION_IDS_FOR_ACTIVE) {
        const node = document.getElementById(id);
        if (!node) continue;
        const top = node.getBoundingClientRect().top + window.scrollY;
        if (top <= activationY && top >= currentTop) {
          next = sectionIdToNavHref(id);
          currentTop = top;
        }
      }
      setActiveSection((prev) => (prev === next ? prev : next));
    };

    const scheduleResolve = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(resolveActiveSection);
    };

    // Deterministic settle pass + short bounded polling for late async layout shifts.
    // This keeps community/contact mapping correct after refresh without long-running polling.
    const runSettlePass = () => {
      let pass = 0;
      const maxPasses = 14;
      const tick = () => {
        scheduleResolve();
        if (pass >= maxPasses) return;
        pass += 1;
        settleRaf = requestAnimationFrame(tick);
      };
      cancelAnimationFrame(settleRaf);
      tick();
    };

    window.addEventListener("scroll", scheduleResolve, { passive: true });
    window.addEventListener("resize", scheduleResolve);
    window.addEventListener("load", runSettlePass as EventListener);
    window.addEventListener("hpc:route-scroll-restored", runSettlePass as EventListener);
    window.addEventListener("pageshow", runSettlePass as EventListener);
    runSettlePass();

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(settleRaf);
      window.removeEventListener("scroll", scheduleResolve);
      window.removeEventListener("resize", scheduleResolve);
      window.removeEventListener("load", runSettlePass as EventListener);
      window.removeEventListener("hpc:route-scroll-restored", runSettlePass as EventListener);
      window.removeEventListener("pageshow", runSettlePass as EventListener);
    };
  }, [
    isLandingRoute,
    committeeNavItems.length,
    achievementNavItems.length,
    noticeNavItems.length,
    memoryNavItems.length,
  ]);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 border-b",
        landingMetaverse
          ? "landing-navbar-metaverse border-cyan-400/25"
          : "border-border/30 backdrop-blur-md"
      )}
      style={!landingMetaverse ? { background: "var(--navbar-bg)" } : undefined}
      data-navbar-text-scale="1.1"
    >
      <div className="layout-container flex h-11 items-center justify-between sm:h-12">
        <Link
          to="/"
          className="flex min-w-0 max-w-[min(100%,14rem)] shrink-0 items-center gap-1 sm:max-w-[16rem] md:gap-1.5"
          onClick={(e) => {
            if (location.pathname === "/") {
              e.preventDefault();
              setActiveSection("#");
            }
          }}
        >
          <img src={hpcLogo} alt="HPC Logo" className="h-6 w-6 shrink-0 sm:h-7 sm:w-7 md:h-8 md:w-8" />
          <div className="min-w-0 leading-none">
            <span
              className="nav-brand-title block truncate font-bold"
              style={{ color: "var(--navbar-text)" }}
            >
              Hamdard Public College
            </span>
            <span
              className={cn(
                "nav-brand-subtitle mt-px block truncate bg-clip-text font-extrabold tracking-[0.12em] text-transparent",
                landingMetaverse
                  ? "bg-gradient-to-r from-amber-300 via-orange-400 to-yellow-300"
                  : "bg-gradient-to-r from-[#fb4d3d] via-[#16a34a] to-[#22c55e]"
              )}
              style={{ textShadow: "0 0 0.15px rgba(0,0,0,0.25)" }}
            >
              ALUMNI ASSOCIATION
            </span>
          </div>
        </Link>

        {/* Desktop from lg (1025px) — matches tailwind `lg` and site desktop band; avoid xl (1280) gap where laptops saw hamburger */}
        <div className="hidden min-w-0 flex-1 items-center justify-end gap-0 lg:flex">
          {/* overflow-y visible so the Committee dropdown is not clipped; keep horizontal containment */}
          <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-visible lg:overflow-visible">
            <div className="flex min-w-0 items-center justify-center gap-0 overflow-x-hidden overflow-y-visible lg:gap-0.5 lg:overflow-visible">
              {navLinks.map((link) => {
                if (link.label === "Committee" && committeeNavItems.length > 0) {
                  return (
                    <DesktopNavDropdown
                      key={link.href + link.label}
                      link={link}
                      activeSection={activeSection}
                      items={committeeNavItems}
                      ariaLabel="Committee assigned posts"
                      onLandingClick={(e) => handleLandingNavClick(e, link.href)}
                      onMenuItemIntent={onCommitteeNavItemIntent}
                    />
                  );
                }
                if (link.label === "Achievements" && achievementNavItems.length > 0) {
                  return (
                    <DesktopNavDropdown
                      key={link.href + link.label}
                      link={link}
                      activeSection={activeSection}
                      items={achievementNavItems}
                      ariaLabel="Achievements"
                      onLandingClick={(e) => handleLandingNavClick(e, link.href)}
                    />
                  );
                }
                if (link.label === "Notices" && noticeNavItems.length > 0) {
                  return (
                    <DesktopNavDropdown
                      key={link.href + link.label}
                      link={link}
                      activeSection={activeSection}
                      items={noticeNavItems}
                      ariaLabel="Notices"
                      onLandingClick={(e) => handleLandingNavClick(e, link.href)}
                    />
                  );
                }
                if (link.label === "Memories" && memoryNavItems.length > 0) {
                  return (
                    <DesktopNavDropdown
                      key={link.href + link.label}
                      link={link}
                      activeSection={activeSection}
                      items={memoryNavItems}
                      ariaLabel="Memories"
                      onLandingClick={(e) => handleLandingNavClick(e, link.href)}
                    />
                  );
                }
                if (link.label === "Community" && communityNavItems.length > 0) {
                  return (
                    <DesktopNavDropdown
                      key={link.href + link.label}
                      link={link}
                      activeSection={activeSection}
                      items={communityNavItems}
                      ariaLabel="Community links"
                      onLandingClick={(e) => handleLandingNavClick(e, link.href)}
                    />
                  );
                }
                return (
                  <Link
                    key={link.href + link.label}
                    to="/"
                    onClick={(e) => handleLandingNavClick(e, link.href)}
                    className={cn(
                      "nav-role-link topnav-btn-text group relative inline-flex h-8 min-h-0 shrink-0 items-center whitespace-nowrap rounded-md px-1.5 font-semibold transition-colors lg:px-2",
                      activeSection === link.href
                        ? "text-primary"
                        : "text-muted-foreground hover:text-primary"
                    )}
                  >
                    <span>{link.label}</span>
                    <span
                      className={cn(
                        "absolute bottom-0 left-1/2 h-px w-0 -translate-x-1/2 rounded-full bg-primary transition-all duration-300",
                        activeSection === link.href ? "w-3/4" : "group-hover:w-3/4"
                      )}
                    />
                  </Link>
                );
              })}
            </div>
          </div>

          {authPending ? (
            <div className="ml-2 flex shrink-0 items-center gap-2 border-l border-border/40 pl-3">
              <div className="h-9 w-[76px] animate-pulse rounded-md bg-muted/40" />
              <div className="h-9 w-[84px] animate-pulse rounded-md bg-muted/40" />
            </div>
          ) : user ? (
            <div className="ml-2 flex shrink-0 items-center gap-2 border-l border-border/40 pl-3">
              <Link
                to={dashboardPath}
                onMouseEnter={prefetchDashboardDestination}
                onFocus={prefetchDashboardDestination}
                onTouchStart={prefetchDashboardDestination}
                onClick={handleDashboardTap}
                className={cn(
                  "nav-role-action nav-role-action-logged topnav-btn-text inline-flex h-9 min-h-0 items-center justify-center whitespace-nowrap rounded-md border border-transparent px-3.5 font-semibold transition-all active:scale-[0.98]",
                  landingMetaverse
                    ? "landing-nav-cta-gradient text-white shadow-lg"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={logout}
                className={cn(
                  "nav-role-action nav-role-action-logged topnav-btn-text inline-flex h-9 min-h-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-3.5 font-medium transition-colors",
                  landingMetaverse
                    ? "landing-nav-cta-ghost border-white/20 text-slate-200 hover:text-amber-200"
                    : "border-border/80 text-foreground hover:bg-muted/50 hover:text-primary"
                )}
              >
                <LogOut className="nav-icon-inline shrink-0" />
                Logout
              </button>
              {showThemeToggle ? (
                <ThemeToggle rootClassName="shrink-0" buttonClassName="!h-8 !w-8 min-h-0" iconClassName="!h-4 !w-4" />
              ) : null}
            </div>
          ) : (
            <div className="ml-2 flex shrink-0 items-center gap-2 border-l border-border/40 pl-3">
              <Link
                to="/login"
                className={cn(
                  "nav-role-action topnav-btn-text inline-flex h-9 min-h-0 items-center justify-center whitespace-nowrap rounded-md border px-3.5 font-semibold transition-all active:scale-[0.98]",
                  landingMetaverse
                    ? "landing-nav-cta-ghost border-white/25 text-slate-100"
                    : "border-border/80 text-foreground hover:border-primary/40 hover:bg-muted/60"
                )}
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={handleRegisterNavigationCapture}
                className={cn(
                  "nav-role-action topnav-btn-text inline-flex h-9 min-h-0 items-center justify-center whitespace-nowrap rounded-md border border-transparent px-3.5 font-semibold transition-all active:scale-[0.98]",
                  landingMetaverse
                    ? "landing-nav-cta-gradient text-white shadow-lg"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                Join Alumni
              </Link>
              {showThemeToggle ? (
                <ThemeToggle rootClassName="shrink-0" buttonClassName="!h-8 !w-8 min-h-0" iconClassName="!h-4 !w-4" />
              ) : null}
            </div>
          )}
        </div>

        {/* Mobile / tablet + medium desktop fallback */}
        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-controls="landing-nav-mobile-menu"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => {
            setMobileOpen((prev) => !prev);
          }}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-muted/50 sm:h-11 sm:w-11 lg:hidden"
        >
          {mobileOpen ? (
            <X className="nav-icon-trigger" strokeWidth={2} />
          ) : (
            <Menu className="nav-icon-trigger" strokeWidth={2} />
          )}
        </button>
      </div>

      {/* Mobile menu (same breakpoint as hamburger) */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="landing-nav-mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className={cn(
              "overflow-hidden border-t border-border/50 bg-card lg:hidden",
              landingMetaverse && "landing-nav-mobile-drawer-metaverse border-cyan-500/20"
            )}
          >
            <div className="flex max-h-[min(70vh,calc(100dvh-2.75rem))] flex-col gap-0.5 overflow-y-auto overscroll-contain px-4 py-2.5 sm:max-h-[min(70vh,calc(100dvh-3rem))]">
              {navLinks.map((link) => {
                if (link.label === "Committee" && committeeNavItems.length > 0) {
                  return (
                    <MobileNavDropSection
                      key={link.href + link.label}
                      link={link}
                      activeSection={activeSection}
                      items={committeeNavItems}
                      onLandingClick={() => handleMobileLandingNavClick(link.href)}
                      onItemNavigate={closeMobileMenu}
                      onMenuItemIntent={onCommitteeNavItemIntent}
                    />
                  );
                }
                if (link.label === "Achievements" && achievementNavItems.length > 0) {
                  return (
                    <MobileNavDropSection
                      key={link.href + link.label}
                      link={link}
                      activeSection={activeSection}
                      items={achievementNavItems}
                      onLandingClick={() => handleMobileLandingNavClick(link.href)}
                      onItemNavigate={closeMobileMenu}
                    />
                  );
                }
                if (link.label === "Notices" && noticeNavItems.length > 0) {
                  return (
                    <MobileNavDropSection
                      key={link.href + link.label}
                      link={link}
                      activeSection={activeSection}
                      items={noticeNavItems}
                      onLandingClick={() => handleMobileLandingNavClick(link.href)}
                      onItemNavigate={closeMobileMenu}
                    />
                  );
                }
                if (link.label === "Memories" && memoryNavItems.length > 0) {
                  return (
                    <MobileNavDropSection
                      key={link.href + link.label}
                      link={link}
                      activeSection={activeSection}
                      items={memoryNavItems}
                      onLandingClick={() => handleMobileLandingNavClick(link.href)}
                      onItemNavigate={closeMobileMenu}
                    />
                  );
                }
                if (link.label === "Community" && communityNavItems.length > 0) {
                  return (
                    <MobileNavDropSection
                      key={link.href + link.label}
                      link={link}
                      activeSection={activeSection}
                      items={communityNavItems}
                      onLandingClick={() => handleMobileLandingNavClick(link.href)}
                      onItemNavigate={closeMobileMenu}
                    />
                  );
                }
                return (
                  <button
                    type="button"
                    key={link.href + link.label}
                    onClick={() => handleMobileLandingNavClick(link.href)}
                    className={cn(
                      "nav-role-link topnav-btn-text inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold transition-colors",
                      activeSection === link.href
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-primary"
                    )}
                  >
                    {link.label}
                  </button>
                );
              })}

              {authPending ? (
                <div className="mt-2 h-10 animate-pulse rounded-md bg-muted/40" />
              ) : user ? (
                <>
                  <Link
                    to={dashboardPath}
                    onMouseEnter={prefetchDashboardDestination}
                    onFocus={prefetchDashboardDestination}
                    onTouchStart={prefetchDashboardDestination}
                    onClick={handleDashboardTap}
                    className={cn(
                      "nav-role-action topnav-btn-text mt-2 rounded-md px-4 py-2 text-center font-semibold shadow-sm",
                      landingMetaverse ? "landing-nav-cta-gradient text-white" : "bg-primary text-primary-foreground"
                    )}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => { logout(); closeMobileMenu(); }}
                    className={cn(
                      "nav-role-action topnav-btn-text mt-1 inline-flex items-center justify-center gap-1.5 rounded-md border px-4 py-2 font-medium",
                      landingMetaverse
                        ? "landing-nav-cta-ghost border-white/20 text-slate-200 hover:text-amber-200"
                        : "border-border text-foreground hover:text-primary"
                    )}
                  >
                    <LogOut className="nav-icon-inline" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className={cn(
                      "nav-role-action topnav-btn-text mt-2 rounded-md border px-4 py-2 text-center font-semibold",
                      landingMetaverse ? "landing-nav-cta-ghost border-white/25 text-slate-100" : "border-border text-foreground"
                    )}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={handleRegisterNavigationCapture}
                    className={cn(
                      "nav-role-action topnav-btn-text mt-1 rounded-md px-4 py-2 text-center font-semibold shadow-sm",
                      landingMetaverse ? "landing-nav-cta-gradient text-white" : "bg-primary text-primary-foreground"
                    )}
                  >
                    Join Alumni
                  </Link>
                </>
              )}
              {showThemeToggle ? (
                <div className="mt-1.5 flex justify-end border-t border-border/60 pt-1.5">
                  <ThemeToggle buttonClassName="!h-9 !w-9 min-h-0" iconClassName="!h-4 !w-4" />
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
