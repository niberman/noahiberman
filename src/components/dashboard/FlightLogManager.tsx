import { useState, useCallback, useRef } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Upload, Plus, Trash2, Plane, MapPin, Clock, Loader2,
  FileUp, CheckCircle2, AlertTriangle,
} from 'lucide-react';

import { useFlights, useBulkCreateFlights, useCreateFlight, useDeleteFlight } from '@/hooks/use-supabase-flights';
import { useAirportCoordinates, useCreateAirport, useBulkCreateAirports } from '@/hooks/use-supabase-airports';
import { useFlightStats } from '@/hooks/use-flight-stats';
import { parseForeFlight, type ParsedImport } from '@/lib/foreflight-csv-parser';
import { lookupAirport } from '@/lib/airport-lookup';

// ─────────────────────────────────────────────────────────────────────────────
// FlightLogManager – dashboard component for managing flight logs
// ─────────────────────────────────────────────────────────────────────────────

export default function FlightLogManager() {
  const { toast } = useToast();
  const { data: flights } = useFlights();
  const { data: airports } = useAirportCoordinates();
  const { stats } = useFlightStats();

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <Card className="bg-secondary/10 border-secondary/20">
        <CardContent className="pt-5 sm:pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary-foreground">{stats.totalHoursDisplay}</p>
              <p className="text-xs text-muted-foreground">Total Hours</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-foreground">{stats.totalFlightsDisplay}</p>
              <p className="text-xs text-muted-foreground">Total Flights</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-foreground">{stats.uniqueAirports}</p>
              <p className="text-xs text-muted-foreground">Airports</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-foreground">{stats.mountainHours}h</p>
              <p className="text-xs text-muted-foreground">Mountain</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CSV Import Section */}
      <CSVImportCard flights={flights} airports={airports} />

      {/* Manual Add Flight */}
      <ManualFlightCard />

      {/* Add Airport */}
      <AddAirportCard />

      {/* Recent Flights */}
      <RecentFlightsCard flights={flights} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV Import Card
// ─────────────────────────────────────────────────────────────────────────────

