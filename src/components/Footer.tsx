import { Link, useLocation, useNavigate } from "react-router-dom";
import { Github, Linkedin, Mail } from "lucide-react";

export function Footer() {
  const location = useLocation();
  const navigate = useNavigate();

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) element.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      const element = document.getElementById(id);
      if (element) element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="bg-gradient-dusk border-t border-secondary/20 mt-20 sm:mt-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-texture-overlay opacity-30" />
      
      <div className="container mx-auto px-4 py-12 sm:py-16 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 md:gap-12 mb-10 sm:mb-12">
          <div className="sm:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-7 w-7 sm:h-8 sm:w-8 overflow-hidden rounded relative flex-shrink-0">
                <img 
                  src="/logo.png" 
                  alt="Logo" 
                  className="absolute inset-0 w-full h-full object-contain origin-center"
                />
              </div>
              <h3 className="font-display font-bold text-xl sm:text-2xl text-primary-foreground">Noah Berman</h3>
            </div>
            <p className="text-base sm:text-lg text-primary-foreground/80 mb-3">
              Pilot. Founder. Builder.
            </p>
            <p className="text-lg sm:text-xl font-display italic text-secondary mb-4 sm:mb-6">
              "El cielo no es el límite."
            </p>
            <p className="text-sm sm:text-base text-primary-foreground/70 italic">
              The sky is not the limit.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 sm:mb-5 text-primary-foreground text-base sm:text-lg">Quick Links</h4>
            <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base">
              <li>
                <a 
                  href="#about" 
                  onClick={(e) => scrollToSection(e, "about")}
                  className="text-primary-foreground/80 hover:text-secondary transition-colors active:scale-95 inline-block"
                >
                  About
                </a>
              </li>
              <li>
                <a 
                  href="#ventures" 
                  onClick={(e) => scrollToSection(e, "ventures")}
                  className="text-primary-foreground/80 hover:text-secondary transition-colors active:scale-95 inline-block"
                >
                  Ventures
                </a>
              </li>
              <li>
                <a 
                  href="#follow-my-flight" 
                  onClick={(e) => scrollToSection(e, "follow-my-flight")}
                  className="text-primary-foreground/80 hover:text-secondary transition-colors active:scale-95 inline-block"
                >
                  Follow My Flight
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 sm:mb-5 text-primary-foreground text-base sm:text-lg">Connect</h4>
            <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base mb-5 sm:mb-6">
              <li>
                <a 
                  href="#contact" 
                  onClick={(e) => scrollToSection(e, "contact")}
                  className="text-primary-foreground/80 hover:text-secondary transition-colors active:scale-95 inline-block"
                >
                  Contact
                </a>
              </li>
              <li>
                <a href="mailto:noah@noahiberman.com" className="text-primary-foreground/80 hover:text-secondary transition-colors active:scale-95 inline-block break-all">
                  Email
                </a>
              </li>
            </ul>
            
            <div className="flex gap-4 sm:gap-4">
              <a 
                href="https://github.com/niberman" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-primary-foreground/70 hover:text-secondary transition-all hover:scale-110 active:scale-95 p-2 -m-2"
                aria-label="GitHub"
              >
                <Github className="h-6 w-6 sm:h-6 sm:w-6" />
              </a>
              <a 
                href="https://www.linkedin.com/in/noahiberman/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-primary-foreground/70 hover:text-secondary transition-all hover:scale-110 active:scale-95 p-2 -m-2"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-6 w-6 sm:h-6 sm:w-6" />
              </a>
              <a 
                href="mailto:noah@noahiberman.com" 
                className="text-primary-foreground/70 hover:text-secondary transition-all hover:scale-110 active:scale-95 p-2 -m-2"
                aria-label="Email"
              >
                <Mail className="h-6 w-6 sm:h-6 sm:w-6" />
              </a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-primary-foreground/20 pt-6 sm:pt-8 text-center">
          <p className="text-primary-foreground/70 text-sm sm:text-base">
            &copy; {new Date().getFullYear()} Noah Berman. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
