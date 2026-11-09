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
    <Card>
      <CardHeader>
        <CardTitle>Direct Contact</CardTitle>
        <CardDescription>
          Reach out directly through these channels.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {CHANNELS.map(({ icon: Icon, label, href, external, truncate }) => (
          <a
            key={href}
            href={href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/[.04] active:scale-[0.98] transition-all group"
          >
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full border border-white/[.12] bg-[rgba(128,51,204,.12)] flex items-center justify-center group-hover:border-ed-light/60 transition-colors flex-shrink-0">
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-ed-light" />
            </div>
            <span className={`text-sm text-ed-ink transition-colors group-hover:text-ed-light${truncate ? " truncate" : ""}`}>
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
    <Card className="border-[rgba(180,140,240,.35)] [background:radial-gradient(400px_circle_at_20%_0%,rgba(128,51,204,.18),transparent_60%)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-ed-light" />
          Schedule
        </CardTitle>
        <CardDescription>
          Book a time to chat.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full" size="lg">
          <Link to="/book">
            <Calendar />
            Book meeting
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
