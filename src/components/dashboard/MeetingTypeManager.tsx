import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Plus, Edit, Trash2, Clock, MapPin, Video, Phone, Users, Loader2 } from "lucide-react";
import {
  useMeetingTypes,
  useCreateMeetingType,
  useUpdateMeetingType,
  useDeleteMeetingType,
} from "@/hooks/use-calendar";
import type { MeetingType } from "@/types/calendar";

interface MeetingTypeManagerProps {
  calendarProfileId: string;
}

const LOCATION_TYPES = [
  { value: "zoom", label: "Zoom", icon: Video },
  { value: "google_meet", label: "Google Meet", icon: Video },
  { value: "phone", label: "Phone Call", icon: Phone },
  { value: "in_person", label: "In Person", icon: Users },
  { value: "custom", label: "Custom", icon: MapPin },
];

const DURATION_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
];

const COLOR_OPTIONS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
];

export default function MeetingTypeManager({ calendarProfileId }: MeetingTypeManagerProps) {
  const { data: meetingTypes, isLoading } = useMeetingTypes(calendarProfileId);
  const createMeetingType = useCreateMeetingType();
  const updateMeetingType = useUpdateMeetingType();
  const deleteMeetingType = useDeleteMeetingType();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingType, setEditingType] = useState<MeetingType | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [duration, setDuration] = useState(30);
  const [description, setDescription] = useState("");
  const [locationType, setLocationType] = useState<string>("zoom");
  const [locationDetails, setLocationDetails] = useState("");
  const [bufferBefore, setBufferBefore] = useState(0);
  const [bufferAfter, setBufferAfter] = useState(0);
  const [color, setColor] = useState("#3b82f6");
  const [isActive, setIsActive] = useState(true);
  const [slugEdited, setSlugEdited] = useState(false);

  const resetForm = () => {
    setName("");
    setSlug("");
    setDuration(30);
    setDescription("");
    setLocationType("zoom");
    setLocationDetails("");
    setBufferBefore(0);
    setBufferAfter(0);
    setColor("#3b82f6");
    setIsActive(true);
    setSlugEdited(false);
  };

  const openForm = (type?: MeetingType) => {
    if (type) {
      setEditingType(type);
      setName(type.name);
      setSlug(type.slug);
      setDuration(type.duration_minutes);
      setDescription(type.description || "");
      setLocationType(type.location_type || "zoom");
      setLocationDetails(type.location_details || "");
      setBufferBefore(type.buffer_before_minutes || 0);
      setBufferAfter(type.buffer_after_minutes || 0);
      setColor(type.color || "#3b82f6");
      setIsActive(type.is_active);
      setSlugEdited(true);
    } else {
      resetForm();
      setEditingType(null);
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingType(null);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      calendar_profile_id: calendarProfileId,
      name,
      slug,
      duration_minutes: duration,
      description: description || undefined,
      location_type: locationType as any,
      location_details: locationDetails || undefined,
      buffer_before_minutes: bufferBefore,
      buffer_after_minutes: bufferAfter,
      color,
      is_active: isActive,
    };

    try {
      if (editingType) {
        await updateMeetingType.mutateAsync({ ...data, id: editingType.id });
      } else {
        await createMeetingType.mutateAsync(data);
      }
      closeForm();
    } catch (error) {
      console.error("Failed to save meeting type:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMeetingType.mutateAsync(id);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Failed to delete meeting type:", error);
    }
  };

  // Auto-generate slug
  if (!slugEdited && name) {
    const generatedSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (generatedSlug !== slug) {
      setSlug(generatedSlug);
    }
  }

  const LocationIcon = LOCATION_TYPES.find(lt => lt.value === locationType)?.icon || MapPin;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Meeting Types</h3>
        <Button onClick={() => openForm()} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Meeting Type
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !meetingTypes || meetingTypes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="mb-4">No meeting types configured</p>
          <Button onClick={() => openForm()} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Meeting Type
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {meetingTypes.map((type) => {
            const TypeLocationIcon = LOCATION_TYPES.find(lt => lt.value === type.location_type)?.icon || MapPin;
            return (
              <div
                key={type.id}
                className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                style={{ borderLeftColor: type.color, borderLeftWidth: '4px' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{type.name}</h4>
                      <Badge variant={type.is_active ? "default" : "secondary"}>
                        {type.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {type.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {type.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {type.duration_minutes} min
                      </div>
                      <div className="flex items-center gap-1">
                        <TypeLocationIcon className="h-3 w-3" />
                        {LOCATION_TYPES.find(lt => lt.value === type.location_type)?.label || type.location_type}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openForm(type)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirmId(type.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={closeForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingType ? "Edit Meeting Type" : "Create Meeting Type"}
            </DialogTitle>
            <DialogDescription>
              Configure the details for this meeting type
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mt-name">Name *</Label>
                <Input
                  id="mt-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., 30-min Meeting"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mt-slug">Slug *</Label>
                <Input
                  id="mt-slug"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugEdited(true);
                  }}
                  placeholder="30-min-meeting"
                  pattern="^[a-z0-9-]+$"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mt-description">Description</Label>
              <Textarea
                id="mt-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this meeting is for..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mt-duration">Duration *</Label>
                <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
                  <SelectTrigger id="mt-duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value.toString()}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mt-color">Color</Label>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-foreground' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mt-location">Location Type *</Label>
                <Select value={locationType} onValueChange={setLocationType}>
                  <SelectTrigger id="mt-location">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATION_TYPES.map((lt) => (
                      <SelectItem key={lt.value} value={lt.value}>
                        {lt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mt-location-details">Location Details</Label>
                <Input
                  id="mt-location-details"
                  value={locationDetails}
                  onChange={(e) => setLocationDetails(e.target.value)}
                  placeholder="Link or address..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mt-buffer-before">Buffer Before (min)</Label>
                <Input
                  id="mt-buffer-before"
                  type="number"
                  min="0"
                  value={bufferBefore}
                  onChange={(e) => setBufferBefore(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mt-buffer-after">Buffer After (min)</Label>
                <Input
                  id="mt-buffer-after"
                  type="number"
                  min="0"
                  value={bufferAfter}
                  onChange={(e) => setBufferAfter(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Active</Label>
                <p className="text-sm text-muted-foreground">
                  Allow bookings for this meeting type
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMeetingType.isPending || updateMeetingType.isPending}>
                {(createMeetingType.isPending || updateMeetingType.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingType ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meeting Type?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this meeting type and cancel all associated bookings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
