import { TooltipProvider } from "@/components/ui/tooltip";
import { LazyMotion, domAnimation } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigationType } from "react-router-dom";
import { lazy, Suspense, useEffect, useRef } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import "lenis/dist/lenis.css";
import { setLenis, getLenis } from "@/lib/lenis-ref";
import { Ambient, EditorialNav, EditorialFooter } from "@/components/editorial/EditorialPage";
import { InoahWidget } from "@/components/inoah/InoahWidget";
import { SecretDashboardAccess } from "@/components/SecretDashboardAccess";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Home from "./pages/Home";
// Eager: the /inoah shell is tiny (the heavy surface lazy-loads inside it),
// and an eager shell paints a fixed-size card instead of shifting the footer.
import Inoah from "./pages/Inoah";
import { SectionRedirect } from "@/components/SectionRedirect";
import { routeLoaders } from "@/lib/route-chunks";
import { Analytics } from "@vercel/analytics/react";

// Every route except Home is code-split so the homepage doesn't pay for the
// dashboard, editor, and auth bundles. The public pages load through
// routeLoaders so the nav can prefetch the same chunks on hover/touch.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const OpenClaw = lazy(() => import("./pages/OpenClaw"));
const Login = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Logo = lazy(() => import("./pages/Logo"));
const Blog = lazy(routeLoaders["/blog"]);
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Book = lazy(() => import("./pages/Book"));
const BookLanding = lazy(routeLoaders["/book"]);
const SchedulingAuthCallback = lazy(() => import("./pages/SchedulingAuthCallback"));
const Aviation = lazy(routeLoaders["/aviation"]);
const CaseStudies = lazy(routeLoaders["/work"]);
const CaseStudyDetail = lazy(() => import("./pages/CaseStudyDetail"));
const Now = lazy(routeLoaders["/now"]);
const Es = lazy(routeLoaders["/es"]);

// Both toast portals render nothing until a toast fires, and both libraries
// queue toasts raised before mount, so there's no need to pay for sonner + radix-toast
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

// One chrome for the whole site: the editorial nav and footer (from the
// Work/Aviation/Now design system) render on every route. The ambient layer
// (grain + orbs) joins every page except the editorial routes (they mount
// their own) and the homepage (the flight map owns that backdrop).
const EDITORIAL_ROUTES = new Set(["/work", "/aviation", "/now"]);
function SiteChrome({ slot }: { slot: "nav" | "footer" | "ambient" }) {
  const { pathname } = useLocation();
  if (slot === "ambient") {
    if (pathname === "/" || EDITORIAL_ROUTES.has(pathname)) return null;
    return <Ambient />;
  }
  return slot === "nav" ? <EditorialNav /> : <EditorialFooter />;
}

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
    // force: a route change must land at the top even if something (the
    // mobile menu's scroll lock) still has Lenis stopped on this commit.
    getLenis()?.scrollTo(0, { immediate: true, force: true });
  }, [pathname, navigationType]);
  return null;
}

const App = () => {
  return (
    // Eager components use `m` + domAnimation instead of `motion`: the full
    // bundle gives every motion component a projection node, and mounting the
    // window-level root node reads window.innerWidth mid-load, triggering the forced
    // reflow PageSpeed flags on the homepage. Lazy routes still use `motion`.
    <LazyMotion features={domAnimation}>
    <ReactLenis
      root
      options={{
        lerp: 0.09,
        wheelMultiplier: 0.9,
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
        {/* v7_startTransition: a navigation to a route whose chunk is still
            loading keeps the current page on screen until the new one is
            ready, instead of blanking the content area in between. */}
        <BrowserRouter future={{ v7_startTransition: true }}>
          <ScrollResetOnNavigate />
          <SecretDashboardAccess />
          <InoahWidget />
          <div className="min-h-screen flex flex-col relative">
            <SiteChrome slot="ambient" />
            <SiteChrome slot="nav" />
            <div className="flex-1 relative z-10">
              {/* The fallback holds a full viewport. With `null` the footer
                  rendered directly under the nav on a cold deep link, filled
                  the screen for a beat, then jumped away when the page chunk
                  arrived (a ~1.0 layout shift on every interior route). */}
              <Suspense fallback={<div className="min-h-screen" aria-hidden />}>
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
                <Route path="/aviation" element={<Aviation />} />
                <Route path="/work" element={<CaseStudies />} />
                <Route path="/work/:id" element={<CaseStudyDetail />} />
                <Route path="/now" element={<Now />} />
                <Route path="/es" element={<Es />} />
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
            <SiteChrome slot="footer" />
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
    <Analytics />
    </ReactLenis>
    </LazyMotion>
  );
};

export default App;
