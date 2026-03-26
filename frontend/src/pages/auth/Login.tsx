import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { LogIn, Eye, EyeOff } from "lucide-react";
import hpcLogo from "@/assets/hpc-logo.png";
import { API_BASE_URL } from "@/api-production/api.js";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  useEffect(() => {
    const googleTokenMissing = searchParams.get("google_token_missing") === "1";
    const googleError = searchParams.get("google_error") === "1";
    const googleCallbackFailed = searchParams.get("google_callback_failed") === "1";
    const oauthHandoff = searchParams.get("oauth_handoff") === "1";
    const jwtFromQuery = searchParams.get("jwt");

    const completeGoogleLogin = async () => {
      let jwt = jwtFromQuery;

      if (oauthHandoff) {
        try {
          const handoffRes = await fetch(`${API_BASE_URL}/api/auth/oauth-handoff`, {
            method: "POST",
            credentials: "include",
          });
          const handoffBody = await handoffRes.json().catch(() => ({}));
          if (handoffBody?.token) jwt = handoffBody.token;
        } catch {
          /* use jwt from query if present */
        }
      }

      if (!jwt) {
        if (googleTokenMissing) toast.error("Google login failed (token missing). Please try again.");
        if (googleError) toast.error("Google login failed. Please try again.");
        if (googleCallbackFailed) toast.error("Google callback failed. Please try again.");
        if (oauthHandoff && !googleTokenMissing && !googleError && !googleCallbackFailed) {
          toast.error("Could not complete Google sign-in (no session cookie). Allow cookies for localhost or try again.");
        }
        return;
      }

      localStorage.setItem("hpc_auth_token", jwt);

      // Prefer deterministic routing from backend flags.
      const isBlocked = searchParams.get("blocked") === "1";
      const needsProfileFlag = searchParams.get("needs_profile") === "1";
      const pendingApprovalFlag = searchParams.get("pending_approval") === "1";
      const needsPasswordSetup = searchParams.get("needs_password_setup") === "1";

      if (isBlocked) {
        localStorage.removeItem("hpc_auth_token");
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
        localStorage.removeItem("hpc_auth_token");
        toast.error("Google login failed. Please try again.");
        return;
      }

      if (user.blocked) {
        localStorage.removeItem("hpc_auth_token");
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
      localStorage.removeItem("hpc_auth_token");
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
    const result = await login(form.email, form.password);
    setLoading(false);
    if (result.success) {
      toast.success(result.message);
      navigate("/dashboard");
    } else if (result.needsOtp) {
      toast.warning(result.message);
      navigate("/verify-otp");
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #065F46, #059669, #064E3B)' }}
    >
      <div className="absolute top-4 left-4 z-10">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-amber-300 transition-colors">
          ← Back to Home
        </Link>
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-3">
            <img src={hpcLogo} alt="HPC Logo" className="h-10 w-10" />
            <div className="leading-tight text-left">
              <span className="block text-[16px] font-bold text-white">Hamdard Public College</span>
              <span className="block text-amber-400 text-[13px] font-extrabold tracking-wider">ALUMNI ASSOCIATION</span>
            </div>
          </Link>
        </div>
        <Card className="shadow-card bg-card/95 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <LogIn className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Login</CardTitle>
            <CardDescription>Sign in to your alumni account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="example@mail.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="Your password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" size="lg" className="w-full bg-gradient-hpc hover:opacity-90 text-primary-foreground font-semibold" disabled={loading}>
                {loading ? "Please wait..." : "Login"}
              </Button>

              <Button
                type="button"
                size="lg"
                variant="outline"
                className="w-full"
                onClick={() => {
                  window.location.href = `${API_BASE_URL}/api/auth/google`;
                }}
              >
                Continue with Google
              </Button>

              <div className="text-center space-y-2 text-sm text-muted-foreground">
                <p>
                  Don't have an account?{" "}
                  <Link to="/register" className="text-primary font-medium hover:underline">Register</Link>
                </p>
                <p>
                  <Link to="/admin/login" className="text-muted-foreground hover:text-primary hover:underline">Admin Login</Link>
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
