import { useEffect, useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plane, MapPin, Clock, AlertTriangle } from "lucide-react";
import {
  useAircraftStatus,
  useUpsertAircraftStatus,
} from "@/hooks/useDashboardData";
import { useToast } from "@/hooks/use-toast";
import type { AircraftStatus as AircraftStatusType } from "@/types/dashboard";

const defaultFormState = {
  aircraft_tail_number: "",
  aircraft_type: "",
  status: "On Ground" as AircraftStatusType["status"],
  location: "",
  airport_base: "",
};

export const AircraftCard = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState(defaultFormState);
  const { toast } = useToast();
  const { data: aircraft, isLoading, isError, error } = useAircraftStatus();
  const upsertAircraft = useUpsertAircraftStatus();

  useEffect(() => {
    if (aircraft) {
      setFormState({
        aircraft_tail_number: aircraft.aircraft_tail_number || "",
        aircraft_type: aircraft.aircraft_type || "",
        status: aircraft.status,
        location: aircraft.location || "",
        airport_base: aircraft.airport_base || "",
      });
    }
  }, [aircraft]);

  const lastUpdated = useMemo(() => {
    if (!aircraft?.last_updated) return "Never";
    try {
      const date = new Date(aircraft.last_updated);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } catch {
      return aircraft.last_updated;
    }
  }, [aircraft]);
  const getStatusColor = (status: AircraftStatusType["status"]) => {
    switch (status) {
      case "On Ground":
        return "bg-muted text-muted-foreground";
      case "En Route":
        return "bg-accent text-accent-foreground";
      case "Training":
        return "bg-secondary text-secondary-foreground";
      case "Maintenance":
        return "bg-destructive text-destructive-foreground";
    }
  };

  return (
    <Card className="hover:shadow-elegant transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-accent" />
            <CardTitle>Current Aircraft</CardTitle>
          </div>
          <Badge className={getStatusColor(formState.status)} variant="secondary">
            {formState.status}
          </Badge>
        </div>
        <CardDescription>Track your aircraft status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="space-y-3">
            <div className="h-20 rounded bg-muted/50 animate-pulse" />
            <div className="h-16 rounded bg-muted/30 animate-pulse" />
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span>{error?.message || "Unable to load aircraft status."}</span>
          </div>
        )}

        {!isLoading && !isError && !aircraft && !isEditing && (
          <div className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            No aircraft on file yet. Add your aircraft details to unlock quick status updates.
          </div>
        )}

        {!isEditing ? (
          <>
            {/* Aircraft Info Display */}
            <div className="space-y-3">
              <div className="p-4 rounded-md bg-muted/50">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Tail Number</p>
                    <p className="font-bold text-lg font-mono">
                      {aircraft?.aircraft_tail_number || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Aircraft Type</p>
                    <p className="font-medium">{aircraft?.aircraft_type || "—"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Location:</span>
                  <span className="font-medium">
                    {aircraft?.location || aircraft?.airport_base || "Unknown"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Updated:</span>
                  <span className="font-medium">{lastUpdated}</span>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setIsEditing(true)}
            >
              Update Status
            </Button>
          </>
        ) : (
          <>
            {/* Edit Form */}
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="tail">Tail Number</Label>
                <Input
                  id="tail"
                  value={formState.aircraft_tail_number}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      aircraft_tail_number: e.target.value.toUpperCase(),
                    }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="type">Aircraft Type</Label>
                <Input
                  id="type"
                  value={formState.aircraft_type}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      aircraft_type: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formState.status}
                  onValueChange={(value: AircraftStatusType["status"]) =>
                    setFormState((prev) => ({
                      ...prev,
                      status: value,
                    }))
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="On Ground">On Ground</SelectItem>
                    <SelectItem value="En Route">En Route</SelectItem>
                    <SelectItem value="Training">Training</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formState.location}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  placeholder="KPAO - Palo Alto"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="base">Home Airport (Optional)</Label>
                <Input
                  id="base"
                  value={formState.airport_base}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      airport_base: e.target.value,
                    }))
                  }
                  placeholder="KSQL - San Carlos"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={upsertAircraft.isPending}
                  onClick={async () => {
                    try {
                      await upsertAircraft.mutateAsync(formState);
                      toast({
                        title: "Aircraft updated",
                        description: "Your aircraft status has been saved.",
                      });
                      setIsEditing(false);
                    } catch (mutationError: unknown) {
                      const message =
                        mutationError instanceof Error
                          ? mutationError.message
                          : "Please try again shortly.";
                      toast({
                        variant: "destructive",
                        title: "Unable to save aircraft",
                        description: message,
                      });
                    }
                  }}
                >
                  {upsertAircraft.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

