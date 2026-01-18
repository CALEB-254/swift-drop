import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SenderHome from "./pages/sender/SenderHome";
import NewDelivery from "./pages/sender/NewDelivery";
import TrackPackage from "./pages/sender/TrackPackage";
import AgentDashboard from "./pages/agent/AgentDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          
          {/* Sender Routes */}
          <Route path="/sender" element={<SenderHome />} />
          <Route path="/sender/new" element={<NewDelivery />} />
          <Route path="/sender/track" element={<TrackPackage />} />
          
          {/* Agent Routes */}
          <Route path="/agent" element={<AgentDashboard />} />
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
