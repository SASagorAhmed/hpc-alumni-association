import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MailCheck } from "lucide-react";
import hpcLogo from "@/assets/hpc-logo.png";

const VerifyOTP = () => {
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
            <p className="text-sm text-muted-foreground">
              Please click the link in the email to verify your account. Once verified, you can log in.
            </p>
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
