import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Shield, Eye, EyeOff } from "lucide-react";
import hpcLogo from "@/assets/hpc-logo.png";

const AdminLogin = () => {
  const { adminLogin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password.trim()) {
      toast.error("Please enter email and password.");
      return;
    }
    setLoading(true);
    const result = await adminLogin(form.email, form.password);
    setLoading(false);
    if (result.success) {
      toast.success(result.message);
      navigate("/admin/dashboard");
    } else {
      toast.error(result.message);
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
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Admin Login</CardTitle>
            <CardDescription>Sign in to the admin panel</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Admin Email</Label>
                <Input id="email" type="email" placeholder="Your registered admin email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="Admin password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" size="lg" className="w-full bg-gradient-hpc hover:opacity-90 text-primary-foreground font-semibold" disabled={loading}>
                {loading ? "Please wait..." : "Admin Login"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <Link to="/login" className="text-primary font-medium hover:underline">Alumni Login</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
