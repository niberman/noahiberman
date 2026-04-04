import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Link2,
  Clock,
  Copy,
  Check,
} from "lucide-react";
import {
  useAvailabilityProfiles,
  useCreateAvailabilityProfile,
  useUpdateAvailabilityProfile,
  useDeleteAvailabilityProfile,
  useMeetingTypes,
  useCreateMeetingType,
  useUpdateMeetingType,
  useDeleteMeetingType,
  useSchedulingAuthStatus,
  getSchedulingAuthUrl,
  schedulingApiNeedsPublicBase,
} from "@/hooks/use-scheduling";

// ---------------------------------------------------------------------------
// Day-of-week grid editor for availability rules
// ---------------------------------------------------------------------------

const DAYS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
] as const;

type Rules = Record<string, string[]>;

function RulesEditor({
  rules,
  onChange,
}: {
  rules: Rules;
  onChange: (rules: Rules) => void;
}) {
  const addWindow = (day: string) => {
    const current = rules[day] || [];
    onChange({ ...rules, [day]: [...current, "09:00-17:00"] });
  };

  const removeWindow = (day: string, index: number) => {
    const current = [...(rules[day] || [])];
    current.splice(index, 1);
    const next = { ...rules };
    if (current.length === 0) {
      delete next[day];
    } else {
      next[day] = current;
    }
    onChange(next);
  };

  const updateWindow = (day: string, index: number, value: string) => {
    const current = [...(rules[day] || [])];
    current[index] = value;
    onChange({ ...rules, [day]: current });
  };

  return (
    <div className="space-y-2">
      {DAYS.map(({ key, label }) => {
        const windows = rules[key] || [];
        return (
          <div
            key={key}
            className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-lg bg-muted/30"
          >
            <span className="w-10 text-sm font-medium text-muted-foreground shrink-0">
              {label}
            </span>
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {windows.map((w, i) => (
                <div key={i} className="flex items-center gap-1">
                  <Input
                    value={w}
                    onChange={(e) => updateWindow(key, i, e.target.value)}
                    className="w-[140px] h-9 text-sm font-mono"
                    placeholder="09:00-17:00"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 min-w-[44px] min-h-[44px]"
                    onClick={() => removeWindow(key, i)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 min-w-[44px] min-h-[44px]"
                onClick={() => addWindow(key)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile editor dialog
// ---------------------------------------------------------------------------

interface ProfileFormData {
  name: string;
  rules: Rules;
  timezone: string;
}

const defaultProfileForm: ProfileFormData = {
  name: "",
  rules: {
    mon: ["09:00-17:00"],
    tue: ["09:00-17:00"],
    wed: ["09:00-17:00"],
    thu: ["09:00-17:00"],
    fri: ["09:00-17:00"],
  },
  timezone: "America/Denver",
};

// ---------------------------------------------------------------------------
// Meeting type editor dialog
// ---------------------------------------------------------------------------

interface MeetingFormData {
  slug: string;
  name: string;
  duration_min: number;
  buffer_min: number;
  profile_id: string;
  location_type: string;
  location_details: string;
  description: string;
  is_active: boolean;
}

const defaultMeetingForm: MeetingFormData = {
  slug: "",
  name: "",
  duration_min: 30,
  buffer_min: 10,
  profile_id: "",
  location_type: "zoom",
  location_details: "",
  description: "",
  is_active: true,
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SchedulerManager() {
  const { data: profiles, isLoading: profilesLoading } = useAvailabilityProfiles();
  const createProfile = useCreateAvailabilityProfile();
  const updateProfile = useUpdateAvailabilityProfile();
  const deleteProfile = useDeleteAvailabilityProfile();

  const { data: meetings, isLoading: meetingsLoading } = useMeetingTypes();
  const createMeeting = useCreateMeetingType();
  const updateMeeting = useUpdateMeetingType();
  const deleteMeeting = useDeleteMeetingType();
  const { data: authStatus, isLoading: authLoading } = useSchedulingAuthStatus();

  // Profile editor state
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormData>(defaultProfileForm);
  const [deleteProfileId, setDeleteProfileId] = useState<string | null>(null);

  // Meeting editor state
  const [meetingEditorOpen, setMeetingEditorOpen] = useState(false);
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [meetingForm, setMeetingForm] = useState<MeetingFormData>(defaultMeetingForm);
  const [deleteMeetingId, setDeleteMeetingId] = useState<string | null>(null);

  // Copy-to-clipboard feedback
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [authLaunchError, setAuthLaunchError] = useState<string | null>(null);
  const apiNeedsPublicBase = schedulingApiNeedsPublicBase();

  // Profile CRUD handlers
  const openProfileEditor = (profile?: (typeof profiles extends (infer T)[] | undefined ? T : never)) => {
    if (profile) {
      setEditingProfileId(profile.id);
      setProfileForm({
        name: profile.name,
        rules: (profile.rules as Rules) || {},
        timezone: profile.timezone,
      });
    } else {
      setEditingProfileId(null);
      setProfileForm(defaultProfileForm);
    }
    setProfileEditorOpen(true);
  };

  const saveProfile = async () => {
    const payload = {
      name: profileForm.name,
      rules: profileForm.rules,
      timezone: profileForm.timezone,
    };
    if (editingProfileId) {
      await updateProfile.mutateAsync({ id: editingProfileId, ...payload });
    } else {
      await createProfile.mutateAsync(payload);
    }
    setProfileEditorOpen(false);
  };

  const confirmDeleteProfile = async () => {
    if (!deleteProfileId) return;
    await deleteProfile.mutateAsync(deleteProfileId);
    setDeleteProfileId(null);
  };

  // Meeting CRUD handlers
  const openMeetingEditor = (mt?: (typeof meetings extends (infer T)[] | undefined ? T : never)) => {
    if (mt) {
      setEditingMeetingId(mt.id);
      setMeetingForm({
        slug: mt.slug,
        name: mt.name,
        duration_min: mt.duration_min,
        buffer_min: mt.buffer_min,
        profile_id: mt.profile_id,
        location_type: mt.location_type,
        location_details: mt.location_details || "",
        description: mt.description || "",
        is_active: mt.is_active,
      });
    } else {
      setEditingMeetingId(null);
      setMeetingForm({
        ...defaultMeetingForm,
        profile_id: profiles?.[0]?.id || "",
      });
    }
    setMeetingEditorOpen(true);
  };

  const handleMeetingNameChange = (name: string) => {
    setMeetingForm((prev) => ({
      ...prev,
      name,
      slug: editingMeetingId ? prev.slug : slugify(name),
    }));
  };

  const saveMeeting = async () => {
    if (editingMeetingId) {
      await updateMeeting.mutateAsync({ id: editingMeetingId, ...meetingForm });
    } else {
      await createMeeting.mutateAsync(meetingForm);
    }
    setMeetingEditorOpen(false);
  };

  const confirmDeleteMeeting = async () => {
    if (!deleteMeetingId) return;
    await deleteMeeting.mutateAsync(deleteMeetingId);
    setDeleteMeetingId(null);
  };

  const copyBookingLink = (slug: string) => {
    const url = `${window.location.origin}/book/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleConnectGoogleCalendar = async () => {
    try {
      setIsConnectingGoogle(true);
      setAuthLaunchError(null);
      const url = await getSchedulingAuthUrl();
      window.location.assign(url);
    } catch (error) {
      setAuthLaunchError(
        error instanceof Error
          ? error.message
          : "Failed to start Google Calendar connection."
      );
      setIsConnectingGoogle(false);
    }
  };

  const isLoading = profilesLoading || meetingsLoading;

  return (
    <>
      <Card className="bg-card/95 backdrop-blur">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-secondary flex-shrink-0" />
              <CardTitle className="text-lg sm:text-xl">Scheduling</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => openProfileEditor()}
                size="sm"
                variant="outline"
                className="flex items-center gap-2 min-h-[44px]"
              >
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">New Profile</span>
                <span className="sm:hidden">Profile</span>
              </Button>
              <Button
                onClick={() => openMeetingEditor()}
                size="sm"
                className="flex items-center gap-2 min-h-[44px]"
                disabled={!profiles || profiles.length === 0}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Meeting Type</span>
                <span className="sm:hidden">Meeting</span>
              </Button>
            </div>
          </div>
          <CardDescription className="text-sm">
            Manage availability profiles and bookable meeting links
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 rounded-lg border border-border/60 bg-muted/30 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Google Calendar</span>
                  <Badge
                    variant="outline"
                    className={
                      authStatus?.connected
                        ? "border-green-500/40 text-green-400"
                        : "border-amber-500/40 text-amber-400"
                    }
                  >
                    {authLoading
                      ? "Checking..."
                      : authStatus?.connected
                      ? "Connected"
                      : "Not connected"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Connect your Google Calendar so busy times are excluded and
                  booked meetings create calendar invites.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleConnectGoogleCalendar}
                disabled={isConnectingGoogle || apiNeedsPublicBase}
                className="min-h-[44px] w-full sm:w-auto"
              >
                {isConnectingGoogle ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Link2 className="mr-2 h-4 w-4" />
                    {authStatus?.connected ? "Reconnect" : "Connect"}
                  </>
                )}
              </Button>
            </div>
            {authLaunchError ? (
              <p className="mt-3 text-sm text-destructive">{authLaunchError}</p>
            ) : null}
            {apiNeedsPublicBase ? (
              <p className="mt-3 text-sm text-destructive">
                `VITE_API_BASE` is still pointing at localhost. Set it to your
                deployed backend URL before connecting Google Calendar from
                production.
              </p>
            ) : null}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Availability Profiles */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Availability Profiles
                </h3>
                {!profiles || profiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No profiles yet. Create one to define your available hours.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {profiles.map((p) => {
                      const dayCount = Object.keys(
                        (p.rules as Rules) || {}
                      ).length;
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-sm">
                              {p.name}
                            </span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {dayCount} day{dayCount !== 1 ? "s" : ""} / {p.timezone}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="min-w-[44px] min-h-[44px]"
                              onClick={() => openProfileEditor(p)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="min-w-[44px] min-h-[44px]"
                              onClick={() => setDeleteProfileId(p.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Meeting Types */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Meeting Types
                </h3>
                {!meetings || meetings.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No meeting types yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {meetings.map((mt) => (
                      <div
                        key={mt.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {mt.name}
                            </span>
                            <Badge
                              variant={mt.is_active ? "default" : "secondary"}
                              className={
                                mt.is_active
                                  ? "bg-green-500/20 text-green-400 border-green-500/40"
                                  : ""
                              }
                            >
                              {mt.is_active ? "Live" : "Off"}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {mt.duration_min}m
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-xs text-muted-foreground">
                              /book/{mt.slug}
                            </code>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="min-w-[44px] min-h-[44px]"
                            onClick={() => copyBookingLink(mt.slug)}
                          >
                            {copiedSlug === mt.slug ? (
                              <Check className="h-4 w-4 text-green-400" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="min-w-[44px] min-h-[44px]"
                            onClick={() => openMeetingEditor(mt)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="min-w-[44px] min-h-[44px]"
                            onClick={() => setDeleteMeetingId(mt.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Profile Editor Dialog                                              */}
      {/* ----------------------------------------------------------------- */}
      <Dialog open={profileEditorOpen} onOpenChange={setProfileEditorOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProfileId ? "Edit Profile" : "New Availability Profile"}
            </DialogTitle>
            <DialogDescription>
              Define the weekly windows when you are available for meetings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Name</Label>
              <Input
                id="profile-name"
                value={profileForm.name}
                onChange={(e) =>
                  setProfileForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Business Hours"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-tz">Timezone</Label>
              <Input
                id="profile-tz"
                value={profileForm.timezone}
                onChange={(e) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    timezone: e.target.value,
                  }))
                }
                placeholder="America/Denver"
              />
            </div>

            <div className="space-y-2">
              <Label>Weekly Availability</Label>
              <RulesEditor
                rules={profileForm.rules}
                onChange={(rules) =>
                  setProfileForm((prev) => ({ ...prev, rules }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProfileEditorOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={saveProfile}
              disabled={
                !profileForm.name ||
                createProfile.isPending ||
                updateProfile.isPending
              }
            >
              {createProfile.isPending || updateProfile.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingProfileId ? (
                "Update"
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------------------------------------------------------- */}
      {/* Meeting Type Editor Dialog                                         */}
      {/* ----------------------------------------------------------------- */}
      <Dialog open={meetingEditorOpen} onOpenChange={setMeetingEditorOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMeetingId ? "Edit Meeting Type" : "New Meeting Type"}
            </DialogTitle>
            <DialogDescription>
              Configure a bookable meeting link.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="mt-name">Name</Label>
              <Input
                id="mt-name"
                value={meetingForm.name}
                onChange={(e) => handleMeetingNameChange(e.target.value)}
                placeholder="30-Minute Call"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mt-slug">Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/book/</span>
                <Input
                  id="mt-slug"
                  value={meetingForm.slug}
                  onChange={(e) =>
                    setMeetingForm((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  placeholder="30-min-call"
                  className="font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mt-duration">Duration (min)</Label>
                <Input
                  id="mt-duration"
                  type="number"
                  min={5}
                  step={5}
                  value={meetingForm.duration_min}
                  onChange={(e) =>
                    setMeetingForm((prev) => ({
                      ...prev,
                      duration_min: parseInt(e.target.value) || 30,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mt-buffer">Buffer (min)</Label>
                <Input
                  id="mt-buffer"
                  type="number"
                  min={0}
                  step={5}
                  value={meetingForm.buffer_min}
                  onChange={(e) =>
                    setMeetingForm((prev) => ({
                      ...prev,
                      buffer_min: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mt-profile">Availability Profile</Label>
              <Select
                value={meetingForm.profile_id}
                onValueChange={(v) =>
                  setMeetingForm((prev) => ({ ...prev, profile_id: v }))
                }
              >
                <SelectTrigger id="mt-profile" className="min-h-[44px]">
                  <SelectValue placeholder="Select profile" />
                </SelectTrigger>
                <SelectContent>
                  {(profiles || []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mt-location">Location Type</Label>
              <Select
                value={meetingForm.location_type}
                onValueChange={(v) =>
                  setMeetingForm((prev) => ({ ...prev, location_type: v }))
                }
              >
                <SelectTrigger id="mt-location" className="min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zoom">Zoom</SelectItem>
                  <SelectItem value="in_person">In Person</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mt-location-details">Location Details</Label>
              <Input
                id="mt-location-details"
                value={meetingForm.location_details}
                onChange={(e) =>
                  setMeetingForm((prev) => ({
                    ...prev,
                    location_details: e.target.value,
                  }))
                }
                placeholder="Zoom link, address, or phone number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mt-desc">Description</Label>
              <Textarea
                id="mt-desc"
                value={meetingForm.description}
                onChange={(e) =>
                  setMeetingForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Visible on the public booking page"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <Label htmlFor="mt-active">Live</Label>
                <p className="text-sm text-muted-foreground">
                  Publicly visible and bookable
                </p>
              </div>
              <Switch
                id="mt-active"
                checked={meetingForm.is_active}
                onCheckedChange={(checked) =>
                  setMeetingForm((prev) => ({ ...prev, is_active: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMeetingEditorOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={saveMeeting}
              disabled={
                !meetingForm.name ||
                !meetingForm.slug ||
                !meetingForm.profile_id ||
                createMeeting.isPending ||
                updateMeeting.isPending
              }
            >
              {createMeeting.isPending || updateMeeting.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingMeetingId ? (
                "Update"
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete profile confirm */}
      <AlertDialog
        open={!!deleteProfileId}
        onOpenChange={(open) => !open && setDeleteProfileId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Profile</AlertDialogTitle>
            <AlertDialogDescription>
              This will also delete all meeting types linked to this profile.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteProfile}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete meeting confirm */}
      <AlertDialog
        open={!!deleteMeetingId}
        onOpenChange={(open) => !open && setDeleteMeetingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meeting Type</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the booking link permanently. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteMeeting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
