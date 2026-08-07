import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Welcome from "./pages/Welcome";
import NotFound from "./pages/NotFound";
import SenderHome from "./pages/sender/SenderHome";
import SenderDashboard from "./pages/sender/SenderDashboard";
import NewDelivery from "./pages/sender/NewDelivery";
import TrackPackage from "./pages/sender/TrackPackage";
import Cart from "./pages/sender/Cart";
import Pochi from "./pages/sender/Pochi";
import RiderDashboard from "./pages/rider/RiderDashboard";
import AgentPickupDashboard from "./pages/agent/AgentPickupDashboard";
import AgentAccountSettings from "./pages/agent/AgentAccountSettings";
import AgentPrint from "./pages/agent/AgentPrint";
import AgentPrintPackage from "./pages/agent/AgentPrintPackage";
import AgentPrintBusiness from "./pages/agent/AgentPrintBusiness";
import AgentScan from "./pages/agent/AgentScan";
import AgentScanMtaani from "./pages/agent/AgentScanMtaani";
import AgentScanDoorstep from "./pages/agent/AgentScanDoorstep";
import AgentScanErrand from "./pages/agent/AgentScanErrand";
import AgentScanSack from "./pages/agent/AgentScanSack";
import AgentScanWarehouse from "./pages/agent/AgentScanWarehouse";
import AgentScanRelease from "./pages/agent/AgentScanRelease";
import AgentCommissions from "./pages/agent/AgentCommissions";
import PublicTracking from "./pages/PublicTracking";
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
import SharedTracking from "./pages/SharedTracking";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
          <Routes>
            {/* Login page as landing */}
            <Route path="/" element={<Login />} />
            
            {/* Auth Routes */}
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/signup" element={<Login />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/auth/verify" element={<VerifyOTP />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            {/* Sender Routes */}
            <Route path="/sender" element={<ProtectedRoute><SenderHome /></ProtectedRoute>} />
            <Route path="/sender/dashboard" element={<ProtectedRoute><SenderDashboard /></ProtectedRoute>} />
            <Route path="/sender/new" element={<ProtectedRoute><NewDelivery /></ProtectedRoute>} />
            <Route path="/sender/track" element={<ProtectedRoute><TrackPackage /></ProtectedRoute>} />
            <Route path="/sender/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
            <Route path="/sender/pochi" element={<ProtectedRoute><Pochi /></ProtectedRoute>} />
            
            {/* Rider Routes */}
            <Route path="/rider" element={<ProtectedRoute><RiderDashboard /></ProtectedRoute>} />

            {/* Agent Pickup Point Routes */}
            <Route path="/agent" element={<ProtectedRoute requiredRole="agent"><AgentPickupDashboard /></ProtectedRoute>} />
            <Route path="/agent/account" element={<ProtectedRoute requiredRole="agent"><AgentAccountSettings /></ProtectedRoute>} />
            <Route path="/agent/print" element={<ProtectedRoute requiredRole="agent"><AgentPrint /></ProtectedRoute>} />
            <Route path="/agent/print/package" element={<ProtectedRoute requiredRole="agent"><AgentPrintPackage /></ProtectedRoute>} />
            <Route path="/agent/print/business" element={<ProtectedRoute requiredRole="agent"><AgentPrintBusiness /></ProtectedRoute>} />
            <Route path="/agent/scan" element={<ProtectedRoute requiredRole="agent"><AgentScan /></ProtectedRoute>} />
            <Route path="/agent/scan/mtaani" element={<ProtectedRoute requiredRole="agent"><AgentScanMtaani /></ProtectedRoute>} />
            <Route path="/agent/scan/doorstep" element={<ProtectedRoute requiredRole="agent"><AgentScanDoorstep /></ProtectedRoute>} />
            <Route path="/agent/scan/errand" element={<ProtectedRoute requiredRole="agent"><AgentScanErrand /></ProtectedRoute>} />
            <Route path="/agent/scan/sack" element={<ProtectedRoute requiredRole="agent"><AgentScanSack /></ProtectedRoute>} />
            <Route path="/agent/scan/warehouse" element={<ProtectedRoute requiredRole="agent"><AgentScanWarehouse /></ProtectedRoute>} />
            <Route path="/agent/scan/release" element={<ProtectedRoute requiredRole="agent"><AgentScanRelease /></ProtectedRoute>} />
            <Route path="/agent/commissions" element={<ProtectedRoute requiredRole="agent"><AgentCommissions /></ProtectedRoute>} />
            <Route path="/agent/stock" element={<ProtectedRoute requiredRole="agent"><AgentPickupDashboard /></ProtectedRoute>} />
            
            {/* Profile Routes */}
            <Route path="/profile/edit" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
            
            {/* Shared Routes */}
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/preferences" element={<ProtectedRoute><Preferences /></ProtectedRoute>} />
            <Route path="/agents" element={<ProtectedRoute><AgentList /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
            <Route path="/terms" element={<Terms />} />
            {/* Public, login-free package tracking */}
            <Route path="/t/:trackingNumber" element={<PublicTracking />} />
            {/* Secure shareable tracking link (optional PIN / expiry) */}
            <Route path="/s/:token" element={<SharedTracking />} />
            <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />

            {/* Legacy route redirects */}
            <Route path="/home" element={<Navigate to="/" replace />} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;