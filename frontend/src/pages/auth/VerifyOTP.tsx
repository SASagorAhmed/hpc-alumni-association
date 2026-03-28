import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MailCheck } from "lucide-react";
import hpcLogo from "@/assets/hpc-logo.png";
import { API_BASE_URL } from "@/api-production/api.js";
import { toast } from "sonner";

const VerifyOTP = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const status = searchParams.get("status");

  const resend = async () => {
    if (!email.trim()) {
      toast.error("Please enter your email address.");
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
        toast.error(body?.error || "Failed to resend verification link.");
        return;
      }
      toast.success(body?.message || "Verification email sent.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #065F46, #059669, #064E3B)' }}
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
        <Card className="shadow-card bg-card/95 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <MailCheck className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Check Your Email</CardTitle>
            <CardDescription>We've sent a verification link to your email address</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {status ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-left text-sm text-amber-900">
                {status === "invalid_or_used"
                  ? "This verification link is invalid or already used. Request a new one below."
                  : status === "expired"
                    ? "This verification link expired. Request a new one below."
                    : status === "server_error"
                      ? "We could not complete verification (server or database issue). Try again in a moment or use Resend below. If it keeps failing, confirm the site address with your administrator."
                    : "Verification link is missing or invalid. Request a new one below."}
              </div>
            ) : null}
            <p className="text-sm text-muted-foreground">
              Please click the link in the email to verify your account. Once verified, you can log in.
            </p>
            <div className="space-y-2 text-left">
              <Input
                type="email"
                placeholder="Enter your email to resend verification link"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="button" onClick={resend} disabled={sending} className="w-full">
                {sending ? "Sending..." : "Resend Verification Email"}
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
