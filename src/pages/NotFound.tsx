import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { SEO } from "@/components/SEO";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <SEO
        title="Page Not Found | Noah Berman"
        description="The requested page could not be found on noahiberman.com."
      />
      <p className="mb-6 text-xs uppercase tracking-[.3em] text-ed-muted">Lost at altitude</p>
      <h1 className="font-editorial text-[clamp(72px,18vw,200px)] leading-[.85] tracking-[-.05em] text-ed-ink">
        4<span className="italic text-ed-light">0</span>4
      </h1>
      <p className="mt-6 max-w-md text-[clamp(16px,1.3vw,19px)] font-light leading-[1.6] text-ed-body">
        This page drifted off the flight plan. Nothing out here but sky.
      </p>
      <Link
        to="/"
        className="mt-10 inline-flex items-center rounded-full border border-[rgba(236,230,245,.25)] px-6 py-3.5 text-sm font-medium tracking-[.02em] text-ed-ink transition-colors hover:border-ed-light hover:bg-[rgba(128,51,204,.15)]"
      >
        Return to Home
      </Link>
    </main>
  );
};

export default NotFound;
