import { useState, useEffect, useCallback, type MouseEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminViewAsAlumni } from "@/contexts/AdminViewAsAlumniContext";
import { cn } from "@/lib/utils";
import hpcLogo from "@/assets/hpc-logo.png";
import { ThemeToggle } from "@/components/ThemeToggle";

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
      <div className="layout-container flex h-12 items-center justify-between">
        <Link
          to="/"
          className="flex min-w-0 shrink-0 items-center gap-1 md:gap-1.5"
          onClick={(e) => {
            if (location.pathname === "/") {
              e.preventDefault();
              setActiveSection("#");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
        >
          <img src={hpcLogo} alt="HPC Logo" className="h-7 w-7 shrink-0 md:h-8 md:w-8" />
          <div className="min-w-0 leading-none">
            <span
              className="nav-brand-title block truncate text-[10px] font-bold leading-tight md:text-[11px]"
              style={{ color: "var(--navbar-text)" }}
            >
              Hamdard Public College
            </span>
            <span
              className="nav-brand-subtitle mt-px block truncate bg-gradient-to-r from-[#fb4d3d] via-[#16a34a] to-[#22c55e] bg-clip-text text-[7px] font-extrabold tracking-wide text-transparent md:text-[8px]"
              style={{ textShadow: "0 0 0.15px rgba(0,0,0,0.25)" }}
            >
              ALUMNI ASSOCIATION
            </span>
          </div>
        </Link>

        {/* Desktop: use xl+ to prevent overflow at odd zoom/window combos */}
        <div className="hidden min-w-0 flex-1 items-center justify-end gap-0 xl:flex">
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex min-w-0 items-center justify-center gap-0 overflow-hidden">
              {navLinks.map((link) => (
                <Link
                  key={link.href + link.label}
                  to={link.href === "#" ? "/" : `/${link.href}`}
                  onClick={(e) => handleLandingNavClick(e, link.href)}
                  className={cn(
                    "fs-nav topnav-btn-text group relative inline-flex h-8 min-h-0 shrink-0 items-center whitespace-nowrap rounded-md px-2 font-semibold transition-colors",
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
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="ml-2 flex shrink-0 items-center gap-2 border-l border-border/40 pl-3">
              <div className="h-8 w-[64px] animate-pulse rounded-md bg-muted/40" />
              <div className="h-8 w-[72px] animate-pulse rounded-md bg-muted/40" />
            </div>
          ) : user ? (
            <div className="ml-2 flex shrink-0 items-center gap-2 border-l border-border/40 pl-3">
              <Link
                to={dashboardPath}
                className="fs-nav topnav-btn-text inline-flex h-8 min-h-0 items-center justify-center whitespace-nowrap rounded-md border border-transparent bg-primary px-3 font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={logout}
                className="fs-nav topnav-btn-text inline-flex h-8 min-h-0 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-border/80 px-2.5 font-medium text-foreground transition-colors hover:bg-muted/50 hover:text-primary"
              >
                <LogOut size={12} className="shrink-0" />
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
                className="fs-nav topnav-btn-text inline-flex h-8 min-h-0 items-center justify-center whitespace-nowrap rounded-md border border-border/80 px-3 font-semibold text-foreground transition-all hover:border-primary/40 hover:bg-muted/60 active:scale-[0.98]"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="fs-nav topnav-btn-text inline-flex h-8 min-h-0 items-center justify-center whitespace-nowrap rounded-md border border-transparent bg-primary px-3 font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
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
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-muted/50 xl:hidden"
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
            className="overflow-hidden border-t border-border/50 bg-card xl:hidden"
          >
            <div className="flex max-h-[min(70vh,calc(100dvh-48px))] flex-col gap-0.5 overflow-y-auto overscroll-contain px-4 py-2.5">
              {navLinks.map((link) => (
                <Link
                  key={link.href + link.label}
                  to={link.href === "#" ? "/" : `/${link.href}`}
                  onClick={(e) => handleLandingNavClick(e, link.href)}
                  className={cn(
                    "fs-ui topnav-btn-text inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold transition-colors",
                    activeSection === link.href
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-primary"
                  )}
                >
                  {link.label}
                </Link>
              ))}

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
