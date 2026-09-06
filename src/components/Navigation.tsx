import { Link, useLocation, useNavigate } from "react-router-dom";
import { m, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLenis } from "lenis/react";
import { scrollToId, scrollToTop } from "@/lib/lenis-ref";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNavigationVisible, setIsNavigationVisible] = useState(true);
  // Over the homepage hero the bar goes fully transparent and lets the map
  // breathe; the glass treatment fades in on the first real scroll. Other
  // routes keep the solid bar from the top. setState bails when the value is
  // unchanged, so the per-frame Lenis callback is effectively free.
  const [scrolled, setScrolled] = useState(false);
  useLenis((lenis) => setScrolled(lenis.scroll > 24));
  const solid = scrolled || isMenuOpen || location.pathname !== "/";

  useEffect(() => {
    const handleNavVisibility = (event: Event) => {
      const customEvent = event as CustomEvent<{ visible?: boolean }>;
      const isVisible = customEvent.detail?.visible !== false;
      setIsNavigationVisible(isVisible);
      if (!isVisible) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("flightMapNavVisibilityChange", handleNavVisibility);
    return () => {
      window.removeEventListener("flightMapNavVisibilityChange", handleNavVisibility);
    };
  }, []);

  const sectionLinks: { path: string; label: string; id: string; type: "section" | "page" | "external" }[] = [
    { path: "/", label: "Home", id: "home", type: "section" },
    { path: "/blog", label: "Blog", id: "blog", type: "page" },
    { path: "/#follow-my-flight", label: "Follow My Flight", id: "follow-my-flight", type: "section" },
    { path: "/#contact", label: "Contact", id: "contact", type: "section" },
    { path: "/inoah", label: "iNoah", id: "inoah", type: "page" },
  ];

  // Note: Navigation already handles hash navigation correctly
  // Links scroll to sections on homepage or navigate + scroll from other pages
  const isLinkActive = (path: string, id: string, type: "section" | "page" | "external") => {
    if (type === "external") return false;
    if (type === "page") {
      return location.pathname === path;
    }
    return (
      location.hash === `#${id}` ||
      (path === "/" && location.pathname === "/" && !location.hash)
    );
  };

  const updateHash = (hash?: string) => {
    const newUrl = hash ? `/#${hash}` : "/";
    window.history.replaceState(null, "", newUrl);
  };

  const scrollToSection = (
    e: React.MouseEvent<HTMLAnchorElement>,
    path: string,
    id: string,
    type: "section" | "page" | "external"
  ) => {
    if (type === "external") {
      // Let the browser handle native <a href> navigation
      setIsMenuOpen(false);
      return;
    }

    if (type === "page") {
      e.preventDefault();
      if (location.pathname !== path) {
        navigate(path);
      }
      setIsMenuOpen(false);
      return;
    }

    if (path === "/") {
      e.preventDefault();
      if (location.pathname !== "/") {
        navigate("/");
        setTimeout(() => scrollToTop(true), 100);
      } else {
        scrollToTop();
      }
      updateHash();
      setIsMenuOpen(false);
      return;
    }

    if (path.startsWith("/#")) {
      e.preventDefault();
      if (location.pathname !== "/") {
        navigate("/");
        setTimeout(() => {
          scrollToId(id);
          updateHash(id);
        }, 100);
      } else {
        scrollToId(id);
        updateHash(id);
      }
      setIsMenuOpen(false);
    }
  };

  return (
    <m.nav
      initial={{ y: -100 }}
      animate={{
        y: isNavigationVisible ? 0 : -100,
        opacity: isNavigationVisible ? 1 : 0,
      }}
      transition={{ duration: 0.45, ease: EASE }}
      className={`fixed top-0 left-0 right-0 z-[110] transition-[background-color,border-color,box-shadow,backdrop-filter] duration-500 ${
        solid
          ? "bg-card/95 backdrop-blur-xl border-b border-border/50 shadow-elegant"
          : "bg-transparent border-b border-transparent shadow-none"
      } ${isNavigationVisible ? "pointer-events-auto" : "pointer-events-none"}`}
    >
      <div className="container mx-auto px-4 py-4 sm:py-5">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 sm:gap-3 group"
            onClick={(e) => scrollToSection(e, "/", "home", "section")}
          >
            <div className="h-6 w-6 sm:h-7 sm:w-7 overflow-hidden rounded group-hover:scale-110 transition-transform relative flex-shrink-0">
              <picture>
              <source srcSet="/logo.webp" type="image/webp" />
              <img
                src="/logo.png"
                alt="Noah Berman logo"
                width={28}
                height={28}
                className="absolute inset-0 w-full h-full object-contain origin-center"
              />
              </picture>
            </div>
            <span className="text-lg sm:text-xl font-display font-bold group-hover:text-secondary transition-colors">
              Noah Berman
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8 lg:gap-10">
            {sectionLinks.map((link) => (
              <a
                key={link.path}
                href={link.path}
                onClick={(e) => scrollToSection(e, link.path, link.id, link.type)}
                {...(link.type === "external" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className={`text-sm lg:text-base font-medium transition-all hover:text-secondary relative group cursor-pointer whitespace-nowrap ${isLinkActive(link.path, link.id, link.type)
                    ? "text-secondary"
                    : "text-muted-foreground"
                  }`}
              >
                {link.label}
                <span className={`absolute -bottom-1 left-0 h-0.5 bg-secondary transition-all ${isLinkActive(link.path, link.id, link.type) ? "w-full" : "w-0 group-hover:w-full"
                  }`} />
              </a>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 hover:bg-accent rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.36, ease: EASE }}
            className="md:hidden bg-card/98 backdrop-blur-xl border-t border-border/50"
          >
            <div className="container mx-auto px-4 py-4 space-y-1">
              {sectionLinks.map((link) => (
                <a
                  key={link.path}
                  href={link.path}
                  onClick={(e) => scrollToSection(e, link.path, link.id, link.type)}
                  {...(link.type === "external" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className={`block px-4 py-3 rounded-lg font-medium transition-all ${isLinkActive(link.path, link.id, link.type)
                      ? "bg-secondary/20 text-secondary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.nav>
  );
}
