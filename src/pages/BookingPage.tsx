import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, Clock, MapPin, ArrowLeft, Check, Video, Phone, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCreateBooking } from "@/hooks/use-calendar";
import type { CalendarProfile, MeetingType, AvailabilityProfile } from "@/types/calendar";
import { format, addDays, startOfDay, endOfDay, parseISO, addMinutes, isSameDay } from "date-fns";

const LOCATION_ICONS: Record<string, any> = {
  zoom: Video,
  google_meet: Video,
  phone: Phone,
  in_person: Users,
  custom: MapPin,
};

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const createBooking = useCreateBooking();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<CalendarProfile | null>(null);
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);
  const [availability, setAvailability] = useState<AvailabilityProfile[]>([]);
  const [selectedMeetingType, setSelectedMeetingType] = useState<MeetingType | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [bookingComplete, setBookingComplete] = useState(false);

  // Form fields
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Load calendar profile and meeting types
  useEffect(() => {
    const loadCalendarData = async () => {
      if (!slug) return;

      try {
        // Load profile
        const { data: profileData, error: profileError } = await supabase
          .from("calendar_profiles")
          .select("*")
          .eq("slug", slug)
          .eq("is_active", true)
          .single();

        if (profileError || !profileData) {
          navigate("/404");
          return;
        }

        setProfile(profileData as CalendarProfile);

        // Load meeting types
        const { data: meetingTypesData } = await supabase
          .from("meeting_types")
          .select("*")
          .eq("calendar_profile_id", profileData.id)
          .eq("is_active", true);

        setMeetingTypes((meetingTypesData as MeetingType[]) || []);

        // Load availability
        const { data: availabilityData } = await supabase
          .from("availability_profiles")
          .select("*")
          .eq("calendar_profile_id", profileData.id)
          .eq("is_active", true);

        setAvailability((availabilityData as AvailabilityProfile[]) || []);
      } catch (error) {
        console.error("Error loading calendar data:", error);
        navigate("/404");
      } finally {
        setLoading(false);
      }
    };

    loadCalendarData();
  }, [slug, navigate]);

  // Generate available time slots when date is selected
  useEffect(() => {
    const generateSlots = async () => {
      if (!selectedDate || !selectedMeetingType || !profile) {
        setAvailableSlots([]);
        return;
      }

      const dayOfWeek = selectedDate.getDay();
      const dayAvailability = availability.filter(a => a.day_of_week === dayOfWeek);

      if (dayAvailability.length === 0) {
        setAvailableSlots([]);
        return;
      }

      // Get existing bookings for the selected date
      const { data: existingBookings } = await supabase
        .from("bookings")
        .select("scheduled_start, scheduled_end")
        .eq("calendar_profile_id", profile.id)
        .eq("status", "confirmed")
        .gte("scheduled_start", startOfDay(selectedDate).toISOString())
        .lte("scheduled_end", endOfDay(selectedDate).toISOString());

      const slots: string[] = [];
      const duration = selectedMeetingType.duration_minutes;
      const bufferBefore = selectedMeetingType.buffer_before_minutes || 0;
      const bufferAfter = selectedMeetingType.buffer_after_minutes || 0;
      const totalDuration = duration + bufferBefore + bufferAfter;

      dayAvailability.forEach(avail => {
        const [startHour, startMin] = avail.start_time.split(':').map(Number);
        const [endHour, endMin] = avail.end_time.split(':').map(Number);

        let currentTime = new Date(selectedDate);
        currentTime.setHours(startHour, startMin, 0, 0);

        const endTime = new Date(selectedDate);
        endTime.setHours(endHour, endMin, 0, 0);

        while (currentTime < endTime) {
          const slotEnd = addMinutes(currentTime, totalDuration);
          if (slotEnd > endTime) break;

          // Check if slot conflicts with existing bookings
          const slotStart = addMinutes(currentTime, bufferBefore);
          const hasConflict = existingBookings?.some(booking => {
            const bookingStart = parseISO(booking.scheduled_start);
            const bookingEnd = parseISO(booking.scheduled_end);
            return (
              (slotStart >= bookingStart && slotStart < bookingEnd) ||
              (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
              (slotStart <= bookingStart && slotEnd >= bookingEnd)
            );
          });

          if (!hasConflict) {
            slots.push(format(currentTime, "HH:mm"));
          }

          currentTime = addMinutes(currentTime, 15); // 15-minute intervals
        }
      });

      setAvailableSlots(slots);
    };

    generateSlots();
  }, [selectedDate, selectedMeetingType, profile, availability]);

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMeetingType || !selectedDate || !selectedTime || !profile) return;

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const scheduledStart = new Date(selectedDate);
    scheduledStart.setHours(hours, minutes, 0, 0);

    const bufferBefore = selectedMeetingType.buffer_before_minutes || 0;
    const actualStart = addMinutes(scheduledStart, bufferBefore);
    const scheduledEnd = addMinutes(actualStart, selectedMeetingType.duration_minutes);

    try {
      await createBooking.mutateAsync({
        meeting_type_id: selectedMeetingType.id,
        calendar_profile_id: profile.id,
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone || undefined,
        scheduled_start: actualStart.toISOString(),
        scheduled_end: scheduledEnd.toISOString(),
        timezone: profile.timezone,
        notes: notes || undefined,
      });

      setBookingComplete(true);
    } catch (error) {
      console.error("Failed to create booking:", error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-16 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  if (bookingComplete) {
    return (
      <div className="container mx-auto py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8 flex justify-center">
            <div className="rounded-full bg-green-100 p-6">
              <Check className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-4">Booking Confirmed!</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Your meeting has been scheduled. A confirmation email has been sent to {guestEmail}.
          </p>
          <Button onClick={() => window.location.href = "/"}>
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{profile.name}</h1>
          {profile.description && (
            <p className="text-lg text-muted-foreground">{profile.description}</p>
          )}
        </div>

        {/* Step 1: Select Meeting Type */}
        {!selectedMeetingType && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Select a meeting type</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {meetingTypes.map((type) => {
                const LocationIcon = LOCATION_ICONS[type.location_type || 'custom'] || MapPin;
                return (
                  <Card
                    key={type.id}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => setSelectedMeetingType(type)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div
                          className="w-1 h-12 rounded"
                          style={{ backgroundColor: type.color }}
                        />
                        {type.name}
                      </CardTitle>
                      <CardDescription>{type.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {type.duration_minutes} min
                        </div>
                        <div className="flex items-center gap-1">
                          <LocationIcon className="h-4 w-4" />
                          {type.location_type}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Select Date and Time */}
        {selectedMeetingType && !selectedTime && (
          <div>
            <Button
              variant="ghost"
              onClick={() => {
                setSelectedMeetingType(null);
                setSelectedDate(undefined);
                setSelectedTime(null);
              }}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="mb-6">
              <Badge>{selectedMeetingType.name}</Badge>
              <h2 className="text-xl font-semibold mt-2">Select a date and time</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => {
                    const dayOfWeek = date.getDay();
                    return !availability.some(a => a.day_of_week === dayOfWeek) || date < startOfDay(new Date());
                  }}
                  className="rounded-md border"
                />
              </div>

              <div>
                {selectedDate ? (
                  <div>
                    <h3 className="font-semibold mb-4">
                      {format(selectedDate, "EEEE, MMMM d, yyyy")}
                    </h3>
                    {availableSlots.length === 0 ? (
                      <p className="text-muted-foreground">No available times for this date</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                        {availableSlots.map((slot) => (
                          <Button
                            key={slot}
                            variant="outline"
                            onClick={() => setSelectedTime(slot)}
                          >
                            {slot}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Select a date to see available times</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Enter Details */}
        {selectedTime && (
          <div>
            <Button
              variant="ghost"
              onClick={() => setSelectedTime(null)}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <Card>
              <CardHeader>
                <CardTitle>Enter your details</CardTitle>
                <CardDescription>
                  {selectedMeetingType?.name} on {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")} at {selectedTime}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitBooking} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      placeholder="Anything we should know about this meeting?"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={createBooking.isPending}>
                    {createBooking.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Confirm Booking
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
