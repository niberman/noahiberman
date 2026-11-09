import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { SEO } from "@/components/SEO";
import { BackLink, PageHeader, PageShell } from "@/components/editorial/EditorialPage";
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
        title="Hermes: Noah I Berman"
        description="Hermes Agent chat"
      />

      <PageShell width="max-w-[860px]">
          <BackLink to="/dashboard">Back to Flight Command</BackLink>
          <PageHeader title="Hermes" intro="Chat with your Hermes Agent instance">
            <Button onClick={handleLogout} variant="outline" className="w-full sm:w-auto">
              <LogOut />
              Logout
            </Button>
          </PageHeader>

          <HermesChat />
      </PageShell>
    </>
  );
};

export default OpenClaw;
