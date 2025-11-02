import { Link, useLocation } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { Plane } from "lucide-react";
import { motion } from "framer-motion";

export function Navigation() {
  const location = useLocation();
  
  const links = [
    { path: "/", label: "Home" },
    { path: "/about", label: "About" },
    { path: "/ventures", label: "Ventures" },
    { path: "/projects", label: "Projects" },
    { path: "/contact", label: "Contact" },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-b border-border/50 shadow-elegant"
    >
      <div className="container mx-auto px-4 py-5">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <Plane className="h-7 w-7 text-secondary group-hover:scale-110 transition-transform" />
            <span className="text-xl font-display font-bold group-hover:text-secondary transition-colors">
              Noah Berman
            </span>
          </Link>
          
          <div className="hidden md:flex items-center gap-10">
            {links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-base font-medium transition-all hover:text-secondary relative group ${
                  location.pathname === link.path
                    ? "text-secondary"
                    : "text-muted-foreground"
                }`}
              >
                {link.label}
                <span className={`absolute -bottom-1 left-0 h-0.5 bg-secondary transition-all ${
                  location.pathname === link.path ? "w-full" : "w-0 group-hover:w-full"
                }`} />
              </Link>
            ))}
          </div>
          
          <ThemeToggle />
        </div>
      </div>
    </motion.nav>
  );
}
