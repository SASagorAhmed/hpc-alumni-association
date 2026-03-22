import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { UserPlus, Eye, EyeOff } from "lucide-react";
import hpcLogo from "@/assets/hpc-logo.png";

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    batch: "",
    department: "",
  });

  const currentYear = new Date().getFullYear();
  const batchYears = Array.from({ length: 40 }, (_, i) => String(currentYear - i));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email";
    if (form.password.length < 6) e.password = "Password must be at least 6 characters";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
    if (!form.phone.trim() || !/^[\d+\-() ]{7,15}$/.test(form.phone)) e.phone = "Enter a valid phone number";
    if (!form.batch) e.batch = "Please select a batch";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const result = await register({
      name: form.name,
      email: form.email,
      password: form.password,
      phone: form.phone,
      batch: form.batch,
      department: form.department,
    });
    setLoading(false);
    if (result.success) {
      toast.success(result.message);
      navigate("/verify-otp");
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #065F46, #059669, #064E3B)' }}
    >
      <div className="w-full max-w-lg">
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
              <UserPlus className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Register</CardTitle>
            <CardDescription>Create a new alumni account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input id="name" placeholder="Your name" maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" placeholder="example@mail.com" maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="At least 6 characters" maxLength={100} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input id="confirmPassword" type="password" placeholder="Re-enter password" maxLength={100} value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
                  {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input id="phone" placeholder="+880..." maxLength={15} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="batch">Batch/Year *</Label>
                  <Select value={form.batch} onValueChange={(v) => setForm({ ...form, batch: v })}>
                    <SelectTrigger id="batch"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {batchYears.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.batch && <p className="text-xs text-destructive">{errors.batch}</p>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="department">Department (Optional)</Label>
                <Input id="department" placeholder="e.g. Science, Humanities, Commerce" maxLength={100} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </div>
              <Button type="submit" size="lg" className="w-full bg-gradient-hpc hover:opacity-90 text-primary-foreground font-semibold" disabled={loading}>
                {loading ? "Please wait..." : "Register"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary font-medium hover:underline">Login</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
