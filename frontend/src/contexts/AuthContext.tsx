import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { API_BASE_URL } from "@/api-production/api.js";
import { getAuthToken, setAuthToken, clearAuthToken } from "@/lib/authToken";
import { clearUserDisplayCache, saveUserDisplayCache } from "@/lib/userDisplayCache";

export type UserRole = "alumni" | "admin";

export interface User {
  id: string;
  name: string;
  /** Optional; shown only on the public directory detail page. Lists use full name. */
  nickname?: string | null;
  email: string;
  phone: string;
  batch: string;
  roll?: string;
  registrationNumber?: string;
  /** Committee post title(s) from current published term — set by admin only. */
  adminCommitteeDesignation?: string | null;
  gender?: string;
  bloodGroup?: string;
  department?: string;
  faculty?: string;
  session?: string;
  passingYear?: string;
  collegeName?: string;
  profession?: string;
  company?: string;
  university?: string;
  /** Short label (e.g. DU, BUET); required at registration, editable later. */
  universityShortName?: string | null;
  jobStatus?: string;
  jobTitle?: string;
  address?: string;
  bio?: string;
  additionalInfo?: string;
  photo?: string;
  socialLinks?: Record<string, string>;
  /** ISO date YYYY-MM-DD */
  birthday?: string | null;
  role: UserRole;
  verified: boolean;
  approved: boolean;
  blocked?: boolean;
  profilePending?: boolean;
  profileReviewNote?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthReady: boolean;
  login: (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ success: boolean; message: string; needsOtp?: boolean }>;
  adminLogin: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; message: string }>;
  register: (data: RegisterData) => Promise<{
    success: boolean;
    message: string;
    googleRegister?: boolean;
    /** Assigned registration number (Alumni ID); present when registration succeeds. */
    alumniId?: string;
    verifyEmail?: string;
    needsOtpVerification?: boolean;
  }>;
  verifyOtp: (email: string, otp: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  updateProfile: (data: Partial<User> & { photoFile?: File }) => Promise<{ success: boolean; message: string }>;
}

interface RegisterData {
  name: string;
  nickname: string;
  email: string;
  password: string;
  phone: string;
  batch: string;
  /** Academic session / passing year label, e.g. 2020-2021 */
  passingSession: string;
  section: string;
  faculty: string;
  roll: string;
  gender: string;
  photoFile?: File;
  bloodGroup: string;
  university: string;
  /** Required short form (not locked); editable in profile later. */
  universityShortName: string;
  company: string;
  profession: string;
  address: string;
  bio: string;
  additionalInfo: string;
  facebook: string;
  instagram: string;
  linkedin: string;
  /** ISO date YYYY-MM-DD; optional at registration */
  birthday?: string;
  /** When true, sends draft cookie + marks Google-assisted registration (email verified server-side). */
  googleRegister?: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      setIsLoading(true);
      try {
        const token = getAuthToken();
        if (!token) {
          setUser(null);
          clearUserDisplayCache();
          return;
        }

        const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          clearAuthToken();
          setUser(null);
          clearUserDisplayCache();
          return;
        }

