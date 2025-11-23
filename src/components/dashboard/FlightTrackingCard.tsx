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
import { Radar, PlaneTakeoff, PlaneLanding, Clock, Loader2 } from "lucide-react";

interface FlightData {
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  status: "On Time" | "Delayed" | "Departed" | "Arrived";
  aircraft: string;
}

export const FlightTrackingCard = () => {
  const [flightId, setFlightId] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const [flightData, setFlightData] = useState<FlightData | null>(null);

  const handleTrackFlight = async () => {
    if (!flightId.trim()) return;

    setIsTracking(true);
    
    // Simulate API call with mock data
    setTimeout(() => {
      setFlightData({
        flightNumber: flightId.toUpperCase(),
        origin: "SFO - San Francisco",
        destination: "LAX - Los Angeles",
        departureTime: "14:30 PST",
        arrivalTime: "16:15 PST",
        status: "Departed",
        aircraft: "Boeing 737-800",
      });
      setIsTracking(false);
    }, 1500);
  };

  const getStatusColor = (status: FlightData["status"]) => {
    switch (status) {
      case "On Time":
        return "bg-accent text-accent-foreground";
      case "Delayed":
        return "bg-destructive text-destructive-foreground";
      case "Departed":
        return "bg-secondary text-secondary-foreground";
      case "Arrived":
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="hover:shadow-elegant transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Radar className="h-5 w-5 text-accent" />
          <CardTitle>Track My Flight</CardTitle>
        </div>
        <CardDescription>Real-time flight tracking via FlightAware</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Section */}
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="flight">Flight Number or FA Flight ID</Label>
            <Input
              id="flight"
              placeholder="e.g., UA1234 or FA-123456"
              value={flightId}
              onChange={(e) => setFlightId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleTrackFlight();
                }
              }}
            />
          </div>
          <Button
            className="w-full"
            onClick={handleTrackFlight}
            disabled={isTracking || !flightId.trim()}
          >
            {isTracking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Tracking...
              </>
            ) : (
              <>
                <Radar className="mr-2 h-4 w-4" />
                Track Flight
              </>
            )}
          </Button>
        </div>

        {/* Flight Data Display */}
        {flightData && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-lg font-mono">{flightData.flightNumber}</h4>
              <Badge className={getStatusColor(flightData.status)} variant="secondary">
                {flightData.status}
              </Badge>
            </div>

            <div className="p-4 rounded-md bg-muted/50 space-y-3">
              {/* Route */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <PlaneTakeoff className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{flightData.origin}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {flightData.departureTime}
                  </div>
                </div>

                <div className="px-4">
                  <div className="h-[2px] w-12 bg-gradient-to-r from-accent to-secondary" />
                </div>

                <div className="flex-1 text-right">
                  <div className="flex items-center justify-end gap-2 mb-1">
                    <span className="text-sm font-medium">{flightData.destination}</span>
                    <PlaneLanding className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {flightData.arrivalTime}
                  </div>
                </div>
              </div>

              {/* Aircraft */}
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">Aircraft</p>
                <p className="text-sm font-medium">{flightData.aircraft}</p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setFlightData(null)}
            >
              Track Another Flight
            </Button>
          </div>
        )}

        {!flightData && !isTracking && (
          <div className="text-center py-6 text-sm text-muted-foreground">
            Enter a flight number to start tracking
          </div>
        )}
      </CardContent>
    </Card>
  );
};

