import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Linkedin, Github, Calendar, Phone } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ContactChannel {
  icon: LucideIcon;
  label: string;
  href: string;
  external?: boolean;
  truncate?: boolean;
}

const CHANNELS: ContactChannel[] = [
  {
    icon: Mail,
    label: "noah@noahiberman.com",
    href: "mailto:noah@noahiberman.com",
    truncate: true,
  },
  { icon: Phone, label: "(970) 618-2094", href: "tel:9706182094" },
  {
    icon: Linkedin,
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/noahiberman/",
    external: true,
  },
  { icon: Github, label: "GitHub", href: "https://github.com/niberman", external: true },
];

/** Email/phone/social channel list shared by the contact section and page. */
export function DirectContactCard() {
  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl font-display">Direct Contact</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Reach out directly through these channels.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {CHANNELS.map(({ icon: Icon, label, href, external, truncate }) => (
          <a
            key={href}
            href={href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 active:scale-[0.98] transition-all group"
          >
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-secondary/20 flex items-center justify-center group-hover:bg-secondary/30 transition-colors flex-shrink-0">
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />
            </div>
            <span className={`text-xs sm:text-sm font-medium${truncate ? " truncate" : ""}`}>
              {label}
            </span>
          </a>
        ))}
      </CardContent>
    </Card>
  );
}

/** Booking call-to-action shared by the contact section and page. */
export function ScheduleMeetingCard() {
  return (
    <Card className="bg-gradient-to-br from-secondary/10 to-primary/5 border-secondary/30 shadow-glow hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl font-display flex items-center gap-2">
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />
          Schedule
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Book a time to chat.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          asChild
          className="w-full text-xs sm:text-sm py-4 sm:py-5 rounded-full active:scale-95 md:hover:scale-105 transition-transform bg-secondary hover:bg-secondary/90"
          size="lg"
        >
          <Link to="/book">
            <Calendar className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Book meeting
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
