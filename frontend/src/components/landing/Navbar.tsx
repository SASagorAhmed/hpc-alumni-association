import { useState, useEffect, useCallback, useMemo, useId, type MouseEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Menu, X, LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminViewAsAlumni } from "@/contexts/AdminViewAsAlumniContext";
import { cn } from "@/lib/utils";
import hpcLogo from "@/assets/hpc-logo.png";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { StructuredCommitteePayload } from "@/components/committee/StructuredCommitteeDisplay";
import type { AchievementPublicRecord } from "@/lib/achievementPublic";
import { useLandingContent } from "@/hooks/useLandingContent";
import { API_BASE_URL } from "@/api-production/api.js";

/** Matches scroll offset logic in Navbar (fixed bar ~48px + breathing room). */
const LANDING_NAV_SCROLL_OFFSET = 80;

const navLinks = [
  { label: "Home", href: "#" },
  { label: "Committee", href: "#committee" },
  { label: "Achievements", href: "#achievements" },
  { label: "Notices", href: "#notices" },
  { label: "Memories", href: "#memories" },
  { label: "Community", href: "#community" },
  { label: "Contact", href: "#contact" },
];

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
}: {
  link: (typeof navLinks)[number];
  activeSection: string;
  items: NavDropItem[];
  ariaLabel: string;
  onLandingClick: (e: MouseEvent<HTMLAnchorElement>, href: string) => void;
}) {
  return (
    <div className="group relative inline-flex h-8 shrink-0 items-center">
      <Link
        to={link.href === "#" ? "/" : `/${link.href}`}
        onClick={(e) => onLandingClick(e, link.href)}
        className={cn(
          "fs-nav topnav-btn-text relative inline-flex h-8 min-h-0 items-center whitespace-nowrap rounded-md px-1.5 font-semibold transition-colors lg:px-2",
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
                className="fs-ui block w-full whitespace-normal break-words px-3 py-2 text-left font-medium leading-snug text-foreground transition-colors hover:bg-muted/70 hover:text-primary [overflow-wrap:anywhere]"
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.key}
                role="menuitem"
                to={item.to}
                className="fs-ui block w-full whitespace-normal break-words px-3 py-2 text-left font-medium leading-snug text-foreground transition-colors hover:bg-muted/70 hover:text-primary [overflow-wrap:anywhere]"
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
}: {
  link: (typeof navLinks)[number];
  activeSection: string;
  items: NavDropItem[];
  onLandingClick: (e: MouseEvent<HTMLAnchorElement>, href: string) => void;
  onItemNavigate: () => void;
}) {
  const [subOpen, setSubOpen] = useState(false);
  const subMenuId = useId();
  const toggleBtnId = `${subMenuId}-toggle`;

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex min-w-0 items-stretch gap-1">
        <Link
          to={link.href === "#" ? "/" : `/${link.href}`}
          onClick={(e) => onLandingClick(e, link.href)}
          className={cn(
            "fs-ui topnav-btn-text inline-flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold transition-colors",
            activeSection === link.href
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted/60 hover:text-primary"
          )}
        >
          {link.label}
        </Link>
        <button
          type="button"
          id={toggleBtnId}
          aria-expanded={subOpen}
          aria-controls={subMenuId}
          aria-label={subOpen ? `Hide ${link.label} links` : `Show ${link.label} links`}
          onClick={() => setSubOpen((v) => !v)}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 transition-transform duration-200", subOpen && "rotate-180")}
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
                    className="fs-ui topnav-btn-text block w-full whitespace-normal break-words rounded-md px-2 py-1.5 text-left font-medium leading-snug text-muted-foreground transition-colors hover:bg-muted/60 hover:text-primary [overflow-wrap:anywhere]"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.key}
                    to={item.to}
                    onClick={onItemNavigate}
                    className="fs-ui topnav-btn-text block w-full whitespace-normal break-words rounded-md px-2 py-1.5 text-left font-medium leading-snug text-muted-foreground transition-colors hover:bg-muted/60 hover:text-primary [overflow-wrap:anywhere]"
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

function scrollToLandingSection(href: string) {
  if (href === "#") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const id = href.replace(/^#/, "");
  if (!id) return;
  const el = document.getElementById(id);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - LANDING_NAV_SCROLL_OFFSET;
  window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
}

function scrollToLandingSectionWhenReady(href: string, attempt = 0) {
  if (href === "#") {
    scrollToLandingSection(href);
    return;
  }
  const id = href.replace(/^#/, "");
  if (!id) return;
  const el = document.getElementById(id);
  if (el) {
    scrollToLandingSection(href);
    return;
  }
  if (attempt >= 20) return;
  window.setTimeout(() => scrollToLandingSectionWhenReady(href, attempt + 1), 80);
}

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("#");
  const { user, isLoading, logout } = useAuth();
  const { viewAsAlumni } = useAdminViewAsAlumni();
  const location = useLocation();
  const navigate = useNavigate();
  const showThemeToggle = false; // Keep code for later; hidden for now.

  const { data: committeeStructured } = useQuery({
    queryKey: ["committee-active-public"],
    queryFn: async (): Promise<StructuredCommitteePayload | null> => {
      const res = await fetch(`${API_BASE_URL}/api/public/committee/active`);
      if (!res.ok) return null;
      const raw = await res.json();
      if (!raw || !raw.term) return null;
      return raw as StructuredCommitteePayload;
    },
    staleTime: 60_000,
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
    staleTime: 0,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
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
    staleTime: 0,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const noticeNavItems = useMemo(() => noticeNavItemsFrom(noticesRaw), [noticesRaw]);

  const { data: memoriesRaw } = useQuery({
    queryKey: ["memories-public"],
    queryFn: async (): Promise<MemoryPublicNavRow[]> => {
      const res = await fetch(`${API_BASE_URL}/api/public/memories?published=true`);
      if (!res.ok) throw new Error("Failed to load memories");
      return res.json() as Promise<MemoryPublicNavRow[]>;
    },
    staleTime: 0,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const memoryNavItems = useMemo(() => memoryNavItemsFrom(memoriesRaw), [memoriesRaw]);

  const { data: landingContent } = useLandingContent();
  const communityNavItems = useMemo(
    () =>
      communityNavItemsFromLanding(
        landingContent?.community as Record<string, unknown> | undefined
      ),
    [landingContent]
  );

  const dashboardPath =
    user?.role === "admin" && !viewAsAlumni ? "/admin/dashboard" : "/dashboard";

  /** SPA-safe: go to `/` + hash and scroll (hash-only links break off-home and often don’t scroll with RR). */
  const handleLandingNavClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>, href: string) => {
      e.preventDefault();
      setActiveSection(href === "#" ? "#" : href);
      setMobileOpen(false);

      const onHome = location.pathname === "/";
      const sectionHash = href === "#" ? "" : `#${href.replace(/^#/, "")}`;

      if (!onHome) {
        navigate(sectionHash ? `/${sectionHash}` : "/");
        scrollToLandingSectionWhenReady(href);
        return;
      }

      if (sectionHash) {
        window.history.replaceState(null, "", `/${sectionHash}`);
      } else {
        window.history.replaceState(null, "", "/");
      }
      scrollToLandingSection(href);
    },
    [location.pathname, navigate]
  );

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
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const offset = 80;
      const activationY = scrollY + offset + 40;

      if (scrollY < 72) {
        setActiveSection("#");
        return;
      }

      if (window.innerHeight + scrollY >= document.body.scrollHeight - 50) {
        const lastLink = navLinks[navLinks.length - 1];
        setActiveSection(lastLink.href);
        return;
      }

      let current = "#";
      let currentTop = 0;
      for (const link of navLinks) {
        const id = link.href.replace("#", "");
        if (!id) continue;
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.offsetTop;
        if (top <= activationY && top >= currentTop) {
          current = link.href;
          currentTop = top;
        }
      }
      setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 backdrop-blur-md"
      style={{ background: "var(--navbar-bg)" }}
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
              window.scrollTo({ top: 0, behavior: "smooth" });
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
              className="nav-brand-subtitle mt-px block truncate bg-gradient-to-r from-[#fb4d3d] via-[#16a34a] to-[#22c55e] bg-clip-text font-extrabold tracking-[0.12em] text-transparent"
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
                      onLandingClick={handleLandingNavClick}
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
                      onLandingClick={handleLandingNavClick}
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
                      onLandingClick={handleLandingNavClick}
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
                      onLandingClick={handleLandingNavClick}
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
                      onLandingClick={handleLandingNavClick}
                    />
                  );
                }
                return (
                  <Link
                    key={link.href + link.label}
                    to={link.href === "#" ? "/" : `/${link.href}`}
                    onClick={(e) => handleLandingNavClick(e, link.href)}
                    className={cn(
                      "fs-nav topnav-btn-text group relative inline-flex h-8 min-h-0 shrink-0 items-center whitespace-nowrap rounded-md px-1.5 font-semibold transition-colors lg:px-2",
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

          {isLoading ? (
            <div className="ml-2 flex shrink-0 items-center gap-2 border-l border-border/40 pl-3">
              <div className="h-9 w-[76px] animate-pulse rounded-md bg-muted/40" />
              <div className="h-9 w-[84px] animate-pulse rounded-md bg-muted/40" />
            </div>
          ) : user ? (
            <div className="ml-2 flex shrink-0 items-center gap-2 border-l border-border/40 pl-3">
              <Link
                to={dashboardPath}
                className="fs-nav topnav-btn-text inline-flex h-9 min-h-0 items-center justify-center whitespace-nowrap rounded-md border border-transparent bg-primary px-3.5 font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={logout}
                className="fs-nav topnav-btn-text inline-flex h-9 min-h-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-border/80 px-3.5 font-medium text-foreground transition-colors hover:bg-muted/50 hover:text-primary"
              >
                <LogOut size={14} className="shrink-0" />
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
                className="fs-nav topnav-btn-text inline-flex h-9 min-h-0 items-center justify-center whitespace-nowrap rounded-md border border-border/80 px-3.5 font-semibold text-foreground transition-all hover:border-primary/40 hover:bg-muted/60 active:scale-[0.98]"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="fs-nav topnav-btn-text inline-flex h-9 min-h-0 items-center justify-center whitespace-nowrap rounded-md border border-transparent bg-primary px-3.5 font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
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
          onClick={() => setMobileOpen(!mobileOpen)}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-muted/50 lg:hidden"
        >
          {mobileOpen ? <X size={20} strokeWidth={2} /> : <Menu size={20} strokeWidth={2} />}
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
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden border-t border-border/50 bg-card lg:hidden"
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
                      onLandingClick={handleLandingNavClick}
                      onItemNavigate={() => setMobileOpen(false)}
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
                      onLandingClick={handleLandingNavClick}
                      onItemNavigate={() => setMobileOpen(false)}
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
                      onLandingClick={handleLandingNavClick}
                      onItemNavigate={() => setMobileOpen(false)}
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
                      onLandingClick={handleLandingNavClick}
                      onItemNavigate={() => setMobileOpen(false)}
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
                      onLandingClick={handleLandingNavClick}
                      onItemNavigate={() => setMobileOpen(false)}
                    />
                  );
                }
                return (
                  <Link
                    key={link.href + link.label}
                    to={link.href === "#" ? "/" : `/${link.href}`}
                    onClick={(e) => handleLandingNavClick(e, link.href)}
                    className={cn(
                      "fs-ui topnav-btn-text inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold transition-colors",
                      activeSection === link.href
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-primary"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}

              {isLoading ? (
                <div className="mt-2 h-10 animate-pulse rounded-md bg-muted/40" />
              ) : user ? (
                <>
                  <Link
                    to={dashboardPath}
                    onClick={() => setMobileOpen(false)}
                    className="fs-ui topnav-btn-text mt-2 rounded-md bg-primary px-4 py-2 text-center font-semibold text-primary-foreground shadow-sm"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => { logout(); setMobileOpen(false); }}
                    className="fs-ui topnav-btn-text mt-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-4 py-2 font-medium text-foreground hover:text-primary"
                  >
                    <LogOut size={14} />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="fs-ui topnav-btn-text mt-2 rounded-md border border-border px-4 py-2 text-center font-semibold text-foreground"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="fs-ui topnav-btn-text mt-1 rounded-md bg-primary px-4 py-2 text-center font-semibold text-primary-foreground shadow-sm"
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
