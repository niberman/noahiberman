import { Link } from "react-router-dom";
import { Github, Linkedin, Mail, Plane } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-gradient-dusk border-t border-secondary/20 mt-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-texture-overlay opacity-30" />
      
      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Plane className="h-8 w-8 text-secondary" />
              <h3 className="font-display font-bold text-2xl text-primary-foreground">Noah Berman</h3>
            </div>
            <p className="text-lg text-primary-foreground/80 mb-3">
              Pilot. Founder. Builder.
            </p>
            <p className="text-xl font-display italic text-secondary mb-6">
              "El cielo no es el límite."
            </p>
            <p className="text-base text-primary-foreground/70 italic">
              The sky is not the limit.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-5 text-primary-foreground text-lg">Quick Links</h4>
            <ul className="space-y-3 text-base">
              <li>
                <Link to="/about" className="text-primary-foreground/80 hover:text-secondary transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link to="/ventures" className="text-primary-foreground/80 hover:text-secondary transition-colors">
                  Ventures
                </Link>
              </li>
              <li>
                <Link to="/projects" className="text-primary-foreground/80 hover:text-secondary transition-colors">
                  Projects
                </Link>
              </li>
              <li>
                <Link to="/follow-my-flight" className="text-primary-foreground/80 hover:text-secondary transition-colors">
                  Follow My Flight
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-5 text-primary-foreground text-lg">Connect</h4>
            <ul className="space-y-3 text-base mb-6">
              <li>
                <Link to="/contact" className="text-primary-foreground/80 hover:text-secondary transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <a href="mailto:noah@noahiberman.com" className="text-primary-foreground/80 hover:text-secondary transition-colors">
                  Email
                </a>
              </li>
            </ul>
            
            <div className="flex gap-4">
              <a 
                href="https://github.com/niberman" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-primary-foreground/70 hover:text-secondary transition-all hover:scale-110"
                aria-label="GitHub"
              >
                <Github className="h-6 w-6" />
              </a>
              <a 
                href="https://www.linkedin.com/in/noahiberman/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-primary-foreground/70 hover:text-secondary transition-all hover:scale-110"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-6 w-6" />
              </a>
              <a 
                href="mailto:noah@noahiberman.com" 
                className="text-primary-foreground/70 hover:text-secondary transition-all hover:scale-110"
                aria-label="Email"
              >
                <Mail className="h-6 w-6" />
              </a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-primary-foreground/20 pt-8 text-center">
          <p className="text-primary-foreground/70 text-base">
            &copy; {new Date().getFullYear()} Noah Berman. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
