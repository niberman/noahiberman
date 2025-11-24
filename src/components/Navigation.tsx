import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const sectionLinks = [
    { path: "/", label: "Home", id: "home" },
    { path: "/#about", label: "About", id: "about" },
    { path: "/#ventures", label: "Ventures", id: "ventures" },
    { path: "/#follow-my-flight", label: "Follow My Flight", id: "follow-my-flight" },
    { path: "/#contact", label: "Contact", id: "contact" },
  ];

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
    }
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-b border-border/50 shadow-elegant"
    >
      <div className="container mx-auto px-4 py-5">
        <div className="flex items-center justify-between">
          <Link 
            to="/" 
            className="flex items-center gap-3 group"
            onClick={(e) => scrollToSection(e, "/", "home")}
          >
            <div className="h-7 w-7 overflow-hidden rounded group-hover:scale-110 transition-transform relative">
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="absolute inset-0 w-full h-full object-contain origin-center"
              />
            </div>
            <span className="text-xl font-display font-bold group-hover:text-secondary transition-colors">
              Noah Berman
            </span>
          </Link>
          
          <div className="hidden md:flex items-center gap-10">
            {sectionLinks.map((link) => (
              <a
                key={link.path}
                href={link.path}
                onClick={(e) => scrollToSection(e, link.path, link.id)}
                className={`text-base font-medium transition-all hover:text-secondary relative group cursor-pointer ${
                  location.hash === `#${link.id}` || (link.path === "/" && location.pathname === "/" && !location.hash)
                    ? "text-secondary"
                    : "text-muted-foreground"
                }`}
              >
                {link.label}
                <span className={`absolute -bottom-1 left-0 h-0.5 bg-secondary transition-all ${
                  location.hash === `#${link.id}` || (link.path === "/" && location.pathname === "/" && !location.hash) ? "w-full" : "w-0 group-hover:w-full"
                }`} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
