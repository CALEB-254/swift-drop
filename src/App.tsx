import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SenderHome from "./pages/sender/SenderHome";
import SenderDashboard from "./pages/sender/SenderDashboard";
import NewDelivery from "./pages/sender/NewDelivery";
import TrackPackage from "./pages/sender/TrackPackage";
import AgentDashboard from "./pages/agent/AgentDashboard";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import VerifyOTP from "./pages/auth/VerifyOTP";
import Notifications from "./pages/Notifications";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Default route redirects to login */}
            <Route path="/" element={<Navigate to="/auth/login" replace />} />
            <Route path="/home" element={<Index />} />
            
            {/* Auth Routes */}
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/signup" element={<Signup />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/auth/verify" element={<VerifyOTP />} />
            
            {/* Protected Sender Routes */}
            <Route
              path="/sender"
              element={
                <ProtectedRoute requiredRole="sender">
                  <SenderHome />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sender/dashboard"
              element={
                <ProtectedRoute requiredRole="sender">
                  <SenderDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sender/new"
              element={
                <ProtectedRoute requiredRole="sender">
                  <NewDelivery />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sender/track"
              element={
                <ProtectedRoute requiredRole="sender">
                  <TrackPackage />
                </ProtectedRoute>
              }
            />
            
            {/* Protected Agent Routes */}
            <Route
              path="/agent"
              element={
                <ProtectedRoute requiredRole="agent">
                  <AgentDashboard />
                </ProtectedRoute>
              }
            />
            
            {/* Protected Shared Routes */}
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
