import { TooltipProvider } from "@/components/ui/tooltip";
import { LazyMotion, domAnimation } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigationType } from "react-router-dom";
import { lazy, Suspense, useEffect, useRef } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import "lenis/dist/lenis.css";
import { setLenis, getLenis } from "@/lib/lenis-ref";
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

// Both toast portals render nothing until a toast fires, and both libraries
// queue toasts raised before mount — no need to pay for sonner + radix-toast
// in the eager bundle.
const Toasters = lazy(() =>
  Promise.all([
    import("@/components/ui/toaster"),
    import("@/components/ui/sonner"),
  ]).then(([toaster, sonner]) => ({
    default: () => (
      <>
        <toaster.Toaster />
        <sonner.Toaster />
      </>
    ),
  }))
);

const queryClient = new QueryClient();

// Publishes the root Lenis instance to lib/lenis-ref for the scattered
// scroll call sites (Navigation, Footer, Home, SectionRedirect).
function LenisBridge() {
  const lenis = useLenis();
  useEffect(() => {
    setLenis(lenis ?? null);
    return () => setLenis(null);
  }, [lenis]);
  return null;
}

// React Router keeps the old scroll position across route changes; kill it
// (and any in-flight inertia) on push/replace navigations. Skipped on the
// first render (reload) and on Back/Forward, where the browser restores the
// previous position and must not be yanked back to the top.
function ScrollResetOnNavigate() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const prevPathname = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevPathname.current;
    prevPathname.current = pathname;
    if (prev === null || prev === pathname || navigationType === "POP") return;
    getLenis()?.scrollTo(0, { immediate: true });
  }, [pathname, navigationType]);
  return null;
}

const App = () => {
  return (
    // Eager components use `m` + domAnimation instead of `motion`: the full
    // bundle gives every motion component a projection node, and mounting the
    // window-level root node reads window.innerWidth mid-load — the forced
    // reflow PageSpeed flags on the homepage. Lazy routes still use `motion`.
    <LazyMotion features={domAnimation}>
    <ReactLenis
      root
      options={{
        lerp: 0.12,
        autoRaf: true,
        anchors: true,
        allowNestedScroll: true,
        stopInertiaOnNavigate: true,
        // Lenis's own reduced-motion mode still intercepts wheel and damps it
        // over a few frames; not intercepting at all is truly native/instant.
        smoothWheel: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      }}
    >
    <LenisBridge />
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Suspense fallback={null}>
          <Toasters />
        </Suspense>
        <BrowserRouter>
          <ScrollResetOnNavigate />
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
    </ReactLenis>
    </LazyMotion>
  );
};

export default App;
