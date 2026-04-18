import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MailCheck } from "lucide-react";
import hpcLogo from "@/assets/hpc-logo.png";
import { API_BASE_URL } from "@/api-production/api.js";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const VerifyOTP = () => {
  const { verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { email?: string } };
  const [searchParams] = useSearchParams();
  const routeEmail = String(location.state?.email || "").trim().toLowerCase();
  const queryEmail = String(searchParams.get("email") || "").trim().toLowerCase();
  const sessionEmail = String(sessionStorage.getItem("pending_verify_email") || "").trim().toLowerCase();
  const initialEmail = useMemo(() => routeEmail || queryEmail || sessionEmail, [routeEmail, queryEmail, sessionEmail]);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const status = searchParams.get("status");
  const isLockedEmail = Boolean(initialEmail);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
      sessionStorage.setItem("pending_verify_email", initialEmail);
    }
  }, [initialEmail]);

  const submitOtp = async () => {
    const otpNorm = String(otp || "").replace(/\D/g, "").slice(0, 6);
    if (!email.trim()) {
      toast.error("Verification email is missing.");
      return;
    }
    if (otpNorm.length !== 6) {
      toast.error("Enter your 6-digit OTP code.");
      return;
    }
    setVerifying(true);
    const result = await verifyOtp(email.trim().toLowerCase(), otpNorm);
    setVerifying(false);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    sessionStorage.removeItem("pending_verify_email");
    toast.success(result.message);
    navigate("/login?verified=1", { replace: true });
  };

  const resend = async () => {
    if (!email.trim()) {
      toast.error("Verification email is missing.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body?.error || "Failed to resend verification OTP.");
        return;
      }
      toast.success(body?.message || "Verification OTP sent.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4 hpc-auth-premium-canvas"
    >
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
              <MailCheck className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Verify Email by OTP</CardTitle>
            <CardDescription>Enter the 6-digit code sent to your email address</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {status ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-left text-sm text-amber-900">
                {status === "invalid_or_used"
                  ? "This verification request is invalid or already used. Request a new OTP below."
                  : status === "expired"
                    ? "This verification request expired. Request a new OTP below."
                    : status === "server_error"
                      ? "We could not complete verification (server or database issue). Try again in a moment or resend OTP below."
                    : "Verification request is missing or invalid. Request a new OTP below."}
              </div>
            ) : null}
            <p className="text-sm text-muted-foreground">
              Enter the OTP code from your email. The latest code is valid for a short time only.
            </p>
            <div className="space-y-2 text-left">
              <Input
                type="email"
                placeholder="Verification email"
                value={email}
                readOnly={isLockedEmail}
                className={isLockedEmail ? "bg-muted cursor-not-allowed opacity-90" : undefined}
                onChange={(e) => {
                  if (isLockedEmail) return;
                  setEmail(e.target.value);
                }}
              />
              {isLockedEmail ? (
                <p className="text-xs text-muted-foreground">Email is locked to your registered account for security.</p>
              ) : null}
              <Input
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(String(e.target.value || "").replace(/\D/g, "").slice(0, 6))}
              />
              <Button type="button" onClick={submitOtp} disabled={verifying} className="w-full">
                {verifying ? "Verifying..." : "Verify OTP"}
              </Button>
              <Button type="button" onClick={resend} disabled={sending} className="w-full">
                {sending ? "Sending..." : "Resend OTP"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              <Link to="/login" className="text-primary font-medium hover:underline">Back to Login</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyOTP;
