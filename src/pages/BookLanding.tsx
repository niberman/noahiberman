import { Link, Navigate } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Loader2, MapPin, ArrowRight } from "lucide-react";
import { usePublicMeetingTypes } from "@/hooks/use-scheduling";

function locationLabel(locationType: string): string {
  if (locationType === "zoom") return "Video call";
  if (locationType === "phone") return "Phone";
  return "In person";
}

export default function BookLanding() {
  const { data, isLoading, error } = usePublicMeetingTypes();
  const meetings = data?.meeting_types ?? [];

  if (!isLoading && meetings.length === 1) {
    return <Navigate to={`/book/${meetings[0].slug}`} replace />;
  }

  return (
    <>
      <SEO
        title="Book a meeting"
        description="Choose a meeting type and pick a time that works for you."
      />

      <div className="min-h-screen bg-gradient-dusk pt-20 sm:pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="mb-8 sm:mb-10 animate-fade-in text-center">
            <div className="inline-flex items-center justify-center rounded-full bg-secondary/15 p-3 mb-4">
              <Calendar className="h-8 w-8 text-secondary" />
            </div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2">
              Book a meeting
            </h1>
            <p className="text-white/65 text-sm sm:text-base max-w-lg mx-auto">
              Select the kind of conversation you want. You will choose an available time on the next
              step.
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <Card className="bg-card/95 backdrop-blur border-destructive/30">
              <CardContent className="py-10 text-center text-sm text-destructive">
                Could not load meeting types. Please try again later.
              </CardContent>
            </Card>
          ) : meetings.length === 0 ? (
            <Card className="bg-card/95 backdrop-blur">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No meetings are available to book right now. Reach out through the contact form
                instead.
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-4 animate-slide-up">
              {meetings.map((mt) => (
                <li key={mt.slug}>
                  <Card className="bg-card/95 backdrop-blur border-border/60 hover:border-secondary/40 transition-colors">
                    <CardHeader className="space-y-3">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-2">
                          <CardTitle className="text-lg sm:text-xl font-display text-foreground">
                            {mt.name}
                          </CardTitle>
                          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {mt.duration_min} min
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {locationLabel(mt.location_type)}
                            </span>
                          </div>
                        </div>
                        <Button asChild className="w-full sm:w-auto shrink-0">
                          <Link to={`/book/${mt.slug}`}>
                            Choose time
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                      {mt.description ? (
                        <CardDescription className="text-sm leading-relaxed">
                          {mt.description}
                        </CardDescription>
                      ) : null}
                    </CardHeader>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
