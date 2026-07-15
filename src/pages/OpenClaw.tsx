import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { HermesChat } from "@/components/dashboard/HermesChat";

const OpenClaw = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    navigate("/login");
  };

  return (
    <>
      <SEO
        title="Hermes — Noah I Berman"
        description="Hermes Agent chat"
      />

      <div className="min-h-screen bg-gradient-dusk pt-20 sm:pt-24">
        <div className="container mx-auto px-4 py-8 sm:py-12 lg:py-16 max-w-3xl">
          <div className="mb-8 sm:mb-10 animate-fade-in">
            <Button
              variant="ghost"
              size="sm"
              className="mb-4 -ml-2 text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Flight Command
            </Button>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 sm:gap-0">
              <div>
                <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-2 sm:mb-3">
                  Hermes
                </h1>
                <p className="text-white/80 text-base sm:text-lg">
                  Chat with your Hermes Agent instance
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

          <HermesChat />
        </div>
      </div>
    </>
  );
};

export default OpenClaw;
