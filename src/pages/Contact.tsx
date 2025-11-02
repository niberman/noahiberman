import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Linkedin, Github } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { BilingualHeading } from "@/components/BilingualHeading";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message sent!",
      description: "Thanks for reaching out. I'll get back to you soon.",
    });
    setFormData({ name: "", email: "", message: "" });
  };

  return (
    <div className="min-h-screen pt-32 pb-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto mb-20"
        >
          <BilingualHeading 
            english="Get in Touch"
            spanish="Conectemos"
            as="h1"
            className="mb-6"
          />
          <p className="text-xl text-muted-foreground leading-relaxed">
            Let's connect. Whether you want to discuss aviation, technology, or potential collaborations.
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-card border-border/50 shadow-elegant">
              <CardHeader>
                <CardTitle className="text-2xl font-display">Send a Message</CardTitle>
                <CardDescription className="text-base">
                  Fill out the form and I'll get back to you as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <Input
                      placeholder="Your Name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="text-base py-6"
                    />
                  </div>
                  <div>
                    <Input
                      type="email"
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="text-base py-6"
                    />
                  </div>
                  <div>
                    <Textarea
                      placeholder="Your message..."
                      rows={6}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                      className="text-base resize-none"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full text-base py-6 rounded-full hover:scale-105 transition-transform"
                    size="lg"
                  >
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-8"
          >
            <Card className="bg-gradient-card border-border/50 shadow-elegant">
              <CardHeader>
                <CardTitle className="text-2xl font-display">Direct Contact</CardTitle>
                <CardDescription className="text-base">
                  Prefer to reach out directly? Here are my social channels.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <a
                  href="mailto:noah@example.com"
                  className="flex items-center gap-4 p-4 rounded-xl hover:bg-muted/50 transition-all hover:scale-[1.02] group"
                >
                  <div className="h-12 w-12 rounded-full bg-secondary/20 flex items-center justify-center group-hover:bg-secondary/30 transition-colors">
                    <Mail className="h-6 w-6 text-secondary" />
                  </div>
                  <span className="text-base font-medium">noah@example.com</span>
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-xl hover:bg-muted/50 transition-all hover:scale-[1.02] group"
                >
                  <div className="h-12 w-12 rounded-full bg-secondary/20 flex items-center justify-center group-hover:bg-secondary/30 transition-colors">
                    <Linkedin className="h-6 w-6 text-secondary" />
                  </div>
                  <span className="text-base font-medium">LinkedIn</span>
                </a>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-xl hover:bg-muted/50 transition-all hover:scale-[1.02] group"
                >
                  <div className="h-12 w-12 rounded-full bg-secondary/20 flex items-center justify-center group-hover:bg-secondary/30 transition-colors">
                    <Github className="h-6 w-6 text-secondary" />
                  </div>
                  <span className="text-base font-medium">GitHub</span>
                </a>
              </CardContent>
            </Card>

            <Card className="bg-gradient-dusk text-primary-foreground border-secondary/20 shadow-glow">
              <CardHeader>
                <CardTitle className="text-2xl font-display text-primary-foreground">
                  Let's Build Together
                </CardTitle>
                <p className="text-lg font-display italic text-secondary">
                  Construyamos Juntos
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-primary-foreground/95 text-base leading-relaxed">
                  Always interested in collaborating on projects at the intersection of aviation and technology. Let's create something meaningful together.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
