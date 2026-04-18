import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import hpcLogo from "@/assets/hpc-logo.png";
import { API_BASE_URL } from "@/api-production/api.js";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      toast.error("Please enter your email.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof body?.error === "string" ? body.error : "Request failed.");
        return;
      }
      setSent(true);
      toast.success(body?.message || "If an account exists for that email, check your inbox.");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center p-4 hpc-auth-premium-canvas"
    >
      <div className="absolute top-4 left-4 z-10">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-amber-300 transition-colors">
          ← Back to Login
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
        <Card className="shadow-card border-white/15 bg-card/95 backdrop-blur-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <KeyRound className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Forgot password</CardTitle>
            <CardDescription>We will email you a link to reset your password</CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4 text-center text-sm text-muted-foreground">
                <p>If an account exists for that email, you will receive password reset instructions shortly.</p>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/login">Return to login</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="example@mail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-gradient-hpc hover:opacity-90 text-primary-foreground font-semibold"
                  disabled={loading}
                >
                  {loading ? "Please wait..." : "Send reset link"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  <Link to="/login" className="text-primary font-medium hover:underline">
                    Back to login
                  </Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
