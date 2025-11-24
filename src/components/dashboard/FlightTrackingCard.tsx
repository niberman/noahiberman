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
import { useTrackFlight } from "@/hooks/useDashboardData";
import { useToast } from "@/hooks/use-toast";
import {
  Radar,
  PlaneTakeoff,
  PlaneLanding,
  Clock,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import type { TrackFlightResponse } from "@/types/dashboard";

type FlightData = TrackFlightResponse["flight"];

export const FlightTrackingCard = () => {
  const [flightId, setFlightId] = useState("");
  const [flightData, setFlightData] = useState<FlightData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const trackFlight = useTrackFlight();

  const handleTrackFlight = async () => {
    if (!flightId.trim()) return;
    setErrorMessage(null);
    setFlightData(null);

    try {
      const response = await trackFlight.mutateAsync({ flightIdentifier: flightId.trim() });
      setFlightData(response.flight);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unable to track this flight.";
      setErrorMessage(message);
      toast({
        variant: "destructive",
        title: "Tracking failed",
        description: message,
      });
    }
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
      case "Cancelled":
        return "bg-destructive/70 text-white";
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
            disabled={trackFlight.isPending || !flightId.trim()}
          >
            {trackFlight.isPending ? (
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
              <h4 className="font-bold text-lg font-mono">{flightData.flight_number}</h4>
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
                    <span className="text-sm font-medium">
                      {flightData.origin_name} ({flightData.origin})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(flightData.departure_time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>

                <div className="px-4">
                  <div className="h-[2px] w-12 bg-gradient-to-r from-accent to-secondary" />
                </div>

                <div className="flex-1 text-right">
                  <div className="flex items-center justify-end gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {flightData.destination_name} ({flightData.destination})
                    </span>
                    <PlaneLanding className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(flightData.arrival_time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>

              {/* Aircraft */}
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">Aircraft</p>
                <p className="text-sm font-medium">{flightData.aircraft || "Unknown"}</p>
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

        {!flightData && !trackFlight.isPending && !errorMessage && (
          <div className="text-center py-6 text-sm text-muted-foreground">
            Enter a flight number or FA Flight ID to start tracking.
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span>{errorMessage}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

