import { motion } from "framer-motion";
import { activeFlight, flightHistory } from "@/data/flights";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plane, MapPin, Clock, TrendingUp, Radio, Navigation, ChevronDown } from "lucide-react";
import { BilingualHeading } from "@/components/BilingualHeading";
import { useEffect, useState, useMemo } from "react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";

const FLIGHTS_PER_PAGE = 25;

// Mountain airports
const MOUNTAIN_AIRPORTS = ['KLXV', 'KASE', 'KTEX', 'KEGE', 'KSBS', '1V6', 'KAEJ', 'KANK'];

export default function FollowMyFlight() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [displayedFlights, setDisplayedFlights] = useState(FLIGHTS_PER_PAGE);

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
      const aircraftType = flight.aircraft.type.split(' ').slice(-2).join(' '); // Get last 2 words (e.g., "172 Skyhawk")
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
      const route = flight.route.originCode + ' ' + flight.destinationCode + ' ' + (flight.description || '');
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

    // Collect all unique airports
    const airports = new Set<string>();
    flightHistory.forEach(flight => {
      airports.add(flight.route.originCode);
      airports.add(flight.route.destinationCode);
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
    <div className="min-h-screen pt-32 pb-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto mb-20"
        >
          <BilingualHeading 
            english="Follow My Flight"
            spanish="Sigue Mi Vuelo"
            as="h1"
            className="mb-6"
          />
          <p className="text-xl text-muted-foreground leading-relaxed">
            Track my current flight in real-time and explore my flight history.
          </p>
        </motion.div>

        {/* Active Flight Section */}
        {activeFlight && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-6xl mx-auto mb-20"
          >
            <Card className="bg-gradient-dusk border-secondary/20 shadow-glow relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-radial from-secondary/20 to-transparent rounded-full blur-3xl" />
              <CardHeader className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-secondary/20 flex items-center justify-center">
                      <Plane className="h-6 w-6 text-secondary animate-float" />
                    </div>
                    <div>
                      <CardTitle className="text-3xl font-display text-primary-foreground">
                        Active Flight
                      </CardTitle>
                      <CardDescription className="text-base text-secondary">
                        Live Tracking
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/40 text-sm px-4 py-2 animate-pulse">
                    In Flight
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="relative z-10 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-secondary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Route</p>
                        <p className="text-xl font-bold text-primary-foreground">
                          {activeFlight.route.originCode} → {activeFlight.route.destinationCode}
                        </p>
                        <p className="text-base text-muted-foreground">
                          {activeFlight.route.origin} to {activeFlight.route.destination}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Plane className="h-5 w-5 text-secondary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Aircraft</p>
                        <p className="text-lg font-semibold text-primary-foreground">
                          {activeFlight.aircraft.type}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {activeFlight.aircraft.registration}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-card/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-secondary" />
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Altitude</p>
                        </div>
                        <p className="text-2xl font-bold text-primary-foreground">
                          {activeFlight.altitude?.toLocaleString()} ft
                        </p>
                      </div>
                      
                      <div className="bg-card/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Navigation className="h-4 w-4 text-secondary" />
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Speed</p>
                        </div>
                        <p className="text-2xl font-bold text-primary-foreground">
                          {activeFlight.speed} kts
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-secondary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Current Time</p>
                        <p className="text-xl font-mono font-bold text-primary-foreground">
                          {formatTime(currentTime)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {activeFlight.description && (
                  <div className="pt-4 border-t border-border/50">
                    <p className="text-base text-muted-foreground">
                      {activeFlight.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Flight Experience Summary Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-6xl mx-auto mb-20"
        >
          <h2 className="text-3xl font-display font-bold text-primary-foreground mb-8">
            Flight Experience Summary
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
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

          {/* Experience Breakdown */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Aircraft Types Chart */}
            <Card className="bg-gradient-card border-border/50">
              <CardHeader>
                <CardTitle>Flights by Aircraft Type</CardTitle>
                <CardDescription>Number of flights per aircraft type</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
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

            {/* Airport Map */}
            <Card className="bg-gradient-card border-border/50">
              <CardHeader>
                <CardTitle>Airports Visited</CardTitle>
                <CardDescription>All airports flown to or from ({chartData.airports.length} unique)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full rounded-lg overflow-hidden bg-muted/10 border border-border/20 flex items-center justify-center">
                  <iframe
                    src="https://www.openstreetmap.org/export/embed.html?bbox=-115%2C35%2C-100%2C45&amp;layer=mapnik&amp;marker=39.5,-105"
                    className="w-full h-full border-0"
                    style={{ pointerEvents: 'auto' }}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {chartData.airports.slice(0, 15).map((airport, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {airport}
                    </Badge>
                  ))}
                  {chartData.airports.length > 15 && (
                    <Badge variant="outline" className="text-xs">
                      +{chartData.airports.length - 15} more
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Key Metrics */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="bg-gradient-card border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Mountain Flying</p>
                    <p className="text-2xl font-bold text-primary-foreground">{chartData.mountainFlying}h</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {((parseFloat(chartData.mountainFlying) / parseFloat(chartData.totalHours)) * 100).toFixed(1)}% of total
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-border/50">
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

            <Card className="bg-gradient-card border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Average Flight</p>
                    <p className="text-2xl font-bold text-primary-foreground">
                      {(parseFloat(chartData.totalHours) / flightHistory.length).toFixed(1)}h
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Per flight
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Flight History Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="max-w-6xl mx-auto"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-display font-bold text-primary-foreground">
              Flight History
            </h2>
            <Badge variant="outline" className="text-sm">
              {displayedFlights} of {flightHistory.length} flights
            </Badge>
          </div>
          
          <div className="space-y-6">
            {flightHistory.slice(0, displayedFlights).map((flight, index) => (
              <motion.div
                key={flight.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(0.05 * index, 1), duration: 0.5 }}
              >
                <Card className="bg-gradient-card border-border/50 hover:shadow-glow transition-all duration-300 hover:scale-[1.01]">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-secondary" />
                            <span className="text-2xl font-bold text-primary-foreground">
                              {flight.route.originCode} → {flight.route.destinationCode}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-sm">
                            {flight.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
                            <p className="font-semibold text-primary-foreground">
                              {flight.route.origin} → {flight.route.destination}
                            </p>
                          </div>
                        </div>

                        {flight.description && (
                          <p className="text-sm text-muted-foreground pt-2">
                            {flight.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {displayedFlights < flightHistory.length && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center mt-10"
            >
              <Button
                onClick={() => setDisplayedFlights(prev => Math.min(prev + FLIGHTS_PER_PAGE, flightHistory.length))}
                size="lg"
                className="rounded-full px-8 py-6 text-base"
                variant="outline"
              >
                Load More Flights
                <ChevronDown className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

