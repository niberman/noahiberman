import { Link } from "react-router-dom";
import { Github, Linkedin, Twitter, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-4">Noah Berman</h3>
            <p className="text-sm text-muted-foreground">
              Pilot. Founder. Builder.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="text-muted-foreground hover:text-secondary transition-colors">About</Link></li>
              <li><Link to="/ventures" className="text-muted-foreground hover:text-secondary transition-colors">Ventures</Link></li>
              <li><Link to="/projects" className="text-muted-foreground hover:text-secondary transition-colors">Projects</Link></li>
              <li><Link to="/blog" className="text-muted-foreground hover:text-secondary transition-colors">Blog</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Connect</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/contact" className="text-muted-foreground hover:text-secondary transition-colors">Contact</Link></li>
              <li><a href="mailto:noah@example.com" className="text-muted-foreground hover:text-secondary transition-colors">Email</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Social</h4>
            <div className="flex gap-4">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-secondary transition-colors">
                <Github className="h-5 w-5" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-secondary transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-secondary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="mailto:noah@example.com" className="text-muted-foreground hover:text-secondary transition-colors">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Noah Berman. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
