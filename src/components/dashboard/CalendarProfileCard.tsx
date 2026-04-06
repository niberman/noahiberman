import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Calendar, Plus, Edit, Trash2, Clock, MapPin, Loader2, ExternalLink } from "lucide-react";
import {
  useCalendarProfiles,
  useDeleteCalendarProfile,
} from "@/hooks/use-calendar";
import type { CalendarProfile } from "@/types/calendar";
import CalendarProfileForm from "./CalendarProfileForm";
import MeetingTypeManager from "./MeetingTypeManager";
import AvailabilityEditor from "./AvailabilityEditor";

export default function CalendarProfileCard() {
  const { data: profiles, isLoading } = useCalendarProfiles();
  const deleteProfile = useDeleteCalendarProfile();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<CalendarProfile | null>(null);
  const [selectedProfileForSetup, setSelectedProfileForSetup] = useState<CalendarProfile | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleEdit = (profile: CalendarProfile) => {
    setEditingProfile(profile);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProfile.mutateAsync(id);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Failed to delete calendar profile:", error);
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingProfile(null);
  };

  const handleSetupProfile = (profile: CalendarProfile) => {
    setSelectedProfileForSetup(profile);
  };

  const getBookingUrl = (profile: CalendarProfile) => {
    return `${window.location.origin}/book/${profile.slug}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Profiles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Calendar Profiles
              </CardTitle>
              <CardDescription>
                Manage your calendar profiles and booking settings
              </CardDescription>
            </div>
            <Button onClick={() => setIsFormOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Profile
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!profiles || profiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-4">No calendar profiles yet</p>
              <Button onClick={() => setIsFormOpen(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Profile
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{profile.name}</h3>
                        <Badge variant={profile.is_active ? "default" : "secondary"}>
                          {profile.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      {profile.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {profile.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {profile.timezone}
                        </div>
                        <div className="flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          <a
                            href={getBookingUrl(profile)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            /book/{profile.slug}
                          </a>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetupProfile(profile)}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Setup
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(profile)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteConfirmId(profile.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={handleCloseForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProfile ? "Edit Calendar Profile" : "Create Calendar Profile"}
            </DialogTitle>
            <DialogDescription>
              {editingProfile
                ? "Update your calendar profile settings"
                : "Create a new calendar profile for scheduling meetings"}
            </DialogDescription>
          </DialogHeader>
          <CalendarProfileForm
            profile={editingProfile}
            onClose={handleCloseForm}
          />
        </DialogContent>
      </Dialog>

      {/* Setup Dialog (Meeting Types & Availability) */}
      <Dialog
        open={!!selectedProfileForSetup}
        onOpenChange={() => setSelectedProfileForSetup(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure {selectedProfileForSetup?.name}</DialogTitle>
            <DialogDescription>
              Set up meeting types and availability for this calendar profile
            </DialogDescription>
          </DialogHeader>
          {selectedProfileForSetup && (
            <div className="space-y-6">
              <MeetingTypeManager calendarProfileId={selectedProfileForSetup.id} />
              <AvailabilityEditor calendarProfileId={selectedProfileForSetup.id} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this calendar profile and all associated
              meeting types, availability settings, and bookings. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
