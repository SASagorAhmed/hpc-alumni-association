import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { API_BASE_URL } from "@/api-production/api.js";

export type UserRole = "alumni" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  batch: string;
  roll?: string;
  registrationNumber?: string;
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
  jobStatus?: string;
  jobTitle?: string;
  address?: string;
  bio?: string;
  additionalInfo?: string;
  photo?: string;
  socialLinks?: Record<string, string>;
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
  login: (email: string, password: string) => Promise<{ success: boolean; message: string; needsOtp?: boolean }>;
  adminLogin: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; message: string }>;
  verifyOtp: (otp: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; message: string }>;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone: string;
  batch: string;
  section: string;
  faculty: string;
  roll: string;
  gender: string;
  photoFile?: File;
  bloodGroup: string;
  university: string;
  company: string;
  profession: string;
  address: string;
  bio: string;
  additionalInfo: string;
  facebook: string;
  instagram: string;
  linkedin: string;
}

const TOKEN_STORAGE_KEY = "hpc_auth_token";

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (!token) {
          setUser(null);
          return;
        }

        const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          setUser(null);
          return;
        }

        const data = await res.json();
        const u = data?.user as User | undefined;
        setUser(u || null);
      } catch (_e) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, []);

  const register = async (data: RegisterData) => {
    const fd = new FormData();
    fd.set("email", data.email);
    fd.set("password", data.password);
    fd.set("name", data.name);
    fd.set("phone", data.phone);
    fd.set("batch", data.batch);
    fd.set("section", data.section || "");
    fd.set("faculty", data.faculty || "");
    fd.set("roll", data.roll);
    fd.set("gender", data.gender);
    fd.set("bloodGroup", data.bloodGroup);
    fd.set("university", data.university);
    fd.set("company", data.company);
    fd.set("profession", data.profession);
    fd.set("address", data.address);
    fd.set("bio", data.bio);
    fd.set("additionalInfo", data.additionalInfo);
    fd.set("facebook", data.facebook);
    fd.set("instagram", data.instagram);
    fd.set("linkedin", data.linkedin);
    if (data.photoFile) fd.append("photo", data.photoFile);

    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      body: fd,
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, message: body?.error || "Registration failed" };
    return { success: true, message: body?.message || "Registration successful! Please check your email to verify your account." };
  };

  const verifyOtp = async (_otp: string) => {
    return { success: false, message: "Please check your email and click the verification link." };
  };

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, message: body?.error || "Login failed." };

    const token = body?.token as string | undefined;
    const u = body?.user as User | undefined;
    if (!token || !u) return { success: false, message: "Login failed." };

    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    setUser(u);
    return { success: true, message: "Login successful!" };
  };

  const adminLogin = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, message: body?.error || "Login failed." };

    const token = body?.token as string | undefined;
    const u = body?.user as User | undefined;
    if (!token || !u) return { success: false, message: "Login failed." };

    if (u.role !== "admin") {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setUser(null);
      return { success: false, message: "You do not have admin access." };
    }

    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    setUser(u);
    return { success: true, message: "Admin login successful!" };
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) return { success: false, message: "Please log in." };
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) return { success: false, message: "Please log in." };

    const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, message: body?.error || "Failed to update profile." };
    if (body?.user) setUser(body.user as User);
    return { success: true, message: "Profile updated successfully. Pending admin verification." };
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, adminLogin, register, verifyOtp, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
