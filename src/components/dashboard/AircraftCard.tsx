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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plane, MapPin, Clock } from "lucide-react";

interface AircraftStatus {
  tailNumber: string;
  aircraftType: string;
  status: "On Ground" | "En Route" | "Training" | "Maintenance";
  location: string;
  lastUpdated: string;
}

export const AircraftCard = () => {
  const [aircraft, setAircraft] = useState<AircraftStatus>({
    tailNumber: "N12345",
    aircraftType: "Cessna 172",
    status: "On Ground",
    location: "KPAO - Palo Alto",
    lastUpdated: "2 min ago",
  });

  const [isEditing, setIsEditing] = useState(false);

  const getStatusColor = (status: AircraftStatus["status"]) => {
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
          <Badge className={getStatusColor(aircraft.status)} variant="secondary">
            {aircraft.status}
          </Badge>
        </div>
        <CardDescription>Track your aircraft status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isEditing ? (
          <>
            {/* Aircraft Info Display */}
            <div className="space-y-3">
              <div className="p-4 rounded-md bg-muted/50">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Tail Number</p>
                    <p className="font-bold text-lg font-mono">{aircraft.tailNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Aircraft Type</p>
                    <p className="font-medium">{aircraft.aircraftType}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Location:</span>
                  <span className="font-medium">{aircraft.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Updated:</span>
                  <span className="font-medium">{aircraft.lastUpdated}</span>
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
                  value={aircraft.tailNumber}
                  onChange={(e) =>
                    setAircraft({ ...aircraft, tailNumber: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="type">Aircraft Type</Label>
                <Input
                  id="type"
                  value={aircraft.aircraftType}
                  onChange={(e) =>
                    setAircraft({ ...aircraft, aircraftType: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={aircraft.status}
                  onValueChange={(value: AircraftStatus["status"]) =>
                    setAircraft({ ...aircraft, status: value })
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
                  value={aircraft.location}
                  onChange={(e) =>
                    setAircraft({ ...aircraft, location: e.target.value })
                  }
                  placeholder="KPAO - Palo Alto"
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
                  onClick={() => {
                    setAircraft({
                      ...aircraft,
                      lastUpdated: "Just now",
                    });
                    setIsEditing(false);
                  }}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

