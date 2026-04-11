import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock3, UserCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const PendingVerification = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    if (user.approved && user.verified) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock3 className="w-5 h-5 text-amber-600" />
            Account Verification Pending
          </CardTitle>
          <CardDescription>
            Your account is created successfully, but full access is locked until admin approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Current status: Pending Admin Verification</p>
              <p className="mt-1">
                Signed in as <span className="font-semibold">{user?.email}</span>. Please wait for admin to verify and approve your alumni profile.
              </p>
            </div>
          </div>

          {user?.profileReviewNote ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 text-center">
              <p className="font-semibold uppercase tracking-wide text-[11px] text-amber-700">Correction feedback</p>
              <p className="mt-2 font-medium leading-relaxed">{user.profileReviewNote}</p>
              <p className="mt-2 text-xs text-amber-700/90">
                Update your profile based on this message, then wait for admin verification.
              </p>
            </div>
          ) : null}

          <div className="rounded-md border p-3 text-sm">
            <p className="font-medium flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              What you can do now
            </p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>Complete or update your profile details</li>
              <li>Wait for admin review and approval</li>
              <li>Log out and return later</li>
            </ul>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/profile">Complete / Update Profile</Link>
            </Button>
            <Button variant="outline" onClick={logout}>
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingVerification;

