import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SecretDashboardAccess } from "@/components/SecretDashboardAccess";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { InoahChatWidget } from "@/components/inoah/InoahChatWidget";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Inoah from "./pages/Inoah";
import Logo from "./pages/Logo";
import BlogPost from "./pages/BlogPost";
import { SectionRedirect } from "@/components/SectionRedirect";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SecretDashboardAccess />
          <InoahChatWidget />
          <div className="min-h-screen flex flex-col relative">
            <Navigation />
            <main className="flex-1 relative z-10">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/logo" element={<Logo />} />
                <Route path="/inoah" element={<Inoah />} />
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/dashboard/*" 
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route
                  path="/Dashboard"
                  element={<Navigate to="/dashboard" replace />}
                />
                <Route
                  path="/Dashboard/*"
                  element={<Navigate to="/dashboard" replace />}
                />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/about" element={<SectionRedirect sectionId="about" />} />
              <Route path="/ventures" element={<SectionRedirect sectionId="ventures" />} />
              <Route path="/follow-my-flight" element={<SectionRedirect sectionId="follow-my-flight" />} />
              <Route path="/contact" element={<SectionRedirect sectionId="contact" />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
