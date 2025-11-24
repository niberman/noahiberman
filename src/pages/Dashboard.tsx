import { useState, useEffect } from "react";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plane, LogOut, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";

const Dashboard = () => {
  const navigate = useNavigate();
  const [tailNumber, setTailNumber] = useState("");
  const [isFlying, setIsFlying] = useState(false);
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
        setIsFlying(data.flight_status === "in_flight");
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
        flight_status: isFlying ? "in_flight" : "on_ground",
        destination: null,
        departure_time: null,
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
        <div className="container mx-auto px-4 py-12 lg:py-16 max-w-2xl">
          {/* Header */}
          <div className="mb-10 animate-fade-in flex justify-between items-start">
            <div>
              <h1 className="font-display text-5xl md:text-6xl font-bold text-white mb-3">
                Flight Command
              </h1>
              <p className="text-white/80 text-lg">
                Set your aircraft to display live FlightAware tracking
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
                  <CardTitle>Current Aircraft</CardTitle>
                </div>
                <Badge 
                  variant={isFlying ? "default" : "secondary"}
                  className={isFlying ? "bg-green-500/20 text-green-400 border-green-500/40" : ""}
                >
                  {isFlying ? "Flying" : "Not Flying"}
                </Badge>
              </div>
              <CardDescription>
                FlightAware tracking will display on your homepage when you're flying
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tail Number Input */}
              <div className="space-y-2">
                <Label htmlFor="tail">Tail Number</Label>
                <Input
                  id="tail"
                  placeholder="N12345"
                  value={tailNumber}
                  onChange={(e) => setTailNumber(e.target.value.toUpperCase())}
                  className="font-mono text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the aircraft registration you're currently flying
                </p>
              </div>

              {/* Flying Status Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="space-y-0.5">
                  <Label htmlFor="flying-status" className="text-base">
                    Currently Flying
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Toggle on when you're airborne
                  </p>
                </div>
                <Switch
                  id="flying-status"
                  checked={isFlying}
                  onCheckedChange={setIsFlying}
                />
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
                  {isSaving ? "Saving..." : "Save"}
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
                  <p className="text-white/90 font-medium">
                    How it works:
                  </p>
                  <ul className="space-y-1 text-white/70">
                    <li>• Enter your aircraft's tail number</li>
                    <li>• Toggle "Currently Flying" when you take off</li>
                    <li>• Live FlightAware tracking appears on your homepage</li>
                    <li>• Toggle off when you land</li>
                  </ul>
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