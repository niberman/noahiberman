import { motion } from "framer-motion";
import { activeFlight, flightHistory } from "@/data/flights";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plane, MapPin, Clock, TrendingUp, Radio, Navigation, ChevronDown, ChevronRight } from "lucide-react";
import { BilingualHeading } from "@/components/BilingualHeading";
import { FlightMap } from "@/components/FlightMap";
import { AeroAPIFlightTracker } from "@/components/AeroAPIFlightTracker";
import { useEffect, useState, useMemo, Suspense } from "react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SEO } from "@/components/SEO";
import { LiveFlightTracker } from "@/components/LiveFlightTracker";

interface PageSectionProps {
  showSEO?: boolean;
}

const FLIGHTS_PER_PAGE = 25;

// Mountain airports
const MOUNTAIN_AIRPORTS = ['KLXV', 'KASE', 'KTEX', 'KEGE', 'KSBS', '1V6', 'KAEJ', 'KANK'];

// Individual flight card component with collapsible details
const FlightCard = ({ flight, index }: { flight: typeof flightHistory[0], index: number }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(0.05 * index, 1), duration: 0.5 }}
    >
      <Card className="bg-gradient-card border-border/50 hover:shadow-glow transition-all duration-300 hover:scale-[1.01]">
        <CardContent className="p-4 md:p-6">
          <div className="space-y-3">
            {/* Main Flight Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-secondary flex-shrink-0" />
                <span className="text-xl md:text-2xl font-bold text-primary-foreground">
                  {flight.route.originCode} → {flight.route.destinationCode}
                </span>
              </div>
              <Badge variant="outline" className="text-xs md:text-sm">
                {flight.status}
              </Badge>
            </div>
            
            {/* Key Details - Always visible */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Date</p>
                <p className="font-semibold text-primary-foreground">
                  {new Date(flight.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Duration</p>
                <p className="font-semibold text-primary-foreground">{flight.duration}</p>
              </div>
            </div>

            {/* Expandable Extra Details */}
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full flex items-center justify-between p-2 hover:bg-card/50 rounded-lg"
                >
                  <span className="text-sm">More Details</span>
                  <ChevronRight 
                    className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} 
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Aircraft</p>
                    <p className="font-semibold text-primary-foreground">
                      {flight.aircraft.type}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {flight.aircraft.registration}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Route</p>
                    <p className="font-semibold text-primary-foreground text-xs">
                      {flight.route.origin} → {flight.route.destination}
                    </p>
                  </div>
                </div>

                {flight.description && (
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-sm text-muted-foreground">
                      {flight.description}
                    </p>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default function FollowMyFlight({ showSEO = true }: PageSectionProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [displayedFlights, setDisplayedFlights] = useState(3);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isExperienceOpen, setIsExperienceOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate chart data
  const chartData = useMemo(() => {
    // Aircraft types distribution
    const aircraftTypes: Record<string, number> = {};
    
    // Flight categories
    let mountainFlying = 0;
    let totalHours = 0;
    
    flightHistory.forEach(flight => {
      // Count aircraft types
      const aircraftType = flight.aircraft.type 
        ? flight.aircraft.type.split(' ').slice(-2).join(' ') || flight.aircraft.type
        : 'Unknown'; // Get last 2 words (e.g., "172 Skyhawk")
      aircraftTypes[aircraftType] = (aircraftTypes[aircraftType] || 0) + 1;
      
      // Parse duration
      const duration = flight.duration || '';
      const hoursMatch = duration.match(/(\d+)h/);
      const minutesMatch = duration.match(/(\d+)m/);
      const hours = hoursMatch ? parseFloat(hoursMatch[1]) : 0;
      const minutes = minutesMatch ? parseFloat(minutesMatch[1]) : 0;
      const flightHours = hours + minutes / 60;
      totalHours += flightHours;
      
      // Check for mountain flying
      const route = flight.route.originCode + ' ' + flight.route.destinationCode + ' ' + (flight.description || '');
      const isMountainFlying = MOUNTAIN_AIRPORTS.some(airport => route.includes(airport));
      if (isMountainFlying) {
        mountainFlying += flightHours;
      }
    });

    // Format aircraft data for chart
    const aircraftData = Object.entries(aircraftTypes)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Collect all unique airports (including from route descriptions)
    const airports = new Set<string>();
    flightHistory.forEach(flight => {
      airports.add(flight.route.originCode.trim().toUpperCase());
      airports.add(flight.route.destinationCode.trim().toUpperCase());
      
      // Also extract airports from route description
      if (flight.description) {
        const routeMatches = flight.description.match(/Route:\s*([A-Z0-9\s-]+)/i);
        if (routeMatches) {
          const routeString = routeMatches[1];
          const airportCodes = routeString.match(/\b([A-Z][A-Z0-9]{1,3})\b/g) || [];
          airportCodes.forEach(code => airports.add(code.toUpperCase().trim()));
        }
      }
    });

    return {
      aircraftData,
      totalHours: totalHours.toFixed(1),
      mountainFlying: mountainFlying.toFixed(1),
      airports: Array.from(airports),
    };
  }, [flightHistory]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
    });
  };
  
  const chartConfig = {
    aircraftType: {
      label: "Aircraft Type",
    },
  };
  
  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(var(--primary))',
    'hsl(var(--secondary))',
    'hsl(var(--accent))',
  ];

  return (
    <div className="min-h-screen pt-20 md:pt-32 pb-10 md:pb-20">
      {showSEO && (
        <SEO
          title="Follow My Flight — Track Noah Berman's Flights | Pilot Flight Tracking"
          description="Track Noah Berman's current flight in real-time and explore flight history. Live flight tracking, logbook, and aviation statistics from a commercial pilot. Follow flights in real-time with live data."
          keywords="flight tracking, live flight tracker, pilot flights, aviation tracking, flight logbook, real-time flight tracking, pilot flight history, Noah Berman flights, commercial pilot, flight statistics, aviation experience, mountain flying"
          structuredData={{
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Follow My Flight",
            "description": "Track flights in real-time and explore aviation history",
            "url": "https://noahiberman.com/follow-my-flight"
          }}
        />
      )}
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto mb-8 md:mb-20"
        >
          <BilingualHeading 
            english="Follow My Flight"
            spanish="Sigue Mi Vuelo"
            as="h1"
            className="mb-4 md:mb-6"
          />
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Track my current flight in real-time and explore my flight history.
          </p>
        </motion.div>

        {/* Live Flight Tracker - Shows when flying */}
        <LiveFlightTracker />

        {/* Live Flight Tracking & Interactive Map */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="max-w-6xl mx-auto mb-8 md:mb-20"
        >
          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            {/* AeroAPI Live Flight Tracker */}
            <div>
              <AeroAPIFlightTracker />
            </div>

            {/* Interactive Flight Tracker */}
            <Card className="bg-gradient-card border-border/50">
              <CardHeader className="pb-3 md:pb-6">
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                  <Plane className="h-4 w-4 md:h-5 md:w-5 text-secondary" />
                  Interactive Flight Map
                </CardTitle>
                <CardDescription className="text-sm">
                  Explore flight routes on a 3D map ({chartData.airports.length} airports)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] md:h-[300px] w-full">
                  <Suspense
                    fallback={
                      <div className="w-full h-full flex items-center justify-center bg-card/50 rounded-lg">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-secondary mx-auto mb-2"></div>
                          <p className="text-sm text-muted-foreground">Loading map...</p>
                        </div>
                      </div>
                    }
                  >
                    <FlightMap />
                  </Suspense>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {chartData.airports.slice(0, 12).map((airport, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {airport}
                    </Badge>
                  ))}
                  {chartData.airports.length > 12 && (
                    <Badge variant="outline" className="text-xs">
                      +{chartData.airports.length - 12} more
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Active Flight Section */}
        {activeFlight && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-6xl mx-auto mb-8 md:mb-20"
          >
            <Card className="bg-gradient-dusk border-secondary/20 shadow-glow relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-radial from-secondary/20 to-transparent rounded-full blur-3xl" />
              <CardHeader className="relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                      <Plane className="h-5 w-5 md:h-6 md:w-6 text-secondary animate-float" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl md:text-3xl font-display text-primary-foreground">
                        Active Flight
                      </CardTitle>
                      <CardDescription className="text-sm md:text-base text-secondary">
                        Live Tracking
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/40 text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2 animate-pulse w-fit">
                    In Flight
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="relative z-10 space-y-4">
                {/* Main Flight Info - Always Visible */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-secondary flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Route</p>
                      <p className="text-2xl font-bold text-primary-foreground">
                        {activeFlight.route.originCode} → {activeFlight.route.destinationCode}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Plane className="h-5 w-5 text-secondary flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Aircraft</p>
                      <p className="text-lg font-semibold text-primary-foreground">
                        {activeFlight.aircraft.type}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Expandable Extra Info */}
                <Collapsible open={isStatsOpen} onOpenChange={setIsStatsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full flex items-center justify-between p-3 hover:bg-card/50 rounded-lg"
                    >
                      <span className="text-sm font-medium">Additional Flight Details</span>
                      <ChevronRight 
                        className={`h-4 w-4 transition-transform ${isStatsOpen ? 'rotate-90' : ''}`} 
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-card/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-secondary flex-shrink-0" />
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Altitude</p>
                        </div>
                        <p className="text-2xl font-bold text-primary-foreground">
                          {activeFlight.altitude?.toLocaleString()} ft
                        </p>
                      </div>
                      
                      <div className="bg-card/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Navigation className="h-4 w-4 text-secondary flex-shrink-0" />
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Speed</p>
                        </div>
                        <p className="text-2xl font-bold text-primary-foreground">
                          {activeFlight.speed} kts
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-secondary flex-shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground">Current Time</p>
                        <p className="text-xl font-mono font-bold text-primary-foreground">
                          {formatTime(currentTime)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Full Route</p>
                      <p className="text-base text-primary-foreground">
                        {activeFlight.route.origin} to {activeFlight.route.destination}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Registration</p>
                      <p className="text-base text-primary-foreground font-mono">
                        {activeFlight.aircraft.registration}
                      </p>
                    </div>

                    {activeFlight.description && (
                      <div className="pt-3 border-t border-border/50 space-y-2">
                        <p className="text-sm text-muted-foreground">Notes</p>
                        <p className="text-base text-primary-foreground">
                          {activeFlight.description}
                        </p>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Flight Experience Summary Section - Simplified */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-6xl mx-auto mb-8 md:mb-20"
        >
          <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-6">
            {/* Total Hours */}
            <Card className="bg-gradient-card border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Flight Hours</p>
                    <p className="text-3xl font-bold text-primary-foreground">{chartData.totalHours}</p>
                  </div>
                  <div className="h-16 w-16 rounded-full bg-secondary/20 flex items-center justify-center">
                    <Plane className="h-8 w-8 text-secondary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Flights */}
            <Card className="bg-gradient-card border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Flights</p>
                    <p className="text-3xl font-bold text-primary-foreground">{flightHistory.length}</p>
                  </div>
                  <div className="h-16 w-16 rounded-full bg-secondary/20 flex items-center justify-center">
                    <MapPin className="h-8 w-8 text-secondary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Expandable Detailed Stats */}
          <Collapsible open={isExperienceOpen} onOpenChange={setIsExperienceOpen}>
            <Card className="bg-gradient-card border-border/50">
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full flex items-center justify-between p-6 hover:bg-card/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-secondary" />
                    <span className="text-lg font-semibold">Detailed Flight Statistics</span>
                  </div>
                  <ChevronRight 
                    className={`h-5 w-5 transition-transform ${isExperienceOpen ? 'rotate-90' : ''}`} 
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6 pt-0">
                  {/* Experience Breakdown */}
                  <div className="grid md:grid-cols-1 gap-4 md:gap-6">
                    {/* Aircraft Types Chart */}
                    <Card className="bg-card/30 border-border/50">
                      <CardHeader className="pb-3 md:pb-6">
                        <CardTitle className="text-lg md:text-xl">Flights by Aircraft Type</CardTitle>
                        <CardDescription className="text-sm">Number of flights per aircraft type</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer config={chartConfig} className="h-[250px] md:h-[300px] w-full">
                          <BarChart data={chartData.aircraftData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis 
                              dataKey="type" 
                              angle={-45}
                              textAnchor="end"
                              height={100}
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                            />
                            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid md:grid-cols-3 gap-3 md:gap-4">
                    <Card className="bg-card/30 border-border/50">
                      <CardContent className="p-4 md:p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Mountain Flying</p>
                            <p className="text-2xl font-bold text-primary-foreground">{chartData.mountainFlying}h</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {parseFloat(chartData.totalHours) > 0 
                                ? ((parseFloat(chartData.mountainFlying) / parseFloat(chartData.totalHours)) * 100).toFixed(1)
                                : '0.0'
                              }% of total
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/30 border-border/50">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Unique Airports</p>
                            <p className="text-2xl font-bold text-primary-foreground">{chartData.airports.length}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Different locations
                            </p>
                          </div>
                          <div className="h-12 w-12 rounded-full bg-secondary/20 flex items-center justify-center">
                            <MapPin className="h-6 w-6 text-secondary" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/30 border-border/50">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Average Flight</p>
                            <p className="text-2xl font-bold text-primary-foreground">
                              {flightHistory.length > 0 
                                ? (parseFloat(chartData.totalHours) / flightHistory.length).toFixed(1)
                                : '0.0'
                              }h
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Per flight
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Flight History Section */}
                  <div className="mt-8 pt-8 border-t border-border/50">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                      <h3 className="text-xl md:text-2xl font-display font-bold text-primary-foreground">
                        Flight History
                      </h3>
                      <Badge variant="outline" className="text-sm w-fit">
                        {displayedFlights} of {flightHistory.length} flights
                      </Badge>
                    </div>
                    
                    <div className="space-y-4">
                      {flightHistory.slice(0, displayedFlights).map((flight, index) => (
                        <FlightCard key={flight.id} flight={flight} index={index} />
                      ))}
                    </div>

                    {displayedFlights < flightHistory.length && (
                      <div className="flex justify-center mt-6">
                        <Button
                          onClick={() => setDisplayedFlights(prev => Math.min(prev + FLIGHTS_PER_PAGE, flightHistory.length))}
                          size="lg"
                          className="rounded-full px-6 md:px-8 py-4 md:py-6 text-sm md:text-base"
                          variant="outline"
                        >
                          Load More Flights
                          <ChevronDown className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </motion.div>
      </div>
    </div>
  );
}

