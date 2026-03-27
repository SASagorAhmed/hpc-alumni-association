import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY = "hpc_admin_view_as_alumni";

type AdminViewAsAlumniContextType = {
  viewAsAlumni: boolean;
  setViewAsAlumni: (value: boolean) => void;
};

const AdminViewAsAlumniContext = createContext<AdminViewAsAlumniContextType | null>(null);

function readStored(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function AdminViewAsAlumniProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [viewAsAlumni, setViewAsAlumniState] = useState(readStored);
  /** Tracks that we had a logged-in user, so we don't wipe preview while `user` is still null during auth bootstrap (e.g. refresh). */
  const hadAuthenticatedUserRef = useRef(false);

  const setViewAsAlumni = useCallback((value: boolean) => {
    setViewAsAlumniState(value);
    try {
      if (value) sessionStorage.setItem(STORAGE_KEY, "1");
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (user) {
      hadAuthenticatedUserRef.current = true;
      if (user.role !== "admin" && readStored()) {
        setViewAsAlumniState(false);
        try {
          sessionStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
      }
      return;
    }

    if (!hadAuthenticatedUserRef.current) {
      return;
    }

    hadAuthenticatedUserRef.current = false;
    setViewAsAlumniState(false);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, [user]);

  return (
    <AdminViewAsAlumniContext.Provider value={{ viewAsAlumni, setViewAsAlumni }}>
      {children}
    </AdminViewAsAlumniContext.Provider>
  );
}

/** When context is missing, returns a no-op (safe for rare mounts outside the provider). */
export function useAdminViewAsAlumni(): AdminViewAsAlumniContextType {
  const ctx = useContext(AdminViewAsAlumniContext);
  if (!ctx) {
    return { viewAsAlumni: false, setViewAsAlumni: () => {} };
  }
  return ctx;
}

/** Use admin-only notifications / dashboard links when user is admin and not in alumni preview mode. */
export function useAdminNotificationRoutes(user: { role: string } | null | undefined): boolean {
  const { viewAsAlumni } = useAdminViewAsAlumni();
  if (!user || user.role !== "admin") return false;
  return !viewAsAlumni;
}
