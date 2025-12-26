import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const sectionLinks = [
    { path: "/", label: "Home", id: "home" },
    { path: "/#about", label: "About", id: "about" },
    { path: "/#blog", label: "Blog", id: "blog" },
    { path: "/#ventures", label: "Ventures", id: "ventures" },
    { path: "/#follow-my-flight", label: "Follow My Flight", id: "follow-my-flight" },
    { path: "/#contact", label: "Contact", id: "contact" },
  ];

  // Note: Navigation already handles hash navigation correctly
  // Links scroll to sections on homepage or navigate + scroll from other pages

  const updateHash = (hash?: string) => {
    const newUrl = hash ? `/#${hash}` : "/";
    window.history.replaceState(null, "", newUrl);
  };

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, path: string, id: string) => {
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
                onClick={(e) => scrollToSection(e, link.path, link.id)}
                className={`text-sm lg:text-base font-medium transition-all hover:text-secondary relative group cursor-pointer whitespace-nowrap ${location.hash === `#${link.id}` || (link.path === "/" && location.pathname === "/" && !location.hash)
                    ? "text-secondary"
                    : "text-muted-foreground"
                  }`}
              >
                {link.label}
                <span className={`absolute -bottom-1 left-0 h-0.5 bg-secondary transition-all ${location.hash === `#${link.id}` || (link.path === "/" && location.pathname === "/" && !location.hash) ? "w-full" : "w-0 group-hover:w-full"
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
                  onClick={(e) => scrollToSection(e, link.path, link.id)}
                  className={`block px-4 py-3 rounded-lg font-medium transition-all ${location.hash === `#${link.id}` || (link.path === "/" && location.pathname === "/" && !location.hash)
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
