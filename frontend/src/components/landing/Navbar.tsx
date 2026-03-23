import { useState, useEffect, useCallback, type MouseEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import hpcLogo from "@/assets/hpc-logo.png";
import { ThemeToggle } from "@/components/ThemeToggle";

/** Matches scroll offset logic in Navbar (fixed bar ~40px + breathing room). */
const LANDING_NAV_SCROLL_OFFSET = 72;

const navLinks = [
  { label: "Home", href: "#" },
  { label: "Committee", href: "#committee" },
  { label: "Achievements", href: "#achievements" },
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

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("#");
  const { user, isLoading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const dashboardPath = user?.role === "admin" ? "/admin/dashboard" : "/dashboard";

  /** SPA-safe: go to `/` + hash and scroll (hash-only links break off-home and often don’t scroll with RR). */
  const handleLandingNavClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>, href: string) => {
      e.preventDefault();
      setActiveSection(href === "#" ? "#" : href);
      setMobileOpen(false);

      const onHome = location.pathname === "/";
      const hash = href === "#" ? undefined : href.replace(/^#/, "");

      if (!onHome) {
        navigate(href === "#" ? "/" : { pathname: "/", hash });
        window.setTimeout(() => scrollToLandingSection(href), 200);
        return;
      }

      navigate(href === "#" ? "/" : { pathname: "/", hash }, { replace: true });
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => scrollToLandingSection(href));
      });
    },
    [location.pathname, navigate]
  );

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeIfDesktop = () => {
      if (window.matchMedia("(min-width: 1024px)").matches) setMobileOpen(false);
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
      const offset = 72;

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
      for (const link of navLinks) {
        const id = link.href.replace("#", "");
        if (!id) continue;
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= offset) {
          current = link.href;
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
    >
      <div className="layout-container flex h-10 items-center justify-between lg:h-11">
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
              className="block truncate text-[10px] font-bold leading-tight md:text-[11px]"
              style={{ color: "var(--navbar-text)" }}
            >
              Hamdard Public College
            </span>
            <span className="mt-px block truncate text-[7px] font-extrabold tracking-wide text-gradient-gold-shine md:text-[8px]">
              ALUMNI ASSOCIATION
            </span>
          </div>
        </Link>

        {/* Desktop — lg+ so 100% zoom matches tighter layouts (like ~125% zoom on the same monitor) */}
        <div className="hidden shrink-0 items-center gap-0 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href + link.label}
              to={link.href === "#" ? "/" : { pathname: "/", hash: link.href.replace(/^#/, "") }}
              onClick={(e) => handleLandingNavClick(e, link.href)}
              className={cn(
                "fs-nav group relative inline-flex h-8 min-h-0 items-center whitespace-nowrap rounded-md px-2 font-semibold transition-colors lg:px-2.5",
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

          {isLoading ? (
            <div className="ml-2 flex items-center gap-2 border-l border-border/40 pl-3 lg:ml-3 lg:pl-4">
              <div className="h-8 w-[64px] animate-pulse rounded-md bg-muted/40" />
              <div className="h-8 w-[72px] animate-pulse rounded-md bg-muted/40" />
            </div>
          ) : user ? (
            <div className="ml-2 flex shrink-0 items-center gap-2 border-l border-border/40 pl-3 lg:ml-3 lg:gap-2.5 lg:pl-4">
              <Link
                to={dashboardPath}
                className="fs-nav inline-flex h-8 min-h-0 items-center justify-center whitespace-nowrap rounded-md border border-transparent bg-primary px-3 font-semibold text-primary-foreground transition-all hover:bg-primary/90 lg:px-3.5 active:scale-[0.98]"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={logout}
                className="fs-nav inline-flex h-8 min-h-0 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-border/80 px-2.5 font-medium text-foreground transition-colors hover:bg-muted/50 hover:text-primary lg:px-3"
              >
                <LogOut size={12} className="shrink-0" />
                Logout
              </button>
              <ThemeToggle rootClassName="shrink-0" buttonClassName="!h-8 !w-8 min-h-0" iconClassName="!h-4 !w-4" />
            </div>
          ) : (
            <div className="ml-2 flex shrink-0 items-center gap-2 border-l border-border/40 pl-3 lg:ml-3 lg:gap-2.5 lg:pl-4">
              <Link
                to="/login"
                className="fs-nav inline-flex h-8 min-h-0 items-center justify-center whitespace-nowrap rounded-md border border-border/80 px-3 font-semibold text-foreground transition-all hover:border-primary/40 hover:bg-muted/60 lg:px-3.5 active:scale-[0.98]"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="fs-nav inline-flex h-8 min-h-0 items-center justify-center whitespace-nowrap rounded-md border border-transparent bg-primary px-3 font-semibold text-primary-foreground transition-all hover:bg-primary/90 lg:px-3.5 active:scale-[0.98]"
              >
                Join Alumni
              </Link>
              <ThemeToggle rootClassName="shrink-0" buttonClassName="!h-8 !w-8 min-h-0" iconClassName="!h-4 !w-4" />
            </div>
          )}
        </div>

        {/* Mobile / tablet: hamburger below lg */}
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
            <div className="flex max-h-[min(70vh,calc(100dvh-40px))] flex-col gap-0.5 overflow-y-auto overscroll-contain px-4 py-2.5">
              {navLinks.map((link) => (
                <Link
                  key={link.href + link.label}
                  to={link.href === "#" ? "/" : { pathname: "/", hash: link.href.replace(/^#/, "") }}
                  onClick={(e) => handleLandingNavClick(e, link.href)}
                  className={cn(
                    "fs-ui inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-semibold transition-colors",
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
                    className="fs-ui mt-2 rounded-md bg-primary px-4 py-2 text-center font-semibold text-primary-foreground shadow-sm"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => { logout(); setMobileOpen(false); }}
                    className="fs-ui mt-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-4 py-2 font-medium text-foreground hover:text-primary"
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
                    className="fs-ui mt-2 rounded-md border border-border px-4 py-2 text-center font-semibold text-foreground"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="fs-ui mt-1 rounded-md bg-primary px-4 py-2 text-center font-semibold text-primary-foreground shadow-sm"
                  >
                    Join Alumni
                  </Link>
                </>
              )}
              <div className="mt-1.5 flex justify-end border-t border-border/60 pt-1.5">
                <ThemeToggle buttonClassName="!h-9 !w-9 min-h-0" iconClassName="!h-4 !w-4" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
