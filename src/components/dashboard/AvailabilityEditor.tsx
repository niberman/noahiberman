import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  useAvailability,
  useUpdateAvailability,
} from "@/hooks/use-calendar";
import type { CreateAvailabilityInput } from "@/types/calendar";

interface AvailabilityEditorProps {
  calendarProfileId: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

interface TimeSlot {
  start_time: string;
  end_time: string;
}

interface DaySchedule {
  enabled: boolean;
  slots: TimeSlot[];
}

type WeekSchedule = Record<number, DaySchedule>;

export default function AvailabilityEditor({ calendarProfileId }: AvailabilityEditorProps) {
  const { data: availability, isLoading } = useAvailability(calendarProfileId);
  const updateAvailability = useUpdateAvailability();

  const [schedule, setSchedule] = useState<WeekSchedule>({
    0: { enabled: false, slots: [] },
    1: { enabled: true, slots: [{ start_time: "09:00", end_time: "17:00" }] },
    2: { enabled: true, slots: [{ start_time: "09:00", end_time: "17:00" }] },
    3: { enabled: true, slots: [{ start_time: "09:00", end_time: "17:00" }] },
    4: { enabled: true, slots: [{ start_time: "09:00", end_time: "17:00" }] },
    5: { enabled: true, slots: [{ start_time: "09:00", end_time: "17:00" }] },
    6: { enabled: false, slots: [] },
  });

  // Load existing availability into state
  useEffect(() => {
    if (availability && availability.length > 0) {
      const newSchedule: WeekSchedule = {
        0: { enabled: false, slots: [] },
        1: { enabled: false, slots: [] },
        2: { enabled: false, slots: [] },
        3: { enabled: false, slots: [] },
        4: { enabled: false, slots: [] },
        5: { enabled: false, slots: [] },
        6: { enabled: false, slots: [] },
      };

      availability.forEach((slot) => {
        if (!newSchedule[slot.day_of_week]) {
          newSchedule[slot.day_of_week] = { enabled: true, slots: [] };
        } else {
          newSchedule[slot.day_of_week].enabled = true;
        }
        newSchedule[slot.day_of_week].slots.push({
          start_time: slot.start_time.substring(0, 5), // HH:MM
          end_time: slot.end_time.substring(0, 5),
        });
      });

      setSchedule(newSchedule);
    }
  }, [availability]);

  const toggleDay = (day: number) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled,
        slots: !prev[day].enabled && prev[day].slots.length === 0
          ? [{ start_time: "09:00", end_time: "17:00" }]
          : prev[day].slots,
      },
    }));
  };

  const addSlot = (day: number) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: [...prev[day].slots, { start_time: "09:00", end_time: "17:00" }],
      },
    }));
  };

  const removeSlot = (day: number, slotIndex: number) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.filter((_, i) => i !== slotIndex),
      },
    }));
  };

  const updateSlot = (day: number, slotIndex: number, field: "start_time" | "end_time", value: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.map((slot, i) =>
          i === slotIndex ? { ...slot, [field]: value } : slot
        ),
      },
    }));
  };

  const handleSave = async () => {
    const slots: CreateAvailabilityInput[] = [];

    Object.entries(schedule).forEach(([dayStr, daySchedule]) => {
      const day = parseInt(dayStr);
      if (daySchedule.enabled) {
        daySchedule.slots.forEach((slot) => {
          slots.push({
            calendar_profile_id: calendarProfileId,
            day_of_week: day,
            start_time: slot.start_time + ":00",
            end_time: slot.end_time + ":00",
            is_active: true,
          });
        });
      }
    });

    try {
      await updateAvailability.mutateAsync({
        calendarProfileId,
        slots,
      });
    } catch (error) {
      console.error("Failed to update availability:", error);
    }
  };

  const copyToAll = (sourceDay: number) => {
    const sourceSchedule = schedule[sourceDay];
    const newSchedule: WeekSchedule = { ...schedule };

    DAYS_OF_WEEK.forEach(({ value }) => {
      newSchedule[value] = {
        enabled: sourceSchedule.enabled,
        slots: sourceSchedule.slots.map(slot => ({ ...slot })),
      };
    });

    setSchedule(newSchedule);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Weekly Availability</h3>
          <p className="text-sm text-muted-foreground">
            Set your available hours for each day of the week
          </p>
        </div>
        <Button onClick={handleSave} disabled={updateAvailability.isPending}>
          {updateAvailability.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Availability
        </Button>
      </div>

      <div className="space-y-4">
        {DAYS_OF_WEEK.map(({ value: day, label }) => (
          <div key={day} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Switch
                  checked={schedule[day].enabled}
                  onCheckedChange={() => toggleDay(day)}
                />
                <Label className="text-base font-semibold cursor-pointer" onClick={() => toggleDay(day)}>
                  {label}
                </Label>
              </div>
              {schedule[day].enabled && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToAll(day)}
                  >
                    Copy to all
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addSlot(day)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add hours
                  </Button>
                </div>
              )}
            </div>

            {schedule[day].enabled && (
              <div className="space-y-2 ml-11">
                {schedule[day].slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No time slots configured
                  </p>
                ) : (
                  schedule[day].slots.map((slot, slotIndex) => (
                    <div key={slotIndex} className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={slot.start_time}
                        onChange={(e) => updateSlot(day, slotIndex, "start_time", e.target.value)}
                        className="w-32"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={slot.end_time}
                        onChange={(e) => updateSlot(day, slotIndex, "end_time", e.target.value)}
                        className="w-32"
                      />
                      {schedule[day].slots.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSlot(day, slotIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
