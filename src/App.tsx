import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SecretDashboardAccess } from "@/components/SecretDashboardAccess";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Home from "./pages/Home";
import { SectionRedirect } from "@/components/SectionRedirect";

// Every route except Home is code-split so the homepage doesn't pay for the
// dashboard, editor, and auth bundles.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const OpenClaw = lazy(() => import("./pages/OpenClaw"));
const Login = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Inoah = lazy(() => import("./pages/Inoah"));
const Logo = lazy(() => import("./pages/Logo"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Book = lazy(() => import("./pages/Book"));
const BookLanding = lazy(() => import("./pages/BookLanding"));
const SchedulingAuthCallback = lazy(() => import("./pages/SchedulingAuthCallback"));

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SecretDashboardAccess />
          <div className="min-h-screen flex flex-col relative">
            <Navigation />
            <div className="flex-1 relative z-10">
              <Suspense fallback={null}>
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
                <Route
                  path="/openclaw"
                  element={
                    <ProtectedRoute>
                      <OpenClaw />
                    </ProtectedRoute>
                  }
                />
                <Route path="/book" element={<BookLanding />} />
                <Route path="/book/:slug" element={<Book />} />
                <Route
                  path="/scheduling/auth/callback"
                  element={<SchedulingAuthCallback />}
                />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/about" element={<SectionRedirect sectionId="about" />} />
                <Route path="/ventures" element={<SectionRedirect sectionId="ventures" />} />
                <Route path="/follow-my-flight" element={<SectionRedirect sectionId="follow-my-flight" />} />
                <Route path="/contact" element={<SectionRedirect sectionId="contact" />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </div>
            <Footer />
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
