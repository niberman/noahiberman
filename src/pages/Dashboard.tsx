import { SEO } from "@/components/SEO";
import { AIAgentsCard } from "@/components/dashboard/AIAgentsCard";
import { CRMCard } from "@/components/dashboard/CRMCard";
import { AircraftCard } from "@/components/dashboard/AircraftCard";
import { FlightTrackingCard } from "@/components/dashboard/FlightTrackingCard";
import { UploadAgentCard } from "@/components/dashboard/UploadAgentCard";

const Dashboard = () => {
  return (
    <>
      <SEO
        title="Dashboard - Noah Iberman"
        description="Personal command center for AI agents, CRM, aviation tools, and more."
      />
      
      <div className="min-h-screen bg-gradient-dusk">
        <div className="container mx-auto px-4 py-12 lg:py-16">
          {/* Header */}
          <div className="mb-10 animate-fade-in">
            <h1 className="font-display text-5xl md:text-6xl font-bold text-foreground mb-3">
              Command Center
            </h1>
            <p className="text-muted-foreground text-lg">
              Your personal dashboard for managing everything in one place.
            </p>
          </div>

          {/* Responsive Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-slide-up">
            <AIAgentsCard />
            <CRMCard />
            <AircraftCard />
            <FlightTrackingCard />
            <UploadAgentCard />
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;

