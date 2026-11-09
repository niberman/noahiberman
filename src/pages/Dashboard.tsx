import { useState, useEffect } from "react";
import { SEO } from "@/components/SEO";
import { PageHeader, PageShell } from "@/components/editorial/EditorialPage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plane, LogOut, Save, Bot, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import AgentControl from "@/components/AgentsControl";
import BlogPostManager from "@/components/dashboard/BlogPostManager";
import FlightLogManager from "@/components/dashboard/FlightLogManager";
import SchedulerManager from "@/components/dashboard/SchedulerManager";
import InoahKnowledgeManager from "@/components/dashboard/InoahKnowledgeManager";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
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

      if (error) throw error;

      if (data) {
        setTailNumber(data.tail_number || "");
        setIsFlying(data.flight_status === "in_flight");
        setLastSaved(data.updated_at ? new Date(data.updated_at) : null);
      }
    } catch (error) {
      console.error("Error loading flight info:", error);
      toast({
        variant: "destructive",
        title: "Could not load flight status",
        description: error instanceof Error ? error.message : "Unknown error",
      });
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
      toast({
        variant: "destructive",
        title: "Could not save flight status",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error);
        toast({
          variant: "destructive",
          title: "Sign out may not have completed",
          description: error.message,
        });
      }
    }
    navigate("/login");
  };

  return (
    <>
      <SEO
        title="Flight Dashboard - Noah I Berman"
        description="Flight tracking command center"
      />
     
      <PageShell width="max-w-[860px]">
          <PageHeader
            title="Flight Command"
            intro="Set your aircraft to display live FlightAware tracking"
          >
            <Button onClick={handleLogout} variant="outline" className="w-full sm:w-auto">
              <LogOut />
              Logout
            </Button>
          </PageHeader>
          
          {/* Scheduler Manager */}
        <div className="mt-8 sm:mt-10">
            <SchedulerManager />
        </div>

          {/* Main Flight Card */}
          <Card className="mt-8 sm:mt-10">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Plane className="h-5 w-5 text-ed-light flex-shrink-0" />
                  <CardTitle className="text-lg sm:text-xl">Current Aircraft</CardTitle>
                </div>
                <Badge variant={isFlying ? "default" : "outline"} className="w-fit">
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
                  className="text-base tracking-[.08em] tabular-nums sm:text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the aircraft registration you're currently flying
                </p>
              </div>

              {/* Flying Status Toggle */}
              <div className="flex items-center justify-between p-3 sm:p-4 rounded-2xl border border-white/[.08] bg-white/[.02]">
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 pt-4 border-t border-white/[.08]">
                <div className="text-xs sm:text-sm text-muted-foreground">
                  {lastSaved && (
                    <>Last updated: {lastSaved.toLocaleTimeString()}</>
                  )}
                </div>
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !tailNumber}
                  className="w-full sm:w-auto"
                >
                  <Save />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
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

          {/* iNoah Knowledge Base */}
          <div className="mt-8 sm:mt-10">
            <InoahKnowledgeManager />
          </div>


          {/* Hermes entry */}
          <div className="mt-8 sm:mt-10">
            <Card
              role="link"
              tabIndex={0}
              onClick={() => navigate("/openclaw")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate("/openclaw");
                }
              }}
              className="cursor-pointer transition-[border-color,background-color,transform] hover:-translate-y-0.5 hover:border-ed-light/50 hover:bg-[rgba(128,51,204,.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ed-light"
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-ed-light flex-shrink-0" />
                    <CardTitle className="text-lg sm:text-xl">Hermes</CardTitle>
                  </div>
                  <ArrowRight className="h-4 w-4 text-ed-muted flex-shrink-0" />
                </div>
                <CardDescription className="text-sm">
                  Open the Hermes Agent chat
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Agent Control */}
          <div className="mt-8 sm:mt-10">
            <AgentControl />
          </div>
      </PageShell>
    </>
  );
};

export default Dashboard;
