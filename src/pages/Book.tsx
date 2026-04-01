import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import {
  useAvailableSlots,
  useBookSlot,
  type SlotData,
} from "@/hooks/use-scheduling";

// ---------------------------------------------------------------------------
// Timezone detection
// ---------------------------------------------------------------------------

function getGuestTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/Denver";
  }
}

function formatSlotTime(isoString: string, tz: string): string {
  const d = new Date(isoString);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  }).format(d);
}

function formatSlotDate(isoString: string, tz: string): string {
  const d = new Date(isoString);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: tz,
  }).format(d);
}

function toDateKey(isoString: string, tz: string): string {
  const d = new Date(isoString);
  // Build YYYY-MM-DD in the guest timezone.
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: tz,
  }).format(d);
  return parts; // en-CA gives YYYY-MM-DD
}

function formatDateHeading(dateKey: string, tz: string): string {
  const d = new Date(dateKey + "T12:00:00");
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: tz,
  }).format(d);
}

// ---------------------------------------------------------------------------
// Booking page
// ---------------------------------------------------------------------------

type Step = "select" | "confirm" | "done";

export default function Book() {
  const { slug } = useParams<{ slug: string }>();
  const guestTz = useMemo(getGuestTimezone, []);

  const today = new Date();
  const [weekOffset, setWeekOffset] = useState(0);
  const startDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + weekOffset * 7);
    return d.toISOString().split("T")[0];
  }, [weekOffset]);

  const { data, isLoading, error } = useAvailableSlots(slug || "", startDate, 7);
  const bookSlot = useBookSlot();

  const [step, setStep] = useState<Step>("select");
  const [selectedSlot, setSelectedSlot] = useState<SlotData | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  // Group slots by date in guest timezone.
  const slotsByDate = useMemo(() => {
    if (!data?.slots) return new Map<string, SlotData[]>();
    const grouped = new Map<string, SlotData[]>();
    for (const slot of data.slots) {
      const key = toDateKey(slot.start, guestTz);
      const arr = grouped.get(key) || [];
      arr.push(slot);
      grouped.set(key, arr);
    }
    return grouped;
  }, [data?.slots, guestTz]);

  const handleSelectSlot = (slot: SlotData) => {
    setSelectedSlot(slot);
    setStep("confirm");
  };

  const handleBook = async () => {
    if (!slug || !selectedSlot) return;
    await bookSlot.mutateAsync({
      slug,
      slot_start: selectedSlot.start,
      guest_name: guestName,
      guest_email: guestEmail,
    });
    setStep("done");
  };

  const handleBack = () => {
    setStep("select");
    setSelectedSlot(null);
  };

  if (!slug) {
    return (
      <div className="min-h-screen bg-gradient-dusk pt-20 flex items-center justify-center">
        <p className="text-white/60">No meeting type specified.</p>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={
          data?.meeting
            ? `Book: ${data.meeting.name}`
            : "Book a Meeting"
        }
        description={data?.meeting?.description || "Schedule a meeting"}
      />

      <div className="min-h-screen bg-gradient-dusk pt-20 sm:pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Header */}
          <div className="mb-6 sm:mb-8 animate-fade-in text-center">
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2">
              {data?.meeting?.name || "Loading..."}
            </h1>
            {data?.meeting && (
              <div className="flex items-center justify-center gap-4 text-white/70 text-sm">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {data.meeting.duration_min} min
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {data.meeting.location_type === "zoom"
                    ? "Video Call"
                    : data.meeting.location_type === "phone"
                    ? "Phone"
                    : "In Person"}
                </span>
              </div>
            )}
            {data?.meeting?.description && (
              <p className="text-white/60 mt-3 max-w-md mx-auto text-sm">
                {data.meeting.description}
              </p>
            )}
          </div>

          {/* Step: Select */}
          {step === "select" && (
            <Card className="bg-card/95 backdrop-blur animate-slide-up">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-secondary" />
                    Select a Time
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {guestTz.replace(/_/g, " ")}
                  </Badge>
                </div>
                {/* Week navigation */}
                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-w-[44px] min-h-[44px]"
                    onClick={() => setWeekOffset((o) => Math.max(0, o - 1))}
                    disabled={weekOffset === 0}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Week of{" "}
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                    }).format(new Date(startDate + "T12:00:00"))}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-w-[44px] min-h-[44px]"
                    onClick={() => setWeekOffset((o) => o + 1)}
                    disabled={weekOffset >= 8}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : error ? (
                  <p className="text-sm text-destructive text-center py-8">
                    Failed to load availability. Try again later.
                  </p>
                ) : slotsByDate.size === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No available times this week. Try the next week.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {Array.from(slotsByDate.entries()).map(
                      ([dateKey, slots]) => {
                        const isExpanded = expandedDate === dateKey;
                        return (
                          <div key={dateKey}>
                            {/* Date row -- accordion trigger on mobile, always open on desktop */}
                            <button
                              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left min-h-[44px] lg:cursor-default"
                              onClick={() =>
                                setExpandedDate(isExpanded ? null : dateKey)
                              }
                            >
                              <span className="text-sm font-medium">
                                {formatDateHeading(dateKey, guestTz)}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {slots.length} slot{slots.length !== 1 ? "s" : ""}
                              </Badge>
                            </button>

                            {/* Slots grid -- visible on desktop always, accordion on mobile */}
                            <div
                              className={`overflow-hidden transition-all duration-200 ${
                                isExpanded
                                  ? "max-h-[500px] opacity-100"
                                  : "max-h-0 opacity-0 lg:max-h-[500px] lg:opacity-100"
                              }`}
                            >
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 px-3 pb-3">
                                {slots.map((slot) => (
                                  <Button
                                    key={slot.start}
                                    variant="outline"
                                    className="min-h-[44px] text-sm font-mono"
                                    onClick={() => handleSelectSlot(slot)}
                                  >
                                    {formatSlotTime(slot.start, guestTz)}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step: Confirm */}
          {step === "confirm" && selectedSlot && (
            <Card className="bg-card/95 backdrop-blur animate-slide-up">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">
                  Confirm Your Booking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                  <p className="text-sm font-medium">
                    {formatSlotDate(selectedSlot.start, guestTz)}
                  </p>
                  <p className="text-lg font-mono">
                    {formatSlotTime(selectedSlot.start, guestTz)} -{" "}
                    {formatSlotTime(selectedSlot.end, guestTz)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {guestTz.replace(/_/g, " ")}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="guest-name">Your Name</Label>
                    <Input
                      id="guest-name"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Full name"
                      className="min-h-[44px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guest-email">Your Email</Label>
                    <Input
                      id="guest-email"
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    className="min-h-[44px] w-full sm:w-auto"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleBook}
                    disabled={
                      !guestName.trim() ||
                      !guestEmail.trim() ||
                      bookSlot.isPending
                    }
                    className="min-h-[44px] w-full sm:flex-1"
                  >
                    {bookSlot.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Booking...
                      </>
                    ) : (
                      "Confirm Booking"
                    )}
                  </Button>
                </div>

                {bookSlot.isError && (
                  <p className="text-sm text-destructive text-center">
                    {(bookSlot.error as Error).message ||
                      "Booking failed. Please try again."}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step: Done */}
          {step === "done" && selectedSlot && (
            <Card className="bg-card/95 backdrop-blur animate-slide-up">
              <CardContent className="py-12 text-center space-y-4">
                <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto" />
                <h2 className="text-2xl font-display font-bold text-white">
                  You are booked.
                </h2>
                <div className="text-white/70 space-y-1">
                  <p className="font-medium">
                    {formatSlotDate(selectedSlot.start, guestTz)}
                  </p>
                  <p className="text-lg font-mono">
                    {formatSlotTime(selectedSlot.start, guestTz)} -{" "}
                    {formatSlotTime(selectedSlot.end, guestTz)}
                  </p>
                  <p className="text-xs">
                    {guestTz.replace(/_/g, " ")}
                  </p>
                </div>
                <p className="text-sm text-white/50 pt-2">
                  A calendar invite has been sent to {guestEmail}.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
