import { useState, useEffect } from "react";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plane, MapPin, Clock, LogOut, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const [tailNumber, setTailNumber] = useState("");
  const [flightStatus, setFlightStatus] = useState<"on_ground" | "in_flight">("on_ground");
  const [destination, setDestination] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load current flight info on mount
  useEffect(() => {
    loadCurrentFlight();
  }, []);

  const loadCurrentFlight = async () => {
    if (!supabase) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('current_flight')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data && !error) {
        setTailNumber(data.tail_number || "");
        setFlightStatus(data.flight_status || "on_ground");
        setDestination(data.destination || "");
        setDepartureTime(data.departure_time || "");
        setLastSaved(data.updated_at ? new Date(data.updated_at) : null);
      }
    } catch (error) {
      console.error("Error loading flight info:", error);
    }
  };

  const handleSave = async () => {
    if (!supabase) return;
    
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const flightData = {
        user_id: user.id,
        tail_number: tailNumber.toUpperCase(),
        flight_status: flightStatus,
        destination: destination.toUpperCase(),
        departure_time: departureTime,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('current_flight')
        .upsert(flightData, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setLastSaved(new Date());
    } catch (error) {
      console.error("Error saving flight info:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    navigate("/login");
  };

  return (
    <>
      <SEO
        title="Flight Dashboard - Noah Iberman"
        description="Flight tracking command center"
      />
      
      <div className="min-h-screen bg-gradient-dusk pt-24">
        <div className="container mx-auto px-4 py-12 lg:py-16 max-w-4xl">
          {/* Header */}
          <div className="mb-10 animate-fade-in flex justify-between items-start">
            <div>
              <h1 className="font-display text-5xl md:text-6xl font-bold text-white mb-3">
                Flight Command
              </h1>
              <p className="text-white/80 text-lg">
                Update your aircraft info here - it will display live on your homepage
              </p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>

          {/* Main Flight Card */}
          <Card className="bg-card/95 backdrop-blur animate-slide-up">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plane className="h-5 w-5 text-secondary" />
                  <CardTitle>Current Flight Information</CardTitle>
                </div>
                <Badge 
                  variant={flightStatus === "in_flight" ? "default" : "secondary"}
                  className={flightStatus === "in_flight" ? "bg-green-500/20 text-green-400 border-green-500/40" : ""}
                >
                  {flightStatus === "in_flight" ? "In Flight" : "On Ground"}
                </Badge>
              </div>
              <CardDescription>
                This information displays live in the "Follow My Flight" section on your homepage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Aircraft Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tail">Tail Number</Label>
                  <Input
                    id="tail"
                    placeholder="N12345"
                    value={tailNumber}
                    onChange={(e) => setTailNumber(e.target.value.toUpperCase())}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the aircraft registration (e.g., N12345)
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status">Flight Status</Label>
                  <select
                    id="status"
                    value={flightStatus}
                    onChange={(e) => setFlightStatus(e.target.value as "on_ground" | "in_flight")}
                    className="w-full px-3 py-2 bg-background border border-input rounded-md"
                  >
                    <option value="on_ground">On Ground</option>
                    <option value="in_flight">In Flight</option>
                  </select>
                </div>
              </div>

              {/* Flight Details */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="destination">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    Destination Airport
                  </Label>
                  <Input
                    id="destination"
                    placeholder="KDEN"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value.toUpperCase())}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    ICAO or IATA code (e.g., KDEN or DEN)
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="departure">
                    <Clock className="inline h-4 w-4 mr-1" />
                    Departure Time
                  </Label>
                  <Input
                    id="departure"
                    type="datetime-local"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {lastSaved && (
                    <>Last updated: {lastSaved.toLocaleTimeString()}</>
                  )}
                </div>
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !tailNumber}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Flight Info"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="mt-6 bg-secondary/10 border-secondary/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Plane className="h-5 w-5 text-secondary mt-0.5" />
                <div className="space-y-2 text-sm">
                  <p className="text-white/90">
                    Your flight information automatically updates on your homepage in the{" "}
                    <a href="/#follow-my-flight" className="text-secondary hover:underline">
                      "Follow My Flight" section
                    </a>
                  </p>
                  <p className="text-white/70">
                    Visitors can also search for any aircraft by tail number at{" "}
                    <a href="/follow-my-flight" className="text-secondary hover:underline">
                      noahiberman.com/follow-my-flight
                    </a>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Dashboard;