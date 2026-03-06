import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Welcome from "./pages/Welcome";
import NotFound from "./pages/NotFound";
import SenderHome from "./pages/sender/SenderHome";
import SenderDashboard from "./pages/sender/SenderDashboard";
import NewDelivery from "./pages/sender/NewDelivery";
import TrackPackage from "./pages/sender/TrackPackage";
import Cart from "./pages/sender/Cart";
import RiderDashboard from "./pages/rider/RiderDashboard";
import AgentPickupDashboard from "./pages/agent/AgentPickupDashboard";
import AgentAccountSettings from "./pages/agent/AgentAccountSettings";
import AgentPrint from "./pages/agent/AgentPrint";
import AgentPrintPackage from "./pages/agent/AgentPrintPackage";
import AgentPrintBusiness from "./pages/agent/AgentPrintBusiness";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import VerifyOTP from "./pages/auth/VerifyOTP";
import AuthCallback from "./pages/auth/AuthCallback";
import EditProfile from "./pages/profile/EditProfile";
import Notifications from "./pages/Notifications";
import Preferences from "./pages/Preferences";
import AgentList from "./pages/AgentList";
import Terms from "./pages/Terms";
import Feedback from "./pages/Feedback";
import Customers from "./pages/Customers";
import AdminDashboard from "./pages/admin/AdminDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Welcome page (landing page for unauthenticated users) */}
            <Route path="/" element={<Welcome />} />
            
            {/* Auth Routes */}
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/signup" element={<Signup />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/auth/verify" element={<VerifyOTP />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            {/* Sender Routes */}
            <Route path="/sender" element={<SenderHome />} />
            <Route path="/sender/dashboard" element={<SenderDashboard />} />
            <Route path="/sender/new" element={<NewDelivery />} />
            <Route path="/sender/track" element={<TrackPackage />} />
            <Route path="/sender/cart" element={<Cart />} />
            
            {/* Rider Routes */}
            <Route path="/rider" element={<RiderDashboard />} />

            {/* Agent Pickup Point Routes */}
            <Route path="/agent" element={<AgentPickupDashboard />} />
            <Route path="/agent/account" element={<AgentAccountSettings />} />
            <Route path="/agent/print" element={<AgentPrint />} />
            <Route path="/agent/print/package" element={<AgentPrintPackage />} />
            <Route path="/agent/print/business" element={<AgentPrintBusiness />} />
            <Route path="/agent/stock" element={<AgentPickupDashboard />} />
            
            {/* Profile Routes */}
            <Route path="/profile/edit" element={<EditProfile />} />
            
            {/* Shared Routes */}
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/preferences" element={<Preferences />} />
            <Route path="/agents" element={<AgentList />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/feedback" element={<Feedback />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminDashboard />} />

            {/* Legacy route redirects */}
            <Route path="/home" element={<Navigate to="/" replace />} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;