import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import {
  useCreateCalendarProfile,
  useUpdateCalendarProfile,
} from "@/hooks/use-calendar";
import type { CalendarProfile } from "@/types/calendar";

interface CalendarProfileFormProps {
  profile?: CalendarProfile | null;
  onClose: () => void;
}

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
];

export default function CalendarProfileForm({
  profile,
  onClose,
}: CalendarProfileFormProps) {
  const createProfile = useCreateCalendarProfile();
  const updateProfile = useUpdateCalendarProfile();

  const [name, setName] = useState(profile?.name || "");
  const [slug, setSlug] = useState(profile?.slug || "");
  const [timezone, setTimezone] = useState(profile?.timezone || "America/Denver");
  const [description, setDescription] = useState(profile?.description || "");
  const [isActive, setIsActive] = useState(profile?.is_active ?? true);
  const [slugEdited, setSlugEdited] = useState(!!profile);

  // Auto-generate slug from name if not manually edited
  useEffect(() => {
    if (!slugEdited && name) {
      const generatedSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generatedSlug);
    }
  }, [name, slugEdited]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      name,
      slug,
      timezone,
      description: description || undefined,
      is_active: isActive,
    };

    try {
      if (profile) {
        await updateProfile.mutateAsync({ ...data, id: profile.id });
      } else {
        await createProfile.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      console.error("Failed to save calendar profile:", error);
    }
  };

  const isLoading = createProfile.isPending || updateProfile.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Profile Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., My Calendar"
          required
        />
        <p className="text-xs text-muted-foreground">
          A friendly name for this calendar profile
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">URL Slug *</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">/book/</span>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugEdited(true);
            }}
            placeholder="my-calendar"
            pattern="^[a-z0-9-]+$"
            title="Only lowercase letters, numbers, and hyphens"
            required
          />
        </div>
        <p className="text-xs text-muted-foreground">
          URL-friendly identifier (lowercase letters, numbers, and hyphens only)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone *</Label>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger id="timezone">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Your timezone for scheduling meetings
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A brief description of this calendar profile..."
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Optional description shown to people booking meetings
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="is-active">Active</Label>
          <p className="text-sm text-muted-foreground">
            Allow new bookings on this calendar
          </p>
        </div>
        <Switch
          id="is-active"
          checked={isActive}
          onCheckedChange={setIsActive}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {profile ? "Update" : "Create"} Profile
        </Button>
      </div>
    </form>
  );
}
