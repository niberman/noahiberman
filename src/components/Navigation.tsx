import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    const update = () => {
      const height = Math.ceil(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--app-nav-height", `${height}px`);
      window.dispatchEvent(new CustomEvent("app-nav-height-changed", { detail: { height } }));
    };

    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();

    return () => ro.disconnect();
  }, []);

  const sectionLinks = [
    { path: "/", label: "Home", id: "home", type: "section" as const },
    { path: "/#about", label: "About", id: "about", type: "section" as const },
    { path: "/#blog", label: "Blog", id: "blog", type: "section" as const },
    { path: "/#ventures", label: "Ventures", id: "ventures", type: "section" as const },
    { path: "/#follow-my-flight", label: "Follow My Flight", id: "follow-my-flight", type: "section" as const },
    { path: "/#contact", label: "Contact", id: "contact", type: "section" as const },
    { path: "/inoah", label: "iNoah", id: "inoah", type: "page" as const },
  ];

  // Note: Navigation already handles hash navigation correctly
  // Links scroll to sections on homepage or navigate + scroll from other pages
  const isLinkActive = (path: string, id: string, type: "section" | "page") => {
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
    type: "section" | "page"
  ) => {
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
        setTimeout(() => window.scrollTo(0, 0), 100);
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
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
          const element = document.getElementById(id);
          if (element) element.scrollIntoView({ behavior: "smooth" });
          updateHash(id);
        }, 100);
      } else {
        const element = document.getElementById(id);
        if (element) element.scrollIntoView({ behavior: "smooth" });
        updateHash(id);
      }
      setIsMenuOpen(false);
    }
  };

  return (
    <motion.nav
      ref={navRef}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-[110] bg-card/95 backdrop-blur-xl border-b border-border/50 shadow-elegant"
    >
      <div className="container mx-auto px-4 py-4 sm:py-5">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 sm:gap-3 group"
            onClick={(e) => scrollToSection(e, "/", "home")}
          >
            <div className="h-6 w-6 sm:h-7 sm:w-7 overflow-hidden rounded group-hover:scale-110 transition-transform relative flex-shrink-0">
              <img
                src="/logo.png"
                alt="Logo"
                className="absolute inset-0 w-full h-full object-contain origin-center"
              />
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
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-card/98 backdrop-blur-xl border-t border-border/50"
          >
            <div className="container mx-auto px-4 py-4 space-y-1">
              {sectionLinks.map((link) => (
                <a
                  key={link.path}
                  href={link.path}
                onClick={(e) => scrollToSection(e, link.path, link.id, link.type)}
                className={`block px-4 py-3 rounded-lg font-medium transition-all ${isLinkActive(link.path, link.id, link.type)
                      ? "bg-secondary/20 text-secondary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
