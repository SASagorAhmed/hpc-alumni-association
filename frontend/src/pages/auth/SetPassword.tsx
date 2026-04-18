import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { API_BASE_URL } from "@/api-production/api.js";
import { getAuthToken } from "@/lib/authToken";

const SetPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ password: "", confirmPassword: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    const token = getAuthToken();
    if (!token) {
      toast.error("Please log in again.");
      navigate("/login");
      return;
    }
    setLoading(true);
    const res = await fetch(`${API_BASE_URL}/api/auth/set-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ newPassword: form.password }),
    });
    const body = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      toast.error(body?.error || "Failed to set password.");
      return;
    }
    toast.success("Password set successfully. You can now log in manually with email/password.");
    localStorage.setItem("hpc_manual_password_set", "1");
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 hpc-auth-premium-canvas">
      <Card className="w-full max-w-md border-white/15 bg-card/95 shadow-card backdrop-blur-md">
        <CardHeader>
          <CardTitle>Set Manual Password</CardTitle>
          <CardDescription>
            You signed in with Google. Set a password to allow manual email/password login too.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm Password</Label>
              <Input
                id="confirm"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving..." : "Set Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetPassword;

