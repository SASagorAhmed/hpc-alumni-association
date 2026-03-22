import { Navigate, Outlet } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requiredRole?: UserRole;
  allowUnapproved?: boolean;
}

const ProtectedRoute = ({ children, requiredRole, allowUnapproved = false }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === "admin" ? "/admin/dashboard" : "/dashboard"} replace />;
  }

  if (requiredRole === "alumni" && !allowUnapproved && !user.approved) {
    return <Navigate to="/pending-verification" replace />;
  }

  return <>{children ?? <Outlet />}</>;
};

export default ProtectedRoute;