function CSVImportCard({
  flights,
  airports,
}: {
  flights: ReturnType<typeof useFlights>['data'];
  airports: ReturnType<typeof useAirportCoordinates>['data'];
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ flights: number; airports: number } | null>(null);

  const bulkCreateFlights = useBulkCreateFlights();
  const bulkCreateAirports = useBulkCreateAirports();

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setImportResult(null);

      const text = await file.text();

      // Build dedup sets from existing data
      const existingAirportCodes = new Set(airports?.map(a => a.code) ?? []);
      const existingFlightKeys = new Set(
        flights?.map(f =>
          `${f.date}|${f.route?.originCode}|${f.route?.destinationCode}|${f.aircraft?.registration}`
        ) ?? [],
      );

      try {
        const result = parseForeFlight(text, existingAirportCodes, existingFlightKeys);
        setParsed(result);

        if (result.flights.length === 0) {
          toast({
            title: 'No new flights',
            description: `${result.totalRows} rows parsed, ${result.skippedRows} skipped (duplicates or invalid).`,
          });
        }
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'CSV Parse Error',
          description: err instanceof Error ? err.message : 'Failed to parse CSV',
        });
      }

      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [flights, airports, toast],
  );

  const handleImport = async () => {
    if (!parsed) return;
    setImporting(true);

    try {
      // Insert new airports first
      if (parsed.newAirports.length > 0) {
        await bulkCreateAirports.mutateAsync(
          parsed.newAirports.map(a => ({
            code: a.code,
            name: a.name,
            longitude: a.longitude,
            latitude: a.latitude,
          })),
        );
      }

      // Insert flights
      if (parsed.flights.length > 0) {
        await bulkCreateFlights.mutateAsync(parsed.flights);
      }

      setImportResult({
        flights: parsed.flights.length,
        airports: parsed.newAirports.length,
      });
      setParsed(null);

      toast({
        title: 'Import Complete',
        description: `Added ${parsed.flights.length} flights and ${parsed.newAirports.length} new airports.`,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="bg-card/95 backdrop-blur">
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileUp className="h-5 w-5 text-secondary" />
          <CardTitle className="text-lg">Import ForeFlight Logbook</CardTitle>
        </div>
        <CardDescription>
          Upload a CSV export from ForeFlight to bulk-import flights
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File picker */}
        <div
          className="border-2 border-dashed border-border/60 rounded-lg p-6 text-center cursor-pointer hover:border-secondary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Click to select a ForeFlight CSV file
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileSelect}
            title="Select ForeFlight CSV file"
            aria-label="Select ForeFlight CSV file"
          />
        </div>

        {/* Parse preview */}
        {parsed && parsed.flights.length > 0 && (
          <div className="rounded-lg bg-muted/50 p-4 space-y-3 animate-fade-in">
            <h4 className="font-semibold text-sm text-primary-foreground">
              Ready to Import
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Flights</p>
                <p className="font-bold text-primary-foreground">{parsed.flights.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">New Airports</p>
                <p className="font-bold text-primary-foreground">{parsed.newAirports.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date Range</p>
                <p className="font-bold text-primary-foreground text-xs">
                  {parsed.flights[parsed.flights.length - 1]?.date} — {parsed.flights[0]?.date}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Skipped</p>
                <p className="font-bold text-primary-foreground">{parsed.skippedRows}</p>
              </div>
            </div>

            {parsed.newAirports.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold">New airports:</span>{' '}
                {parsed.newAirports.map(a => a.code).join(', ')}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleImport}
                disabled={importing}
                className="flex-1"
              >
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Import {parsed.flights.length} Flights
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setParsed(null)} disabled={importing}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Import success */}
        {importResult && (
          <div className="flex items-center gap-2 rounded-md bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            Imported {importResult.flights} flights and {importResult.airports} new airports.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Manual Add Flight Card
// ─────────────────────────────────────────────────────────────────────────────

function ManualFlightCard() {
  const { toast } = useToast();
  const createFlight = useCreateFlight();
  const createAirport = useCreateAirport();
  const { data: airports } = useAirportCoordinates();

  const [date, setDate] = useState('');
  const [originCode, setOriginCode] = useState('');
  const [destCode, setDestCode] = useState('');
  const [aircraftType, setAircraftType] = useState('');
  const [registration, setRegistration] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !originCode || !destCode || !registration) return;

    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    const duration = h > 0 ? `${h}h ${m}m` : `${m}m`;

    const originLookup = lookupAirport(originCode);
    const destLookup = lookupAirport(destCode);

    try {
      // Auto-add any new airports
      const existingCodes = new Set(airports?.map(a => a.code) ?? []);
      for (const lookup of [originLookup, destLookup]) {
        if (lookup && !existingCodes.has(lookup.code)) {
          await createAirport.mutateAsync({
            code: lookup.code,
            name: lookup.name,
            longitude: lookup.longitude,
            latitude: lookup.latitude,
          });
        }
      }

      await createFlight.mutateAsync({
        date,
        route: {
          origin: originLookup?.name || originCode,
          originCode: originCode.toUpperCase(),
          destination: destLookup?.name || destCode,
          destinationCode: destCode.toUpperCase(),
        },
        aircraft: {
          type: aircraftType,
          registration: registration.toUpperCase(),
        },
        duration,
        status: 'completed',
        description: description || undefined,
      });

      toast({ title: 'Flight Added', description: `${originCode} → ${destCode}` });

      // Reset form
      setDate(''); setOriginCode(''); setDestCode('');
      setAircraftType(''); setRegistration('');
      setHours(''); setMinutes(''); setDescription('');
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to add flight',
      });
    }
  };

  return (
    <Card className="bg-card/95 backdrop-blur">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-secondary" />
          <CardTitle className="text-lg">Add Flight</CardTitle>
        </div>
        <CardDescription>Manually add a single flight entry</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fl-date">Date</Label>
              <Input
                id="fl-date" type="date" value={date}
                onChange={e => setDate(e.target.value)} required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fl-reg">Registration</Label>
              <Input
                id="fl-reg" placeholder="N12345" value={registration}
                onChange={e => setRegistration(e.target.value.toUpperCase())} required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fl-from">From (ICAO)</Label>
              <Input
                id="fl-from" placeholder="KAPA" value={originCode}
                onChange={e => setOriginCode(e.target.value.toUpperCase())} required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fl-to">To (ICAO)</Label>
              <Input
                id="fl-to" placeholder="KASE" value={destCode}
                onChange={e => setDestCode(e.target.value.toUpperCase())} required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fl-type">Aircraft Type</Label>
            <Input
              id="fl-type" placeholder="Cessna Aircraft 172 Skyhawk" value={aircraftType}
              onChange={e => setAircraftType(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fl-hours">Hours</Label>
              <Input
                id="fl-hours" type="number" min="0" placeholder="1" value={hours}
                onChange={e => setHours(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fl-mins">Minutes</Label>
              <Input
                id="fl-mins" type="number" min="0" max="59" placeholder="30" value={minutes}
                onChange={e => setMinutes(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fl-desc">Description</Label>
            <Input
              id="fl-desc" placeholder="Route: KLXV KCFO" value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={createFlight.isPending || !date || !originCode || !destCode || !registration}
          >
            {createFlight.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding…</>
            ) : (
              <><Plane className="mr-2 h-4 w-4" /> Add Flight</>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Airport Card
// ─────────────────────────────────────────────────────────────────────────────

function AddAirportCard() {
  const { toast } = useToast();
  const createAirport = useCreateAirport();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');

  const handleCodeBlur = () => {
    if (!code) return;
    const result = lookupAirport(code);
    if (result) {
      setName(result.name);
      setLat(String(result.latitude));
      setLon(String(result.longitude));
      if (result.code !== code.toUpperCase()) {
        setCode(result.code);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    if (!code || isNaN(latitude) || isNaN(longitude)) return;

    try {
      await createAirport.mutateAsync({
        code: code.toUpperCase(),
        name: name || null,
        latitude,
        longitude,
      });
      toast({ title: 'Airport Added', description: `${code.toUpperCase()} — ${name}` });
      setCode(''); setName(''); setLat(''); setLon('');
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to add airport',
      });
    }
  };

  return (
    <Card className="bg-card/95 backdrop-blur">
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-secondary" />
          <CardTitle className="text-lg">Add Airport</CardTitle>
        </div>
        <CardDescription>
          Add a new airport to the map. Coordinates auto-populate from ICAO code.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ap-code">ICAO Code</Label>
              <Input
                id="ap-code" placeholder="KDEN" value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                onBlur={handleCodeBlur}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-name">Name</Label>
              <Input
                id="ap-name" placeholder="Denver International" value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ap-lat">Latitude</Label>
              <Input
                id="ap-lat" type="number" step="any" placeholder="39.8561" value={lat}
                onChange={e => setLat(e.target.value)} required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-lon">Longitude</Label>
              <Input
                id="ap-lon" type="number" step="any" placeholder="-104.6737" value={lon}
                onChange={e => setLon(e.target.value)} required
              />
            </div>
          </div>

          <Button
            type="submit" className="w-full"
            disabled={createAirport.isPending || !code || !lat || !lon}
          >
            {createAirport.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding…</>
            ) : (
              <><MapPin className="mr-2 h-4 w-4" /> Add Airport</>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Recent Flights Card
// ─────────────────────────────────────────────────────────────────────────────

function RecentFlightsCard({
  flights,
}: {
  flights: ReturnType<typeof useFlights>['data'];
}) {
  const { toast } = useToast();
  const deleteFlight = useDeleteFlight();
  const recent = (flights ?? []).slice(0, 10);

  if (recent.length === 0) return null;

  return (
    <Card className="bg-card/95 backdrop-blur">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-secondary" />
          <CardTitle className="text-lg">Recent Flights</CardTitle>
        </div>
        <CardDescription>Last 10 flights in the database</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {recent.map(flight => (
          <div
            key={flight.id}
            className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-muted-foreground text-xs shrink-0">
                {flight.date}
              </span>
              <span className="font-semibold text-primary-foreground truncate">
                {flight.route?.originCode} → {flight.route?.destinationCode}
              </span>
              <Badge variant="outline" className="text-xs shrink-0">
                {flight.duration}
              </Badge>
            </div>
            <Button
              variant="ghost" size="sm"
              className="text-destructive/70 hover:text-destructive shrink-0 h-7 w-7 p-0"
              onClick={async () => {
                try {
                  await deleteFlight.mutateAsync(flight.id);
                  toast({ title: 'Deleted', description: `Flight ${flight.route?.originCode} → ${flight.route?.destinationCode}` });
                } catch {
                  toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete' });
                }
              }}
              disabled={deleteFlight.isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
