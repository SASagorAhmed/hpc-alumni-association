import { Navigate, Outlet } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { useAdminViewAsAlumni } from "@/contexts/AdminViewAsAlumniContext";

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requiredRole?: UserRole;
  allowUnapproved?: boolean;
}

const ProtectedRoute = ({ children, requiredRole, allowUnapproved = false }: ProtectedRouteProps) => {
  const { user, isLoading, isAuthReady } = useAuth();
  const { viewAsAlumni } = useAdminViewAsAlumni();

  if (!isAuthReady || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto flex h-11 max-w-7xl items-center border-b border-border/70 px-4 lg:px-6">
          <div className="h-5 w-28 animate-pulse rounded bg-muted" />
        </div>
        <div className="mx-auto max-w-7xl p-4 lg:p-6">
          <div className="mb-4 h-8 w-44 animate-pulse rounded bg-muted" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="h-28 animate-pulse rounded-xl border border-border/60 bg-card" />
            <div className="h-28 animate-pulse rounded-xl border border-border/60 bg-card" />
            <div className="h-28 animate-pulse rounded-xl border border-border/60 bg-card" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    const adminMayUseAlumniRoutes = user.role === "admin" && requiredRole === "alumni" && viewAsAlumni;
    if (!adminMayUseAlumniRoutes) {
      return <Navigate to={user.role === "admin" && !viewAsAlumni ? "/admin/dashboard" : "/dashboard"} replace />;
    }
  }

  // Alumni dashboard: require both email/admin verification (`verified`)
  // and admin approval (`approved`).
  const alumniOk = Boolean(user.approved) && Boolean(user.verified);
  if (requiredRole === "alumni" && !allowUnapproved && !alumniOk) {
    return <Navigate to="/pending-verification" replace />;
  }

  return <>{children ?? <Outlet />}</>;
};

export default ProtectedRoute;
