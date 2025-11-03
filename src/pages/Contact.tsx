import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Linkedin, Github, Calendar, Phone } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { BilingualHeading } from "@/components/BilingualHeading";
import { useSubmitContactMessage } from "@/hooks/use-supabase-contact";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const { toast } = useToast();
  const submitMessage = useSubmitContactMessage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await submitMessage.mutateAsync({
        name: formData.name,
        email: formData.email,
        message: formData.message,
      });
      
      toast({
        title: "Message sent!",
        description: "Thanks for reaching out. I'll get back to you soon.",
      });
      setFormData({ name: "", email: "", message: "" });
    } catch (error) {
      console.error("Error submitting message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again later.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto mb-12 text-center"
        >
          <BilingualHeading 
            english="Get in Touch"
            spanish="Conectemos"
            as="h1"
            className="mb-4"
          />
          <p className="text-lg text-muted-foreground leading-relaxed">
            Let's connect. Whether you want to discuss aviation, technology, or potential collaborations.
          </p>
        </motion.div>

        <div className="max-w-6xl mx-auto">
          {/* Main Contact Section */}
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* Contact Form - Takes 2 columns on large screens */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2"
            >
              <Card className="bg-gradient-card border-border/50 shadow-elegant h-full">
                <CardHeader>
                  <CardTitle className="text-2xl font-display">Send a Message</CardTitle>
                  <CardDescription className="text-base">
                    Fill out the form and I'll get back to you as soon as possible.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
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
                      disabled={submitMessage.isPending}
                    >
                      {submitMessage.isPending ? "Sending..." : "Send Message"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Contact - Takes 1 column on large screens */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              <Card className="bg-gradient-card border-border/50 shadow-elegant">
                <CardHeader>
                  <CardTitle className="text-xl font-display">Direct Contact</CardTitle>
                  <CardDescription className="text-sm">
                    Reach out directly through these channels.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <a
                    href="mailto:noah@noahiberman.com"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-all hover:scale-[1.02] group"
                  >
                    <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center group-hover:bg-secondary/30 transition-colors flex-shrink-0">
                      <Mail className="h-5 w-5 text-secondary" />
                    </div>
                    <span className="text-sm font-medium truncate">noah@noahiberman.com</span>
                  </a>
                  <a
                    href="tel:9706182094"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-all hover:scale-[1.02] group"
                  >
                    <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center group-hover:bg-secondary/30 transition-colors flex-shrink-0">
                      <Phone className="h-5 w-5 text-secondary" />
                    </div>
                    <span className="text-sm font-medium">(970) 618-2094</span>
                  </a>
                  <a
                    href="https://www.linkedin.com/in/noahiberman/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-all hover:scale-[1.02] group"
                  >
                    <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center group-hover:bg-secondary/30 transition-colors flex-shrink-0">
                      <Linkedin className="h-5 w-5 text-secondary" />
                    </div>
                    <span className="text-sm font-medium">LinkedIn</span>
                  </a>
                  <a
                    href="https://github.com/niberman"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-all hover:scale-[1.02] group"
                  >
                    <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center group-hover:bg-secondary/30 transition-colors flex-shrink-0">
                      <Github className="h-5 w-5 text-secondary" />
                    </div>
                    <span className="text-sm font-medium">GitHub</span>
                  </a>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-secondary/10 to-primary/5 border-secondary/30 shadow-glow hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl font-display flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-secondary" />
                    Schedule
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Book a time to chat.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <a
                    href="https://calendly.com/noahberman14/meeting-with-noah-clone"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button 
                      className="w-full text-sm py-5 rounded-full hover:scale-105 transition-transform bg-secondary hover:bg-secondary/90"
                      size="lg"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Book Meeting
                    </Button>
                  </a>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Bottom CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-dusk text-primary-foreground border-secondary/20 shadow-glow">
              <CardContent className="pt-6">
                <div className="text-center max-w-2xl mx-auto">
                  <h3 className="text-2xl font-display text-primary-foreground mb-2">
                    Let's Build Together
                  </h3>
                  <p className="text-lg font-display italic text-secondary mb-4">
                    Construyamos Juntos
                  </p>
                  <p className="text-primary-foreground/95 text-base leading-relaxed">
                    Always interested in collaborating on projects at the intersection of aviation and technology. Let's create something meaningful together.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
