import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useSubmitContactMessage } from "@/hooks/use-supabase-contact";

const EMPTY_FORM = { name: "", email: "", message: "" };

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Failed to send message. Please try again or contact directly.";
}

/** Contact form card shared by the home page section and the /contact page. */
export function ContactMessageForm() {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const { toast } = useToast();
  const submitMessage = useSubmitContactMessage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await submitMessage.mutateAsync(formData);
      toast({
        title: "Message sent!",
        description: "Thanks for reaching out. I'll get back to you soon.",
      });
      setFormData(EMPTY_FORM);
    } catch (error) {
      console.error("Error submitting message:", error);
      toast({
        title: "Error sending message",
        description: describeError(error),
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant h-full">
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl font-display">Send a Message</CardTitle>
        <CardDescription className="text-sm sm:text-base">
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
              className="text-sm sm:text-base py-5 sm:py-6"
            />
          </div>
          <div>
            <Input
              type="email"
              placeholder="your.email@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="text-sm sm:text-base py-5 sm:py-6"
            />
          </div>
          <div>
            <Textarea
              placeholder="Your message..."
              rows={6}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              required
              className="text-sm sm:text-base resize-none"
            />
          </div>
          <Button
            type="submit"
            className="w-full text-sm sm:text-base py-5 sm:py-6 rounded-full active:scale-95 md:hover:scale-105 transition-transform bg-secondary hover:bg-secondary/90"
            size="lg"
            disabled={submitMessage.isPending}
          >
            {submitMessage.isPending ? "Sending..." : "Send Message"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
