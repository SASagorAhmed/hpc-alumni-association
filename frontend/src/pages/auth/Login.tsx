import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { LogIn, Eye, EyeOff, CheckCircle2, Info } from "lucide-react";
import hpcLogo from "@/assets/hpc-logo.png";
import { API_BASE_URL } from "@/api-production/api.js";
import { Checkbox } from "@/components/ui/checkbox";
import { clearAuthToken, setAuthToken } from "@/lib/authToken";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { usePersistedFormDraft } from "@/hooks/usePersistedFormDraft";

/** Written before Google redirect; read when OAuth returns (same tab). */
const OAUTH_REMEMBER_KEY = "hpc_oauth_remember_me";

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [form, setForm, clearLoginDraft] = usePersistedFormDraft(
    { email: "", password: "" },
    { storageKey: "auth:login:draft", delayMs: 120 }
  );
  const [emailVerifyBanner, setEmailVerifyBanner] = useState<"verified" | "already_verified" | null>(null);

  useEffect(() => {
    const verified = searchParams.get("verified") === "1";
    const alreadyVerified = searchParams.get("already_verified") === "1";
    if (!verified && !alreadyVerified) return;

    if (verified) setEmailVerifyBanner("verified");
    if (alreadyVerified) setEmailVerifyBanner("already_verified");

    const p = new URLSearchParams(searchParams);
    p.delete("verified");
    p.delete("already_verified");
    const q = p.toString();
    navigate(q ? `/login?${q}` : "/login", { replace: true });
  }, [searchParams, navigate]);

  useEffect(() => {
    const googleTokenMissing = searchParams.get("google_token_missing") === "1";
    const googleError = searchParams.get("google_error") === "1";
    const googleCallbackFailed = searchParams.get("google_callback_failed") === "1";
    const oauthHandoff = searchParams.get("oauth_handoff") === "1";
    const jwtFromQuery = searchParams.get("jwt");

    const completeGoogleLogin = async () => {
      let jwt: string | null = null;

      if (oauthHandoff) {
        try {
          const handoffRes = await fetch(`${API_BASE_URL}/api/auth/oauth-handoff`, {
            method: "POST",
            credentials: "include",
          });
          const handoffBody = await handoffRes.json().catch(() => ({}));
          if (handoffBody?.token) jwt = handoffBody.token;
        } catch {
          /* fall back to jwt in URL when cross-site cookie is blocked */
        }
      }
      if (!jwt && jwtFromQuery) jwt = jwtFromQuery;

      if (!jwt) {
        if (googleTokenMissing) toast.error("Google sign-in did not return a session. Please try again.");
        if (googleError) toast.error("Google sign-in was interrupted. Please try again.");
        if (googleCallbackFailed) toast.error("Something went wrong after Google sign-in. Please try again.");
        if (oauthHandoff && !googleTokenMissing && !googleError && !googleCallbackFailed) {
          const newGoogleUser = searchParams.get("new_google_user") === "1";
          if (newGoogleUser) {
            toast.error(
              "We could not finish your Google sign-up in this browser. Turn off strict blocking of third-party cookies for this site, use a normal (not private) window, or register with email and password below."
            );
          } else {
            toast.error(
              "We could not complete Google sign-in from this browser. Allow cookies for this site (third-party cookies if your browser asks), try again, or sign in with your email and password if you already have an account."
            );
          }
        }
        return;
      }

      if (typeof window !== "undefined" && window.history.replaceState) {
        try {
          const u = new URL(window.location.href);
          u.searchParams.delete("jwt");
          u.searchParams.delete("oauth_handoff");
          window.history.replaceState({}, "", u.pathname + u.search + u.hash);
        } catch {
          /* ignore */
        }
      }

      const oauthRemember = sessionStorage.getItem(OAUTH_REMEMBER_KEY);
      sessionStorage.removeItem(OAUTH_REMEMBER_KEY);
      const remember = oauthRemember !== "0";
      setAuthToken(jwt, remember);

      // Prefer deterministic routing from backend flags.
      const isBlocked = searchParams.get("blocked") === "1";
      const needsProfileFlag = searchParams.get("needs_profile") === "1";
      const pendingApprovalFlag = searchParams.get("pending_approval") === "1";
      const needsPasswordSetup = searchParams.get("needs_password_setup") === "1";

      if (isBlocked) {
        clearAuthToken();
        toast.error("Your account is blocked. Please contact administration.");
        return;
      }

      if (needsPasswordSetup && localStorage.getItem("hpc_manual_password_set") !== "1") {
        toast.info("Please set a manual password for email/password login.");
        window.location.replace("/set-password");
        return;
      }

      if (needsProfileFlag) {
        toast.info("Please complete your profile to continue.");
        window.location.replace("/profile");
        return;
      }

      if (pendingApprovalFlag) {
        toast.info("Your account is pending admin verification.");
        window.location.replace("/pending-verification");
        return;
      }

      // Fallback: validate user state (handles edge cases when flags are missing).
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${jwt}` } });
      const body = await res.json().catch(() => ({}));
      const user = body?.user || {};

      if (!res.ok || !user?.id) {
        clearAuthToken();
        toast.error("Google login failed. Please try again.");
        return;
      }

      if (user.blocked) {
        clearAuthToken();
        toast.error("Your account is blocked. Please contact administration.");
        return;
      }

      const needsProfile = !user.name || !user.phone || !user.batch || !user.department;

      if (needsProfile) {
        toast.info("Please complete your profile to continue.");
        window.location.replace("/profile");
        return;
      }

      // Admin must approve again for this re-registration workflow.
      // Require both: verified + approved.
      if (!user.approved || !user.verified) {
        toast.info("Your account is pending admin verification.");
        window.location.replace("/pending-verification");
        return;
      }

      window.location.replace("/dashboard");
    };

    if (!jwtFromQuery && !oauthHandoff) {
      if (googleTokenMissing) toast.error("Google login failed (token missing). Please try again.");
      if (googleError) toast.error("Google login failed. Please try again.");
      if (googleCallbackFailed) toast.error("Google callback failed. Please try again.");
      return;
    }

    void completeGoogleLogin().catch(() => {
      clearAuthToken();
      toast.error("Google login failed. Please try again.");
    });
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password.trim()) {
      toast.error("Please enter email and password.");
      return;
    }
    setLoading(true);
    const result = await login(form.email, form.password, rememberMe);
    setLoading(false);
    if (result.success) {
      clearLoginDraft();
      toast.success(result.message);
      navigate("/dashboard");
    } else if (result.needsOtp) {
      clearLoginDraft();
      toast.warning(result.message);
      navigate("/verify-otp");
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 hpc-auth-premium-canvas">
      <div className="absolute top-4 left-4 z-10">
        <Link
          to="/"
          className="hpc-auth-card-desc inline-flex items-center gap-1 text-sm font-semibold text-white/85 transition-colors hover:text-amber-200"
        >
          ← Back to Home
        </Link>
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-3">
            <img src={hpcLogo} alt="HPC Logo" className="h-10 w-10" />
            <div className="text-left leading-tight">
              <span className="hpc-auth-brand-title block text-[16px] text-white">Hamdard Public College</span>
              <span className="hpc-auth-brand-subtitle mt-px block bg-gradient-to-r from-amber-300 via-orange-400 to-yellow-300 bg-clip-text text-[13px] text-transparent">
                ALUMNI ASSOCIATION
              </span>
            </div>
          </Link>
        </div>
        <Card className="shadow-card border-white/15 bg-card/95 backdrop-blur-md">
          <CardHeader className="text-center">
            <div className="hpc-auth-icon-ring mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/35 bg-gradient-to-br from-amber-400/25 via-orange-500/15 to-cyan-400/20">
              <LogIn className="h-6 w-6 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.35)]" strokeWidth={2.25} aria-hidden />
            </div>
            <CardTitle className="hpc-auth-card-title text-xl">Login</CardTitle>
            <CardDescription className="hpc-auth-card-desc">Sign in to your alumni account</CardDescription>
          </CardHeader>
          <CardContent>
            {emailVerifyBanner === "verified" ? (
              <Alert className="mb-4 border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-50">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <AlertTitle>Email verified</AlertTitle>
                <AlertDescription className="text-emerald-900/90 dark:text-emerald-100/90">
                  Your email address has been confirmed. Please sign in with the email and password you registered with to continue.
                </AlertDescription>
              </Alert>
            ) : null}
            {emailVerifyBanner === "already_verified" ? (
              <Alert className="mb-4 border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-800 dark:bg-sky-950/35 dark:text-sky-50">
                <Info className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden />
                <AlertTitle>Already verified</AlertTitle>
                <AlertDescription className="text-sky-900/90 dark:text-sky-100/90">
                  This link was already used and your email is verified. Sign in below—no need to verify again.
                </AlertDescription>
              </Alert>
            ) : null}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="hpc-auth-card-desc font-semibold text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="example@mail.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="hpc-auth-card-desc font-semibold text-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Your password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md text-slate-500 transition-colors hover:text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={2.25} /> : <Eye className="h-4 w-4" strokeWidth={2.25} />}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={(v) => setRememberMe(v === true)}
                      className="border-amber-500/70 text-[#1a0d04] shadow-[0_0_12px_rgba(251,191,36,0.15)] data-[state=checked]:border-amber-500 data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-amber-500 data-[state=checked]:to-orange-600 data-[state=checked]:text-[#1a0d04] data-[state=checked]:shadow-[0_0_14px_rgba(251,146,60,0.35)] focus-visible:ring-amber-400/60"
                    />
                    <Label htmlFor="remember-me" className="hpc-auth-card-desc cursor-pointer text-sm font-medium leading-none">
                      Remember me
                    </Label>
                  </div>
                  <Link
                    to="/forgot-password"
                    className="hpc-auth-card-desc shrink-0 text-sm font-semibold text-amber-700 hover:text-amber-600 hover:underline dark:text-amber-400 dark:hover:text-amber-300"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>
              <Button type="submit" size="lg" className="hpc-auth-btn-primary w-full min-h-11" disabled={loading}>
                {loading ? "Please wait..." : "Login"}
              </Button>

              <Button
                type="button"
                size="lg"
                variant="outline"
                className="hpc-auth-btn-secondary w-full min-h-11 gap-2 [&_svg]:shrink-0"
                onClick={() => {
                  try {
                    sessionStorage.setItem(OAUTH_REMEMBER_KEY, rememberMe ? "1" : "0");
                  } catch {
                    /* ignore */
                  }
                  window.location.href = `${API_BASE_URL}/api/auth/google`;
                }}
              >
                <GoogleMark className="h-5 w-5 shrink-0" />
                Continue with Google
              </Button>

              <div className="hpc-auth-card-desc space-y-2 text-center text-sm text-muted-foreground">
                <p>
                  Don&apos;t have an account?{" "}
                  <Link to="/register" className="font-semibold text-amber-700 hover:text-amber-600 hover:underline dark:text-amber-400 dark:hover:text-amber-300">
                    Register
                  </Link>
                </p>
                <p>
                  <Link
                    to="/admin/login"
                    className="font-medium text-muted-foreground transition-colors hover:text-amber-700 hover:underline dark:hover:text-amber-400"
                  >
                    Admin Login
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
