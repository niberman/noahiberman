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
import AgentControl from "@/components/AgentsControl";
import BlogPostManager from "@/components/dashboard/BlogPostManager";
import FlightLogManager from "@/components/dashboard/FlightLogManager";
import SchedulerManager from "@/components/dashboard/SchedulerManager";

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
        .maybeSingle();

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
      {/* Scheduler Manager */}
      <div className="mt-8 sm:mt-10">
            <SchedulerManager />
      </div>
      <div className="min-h-screen bg-gradient-dusk pt-20 sm:pt-24">
        <div className="container mx-auto px-4 py-8 sm:py-12 lg:py-16 max-w-3xl">
          {/* Header */}
          <div className="mb-8 sm:mb-10 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 sm:gap-0">
              <div>
                <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-2 sm:mb-3">
                  Flight Command
                </h1>
                <p className="text-white/80 text-base sm:text-lg">
                  Set your aircraft to display live FlightAware tracking
                </p>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>

          {/* Main Flight Card */}
          <Card className="bg-card/95 backdrop-blur animate-slide-up">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Plane className="h-5 w-5 text-secondary flex-shrink-0" />
                  <CardTitle className="text-lg sm:text-xl">Current Aircraft</CardTitle>
                </div>
                <Badge 
                  variant={isFlying ? "default" : "secondary"}
                  className={`${isFlying ? "bg-green-500/20 text-green-400 border-green-500/40" : ""} w-fit`}
                >
                  {isFlying ? "Flying" : "Not Flying"}
                </Badge>
              </div>
              <CardDescription className="text-sm">
                FlightAware tracking will display on your homepage when you're flying
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 sm:space-y-6">
              {/* Tail Number Input */}
              <div className="space-y-2">
                <Label htmlFor="tail">Tail Number</Label>
                <Input
                  id="tail"
                  placeholder="N12345"
                  value={tailNumber}
                  onChange={(e) => setTailNumber(e.target.value.toUpperCase())}
                  className="font-mono text-base sm:text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the aircraft registration you're currently flying
                </p>
              </div>

              {/* Flying Status Toggle */}
              <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-muted/50">
                <div className="space-y-0.5 flex-1 mr-4">
                  <Label htmlFor="flying-status" className="text-sm sm:text-base">
                    Currently Flying
                  </Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Toggle on when you're airborne
                  </p>
                </div>
                <Switch
                  id="flying-status"
                  checked={isFlying}
                  onCheckedChange={setIsFlying}
                  className="flex-shrink-0"
                />
              </div>

              {/* Save Button */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 pt-4 border-t">
                <div className="text-xs sm:text-sm text-muted-foreground">
                  {lastSaved && (
                    <>Last updated: {lastSaved.toLocaleTimeString()}</>
                  )}
                </div>
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !tailNumber}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="mt-5 sm:mt-6 bg-secondary/10 border-secondary/20">
            <CardContent className="pt-5 sm:pt-6">
              <div className="flex items-start gap-3">
                <Plane className="h-5 w-5 text-secondary mt-0.5 flex-shrink-0" />
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

          {/* Flight Log Manager */}
          <div className="mt-8 sm:mt-10">
            <FlightLogManager />
          </div>

          {/* Blog Post Manager */}
          <div className="mt-8 sm:mt-10">
            <BlogPostManager />
          </div>

          

          {/* Agent Control */}
          <div className="mt-8 sm:mt-10">
            <AgentControl />
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;