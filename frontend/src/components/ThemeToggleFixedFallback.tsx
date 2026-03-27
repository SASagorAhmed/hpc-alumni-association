import { useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Public pages without the landing navbar still need a way to change theme.
 */
export function ThemeToggleFixedFallback() {
  const { pathname } = useLocation();
  const showThemeToggle = false; // Keep floating toggle code for later; hidden for now.

  const show =
    showThemeToggle &&
    (pathname === "/login" ||
      pathname === "/register" ||
      pathname === "/admin/login" ||
      pathname.startsWith("/verify-otp") ||
      pathname.startsWith("/set-password") ||
      pathname.startsWith("/member/"));

  if (!show) return null;

  return (
    <div className="fixed right-3 top-[72px] z-[9999]">
      <ThemeToggle />
    </div>
  );
}