        const data = await res.json().catch(() => ({}));
        const u = data?.user as User | undefined;
        if (!u) {
          clearAuthToken();
          setUser(null);
          clearUserDisplayCache();
          return;
        }
        setUser(u);
        saveUserDisplayCache(u);
      } catch (_e) {
        clearAuthToken();
        setUser(null);
        clearUserDisplayCache();
      } finally {
        setIsLoading(false);
        setIsAuthReady(true);
      }
    };

    bootstrap();
  }, []);

  const register = async (data: RegisterData) => {
    const fd = new FormData();
    fd.set("email", data.email);
    fd.set("password", data.password);
    fd.set("name", data.name);
    fd.set("nickname", data.nickname.trim());
    fd.set("phone", data.phone);
    fd.set("batch", data.batch);
    fd.set("passingSession", data.passingSession || "");
    fd.set("section", data.section || "");
    fd.set("faculty", data.faculty || "");
    fd.set("roll", data.roll);
    fd.set("gender", data.gender);
    fd.set("bloodGroup", data.bloodGroup);
    fd.set("university", data.university);
    fd.set("universityShortName", data.universityShortName.trim());
    fd.set("company", data.company);
    fd.set("profession", data.profession);
    fd.set("address", data.address);
    fd.set("bio", data.bio);
    fd.set("additionalInfo", data.additionalInfo);
    fd.set("facebook", data.facebook);
    fd.set("instagram", data.instagram);
    fd.set("linkedin", data.linkedin);
    if (data.birthday != null && String(data.birthday).trim()) {
      fd.set("birthday", String(data.birthday).trim());
    }
    if (data.photoFile) fd.append("photo", data.photoFile);
    if (data.googleRegister) fd.set("googleRegister", "1");

    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      credentials: "include",
      body: fd,
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, message: body?.error || "Registration failed" };
    const alumniIdRaw = body?.alumni_id;
    const alumniId = typeof alumniIdRaw === "string" && alumniIdRaw.trim() ? alumniIdRaw.trim() : undefined;
    return {
      success: true,
      message:
        body?.message ||
        (body?.google_register
          ? "Registration successful. You can sign in with Google or your password."
          : "Registration successful! Please check your email to verify your account."),
      googleRegister: Boolean(body?.google_register),
      alumniId,
      verifyEmail: typeof body?.verify_email === "string" ? body.verify_email : data.email,
      needsOtpVerification: Boolean(body?.needsOtpVerification),
    };
  };

  const verifyOtp = async (email: string, otp: string) => {
    const emailNorm = String(email || "").trim().toLowerCase();
    const otpNorm = String(otp || "").trim();
    if (!emailNorm || !otpNorm) {
      return { success: false, message: "Email and OTP are required." };
    }
    const res = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailNorm, otp: otpNorm }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, message: body?.error || "OTP verification failed." };
    }
    return { success: true, message: body?.message || "Email verified successfully." };
  };

  const login = async (email: string, password: string, rememberMe = true) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, rememberMe }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, message: body?.error || "Login failed." };

    const token = body?.token as string | undefined;
    const u = body?.user as User | undefined;
    if (!token || !u) return { success: false, message: "Login failed." };

    setAuthToken(token, rememberMe);
    setUser(u);
    saveUserDisplayCache(u);
    setIsLoading(false);
    setIsAuthReady(true);
    return { success: true, message: "Login successful!" };
  };

  const adminLogin = async (email: string, password: string, rememberMe = true) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, rememberMe }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, message: body?.error || "Login failed." };

    const token = body?.token as string | undefined;
    const u = body?.user as User | undefined;
    if (!token || !u) return { success: false, message: "Login failed." };

    if (u.role !== "admin") {
      clearAuthToken();
      setUser(null);
      clearUserDisplayCache();
      return { success: false, message: "You do not have admin access." };
    }

    setAuthToken(token, rememberMe);
    setUser(u);
    saveUserDisplayCache(u);
    setIsLoading(false);
    setIsAuthReady(true);
    return { success: true, message: "Admin login successful!" };
  };

  const logout = async () => {
    setUser(null);
    clearAuthToken();
    clearUserDisplayCache();
    setIsAuthReady(true);
  };

  const updateProfile = async (data: Partial<User> & { photoFile?: File }) => {
    if (!user) return { success: false, message: "Please log in." };
    const token = getAuthToken();
    if (!token) return { success: false, message: "Please log in." };

    const { photoFile, ...rest } = data;

    let res: Response;
    if (photoFile) {
      const fd = new FormData();
      for (const [key, value] of Object.entries(rest)) {
        if (value === undefined) continue;
        if (key === "socialLinks" && value && typeof value === "object") {
          fd.append("socialLinks", JSON.stringify(value));
        } else {
          fd.append(key, value === null ? "" : String(value));
        }
      }
      fd.append("photo", photoFile);
      res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      });
    } else {
      res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(rest),
      });
    }

    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, message: body?.error || "Failed to update profile." };
    if (body?.user) {
      const next = body.user as User;
      setUser(next);
      saveUserDisplayCache(next);
    }
    return { success: true, message: "Profile updated successfully." };
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthReady, login, adminLogin, register, verifyOtp, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
