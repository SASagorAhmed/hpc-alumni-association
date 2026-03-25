import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ThemeToggleFixedFallback } from "@/components/ThemeToggleFixedFallback";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import Index from "./pages/Index.tsx";
import MemberDetail from "./pages/MemberDetail.tsx";
import MemoryDetail from "./pages/MemoryDetail.tsx";
import CommitteeMemberProfile from "./pages/CommitteeMemberProfile.tsx";
import NotFound from "./pages/NotFound.tsx";
import Register from "./pages/auth/Register.tsx";
import Login from "./pages/auth/Login.tsx";
import AdminLogin from "./pages/auth/AdminLogin.tsx";
import VerifyOTP from "./pages/auth/VerifyOTP.tsx";
import SetPassword from "./pages/auth/SetPassword.tsx";
import PendingVerification from "./pages/auth/PendingVerification.tsx";
import AlumniDashboard from "./pages/dashboard/AlumniDashboard.tsx";
import AdminDashboard from "./pages/dashboard/AdminDashboard.tsx";
import Profile from "./pages/profile/Profile.tsx";

// Alumni pages
import Committee from "./pages/alumni/Committee.tsx";
import Directory from "./pages/alumni/Directory.tsx";
import Elections from "./pages/alumni/Elections.tsx";
import Events from "./pages/alumni/Events.tsx";
import EventDetail from "./pages/alumni/EventDetail.tsx";
import Donations from "./pages/alumni/Donations.tsx";
import Notices from "./pages/alumni/Notices.tsx";
import NoticeDetail from "./pages/alumni/NoticeDetail.tsx";
import Documents from "./pages/alumni/Documents.tsx";

// Admin pages
import AdminUsers from "./pages/admin/AdminUsers.tsx";
import AdminCommittee from "./pages/admin/AdminCommittee.tsx";
import AdminElections from "./pages/admin/AdminElections.tsx";
import AdminCandidates from "./pages/admin/AdminCandidates.tsx";
import AdminWinners from "./pages/admin/AdminWinners.tsx";
import AdminAchievements from "./pages/admin/AdminAchievements.tsx";
import AdminEvents from "./pages/admin/AdminEvents.tsx";
import AdminDonations from "./pages/admin/AdminDonations.tsx";
import AdminNotices from "./pages/admin/AdminNotices.tsx";
import AdminDocuments from "./pages/admin/AdminDocuments.tsx";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs.tsx";
import AdminSettings from "./pages/admin/AdminSettings.tsx";
import AdminLandingEditor from "./pages/admin/AdminLandingEditor.tsx";
import AdminMemories from "./pages/admin/AdminMemories.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ThemeToggleFixedFallback />
            <Routes>
              {/* Public */}
              <Route path="/" element={<Index />} />
              <Route path="/member/:id" element={<MemberDetail />} />
              <Route path="/memories/:id" element={<MemoryDetail />} />
              <Route path="/committee/member/:id" element={<CommitteeMemberProfile />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/verify-otp" element={<VerifyOTP />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/set-password" element={<SetPassword />} />
              </Route>
              <Route element={<ProtectedRoute allowUnapproved />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/pending-verification" element={<PendingVerification />} />
                </Route>
              </Route>

              {/* Alumni Routes - nested under persistent DashboardLayout */}
              <Route element={<ProtectedRoute requiredRole="alumni" />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/dashboard" element={<AlumniDashboard />} />
                  <Route path="/committee" element={<Committee />} />
                  <Route path="/directory" element={<Directory />} />
                  <Route path="/elections" element={<Elections />} />
                  <Route path="/events" element={<Events />} />
                  <Route path="/events/:id" element={<EventDetail />} />
                  <Route path="/donations" element={<Donations />} />
                  <Route path="/notices" element={<Notices />} />
                  <Route path="/notices/:id" element={<NoticeDetail />} />
                  <Route path="/documents" element={<Documents />} />
                </Route>
              </Route>

              {/* Profile - any authenticated user */}
              <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/profile" element={<Profile />} />
                </Route>
              </Route>

              {/* Admin Routes - nested under persistent DashboardLayout */}
              <Route element={<ProtectedRoute requiredRole="admin" />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/committee" element={<AdminCommittee />} />
                  <Route path="/admin/elections" element={<AdminElections />} />
                  <Route path="/admin/candidates" element={<AdminCandidates />} />
                  <Route path="/admin/winners" element={<AdminWinners />} />
                  <Route path="/admin/achievements" element={<AdminAchievements />} />
                  <Route path="/admin/events" element={<AdminEvents />} />
                  <Route path="/admin/donations" element={<AdminDonations />} />
                  <Route path="/admin/notices" element={<AdminNotices />} />
                  <Route path="/admin/documents" element={<AdminDocuments />} />
                  <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
                  <Route path="/admin/settings" element={<AdminSettings />} />
                  <Route path="/admin/landing-editor" element={<AdminLandingEditor />} />
                  <Route path="/admin/memories" element={<AdminMemories />} />
                </Route>
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
