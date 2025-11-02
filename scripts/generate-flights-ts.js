import fs from 'fs';

// Read the CSV file
const csv = fs.readFileSync('public/logbook_2025-11-02_15_21_00.csv', 'utf-8');
const lines = csv.split('\n');

// Airport code to city name mapping
const airportNames = {
  'KAPA': 'Centennial',
  'KCFO': 'Colorado Springs',
  'KFNL': 'Fort Collins',
  'KASE': 'Aspen',
  'KLXV': 'Leadville',
  'KLAR': 'Laramie',
  'KBJC': 'Broomfield',
  'KBIL': 'Billings',
  'KCYS': 'Cheyenne',
  'KPUB': 'Pueblo',
  'KEIK': 'Erie',
  'KGXY': 'Greeley',
  'KLIC': 'Limon',
  'KCOS': 'Colorado Springs',
  'KTEX': 'Telluride',
  'KEGE': 'Eagle',
  'KFLY': 'Mead',
  'KTAD': 'Trinidad',
  'KMEJ': 'Meeker',
  'KSBS': 'Steamboat Springs',
  'KRAP': 'Rapid City',
  'KCPR': 'Casper',
  'KAKO': 'Akron',
  'KBDU': 'Boulder',
  'KLMO': 'Longmont',
  'KSNY': 'Sidney',
  'KGLD': 'Goodland',
  'KIBM': 'Kimball',
  'KFMM': 'Fort Morgan',
  'KMTN': 'Mount Pleasant',
  'KDDC': 'Dodge City',
  'KAEJ': 'Central City',
  'KANK': 'Salida',
  '1V6': 'Silver West',
  '18V': 'Platte Valley',
};

// Parse aircraft table
const aircraftMap = {};
let inAircraftTable = false;
for (let i = 0; i < lines.length && i < 85; i++) {
  const line = lines[i];
  if (line.includes('AircraftID,TypeCode')) {
    inAircraftTable = true;
    continue;
  }
  if (inAircraftTable && line.trim() && !line.startsWith(',,,,')) {
    const parts = line.split(',');
    const id = parts[0]?.trim();
    const model = parts[4]?.trim();
    const make = parts[3]?.trim();
    if (id && id.length > 0 && model && !id.includes('AircraftID')) {
      aircraftMap[id] = {
        type: model || 'Aircraft',
        make: make || 'Unknown'
      };
    }
  }
}

// Parse flights
const flights = [];
let inFlightsTable = false;
for (let i = 86; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('Date,AircraftID,From')) {
    inFlightsTable = true;
    continue;
  }
  if (inFlightsTable && line.trim()) {
    const parts = line.split(',');
    const date = parts[0]?.trim();
    
    if (date && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const aircraftId = parts[1]?.trim();
      const from = parts[2]?.trim();
      const to = parts[3]?.trim();
      const route = parts[4]?.trim();
      const totalTime = parseFloat(parts[11]) || 0;
      const instructorComments = parts[52]?.replace(/"""/g, '').trim() || '';
      const pilotComments = parts[56]?.replace(/"""/g, '').trim() || '';
      const comments = (instructorComments || pilotComments).replace(/""/g, '').trim();
      
      if (totalTime > 0 && from && to && aircraftId) {
        const aircraft = aircraftMap[aircraftId] || { type: 'Aircraft', make: 'Unknown' };
        const hours = Math.floor(totalTime);
        const minutes = Math.round((totalTime - hours) * 60);
        const duration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        
        const fromName = airportNames[from] || from;
        const toName = airportNames[to] || to;
        
        flights.push({
          date,
          aircraftId,
          from,
          to,
          fromName,
          toName,
          route,
          totalTime,
          duration,
          aircraft: aircraft.type,
          make: aircraft.make,
          comments
        });
      }
    }
  }
}

// Sort by date descending
flights.sort((a, b) => new Date(b.date) - new Date(a.date));

// Generate TypeScript code
let tsCode = `export interface Flight {
  id: string;
  date: string;
  route: {
    origin: string;
    originCode: string;
    destination: string;
    destinationCode: string;
  };
  aircraft: {
    type: string;
    registration: string;
  };
  duration?: string;
  status: "completed" | "active" | "upcoming";
  departureTime?: string;
  arrivalTime?: string;
  altitude?: number;
  speed?: number;
  position?: {
    latitude: number;
    longitude: number;
  };
  description?: string;
}

// No active flight currently
export const activeFlight: Flight | null = null;

export const flightHistory: Flight[] = [
`;

flights.forEach((flight, index) => {
  const id = `flight-${flight.date}${index > 0 ? `-${index}` : ''}`;
  const routeDesc = flight.route ? `Route: ${flight.route}` : '';
  const description = flight.comments 
    ? (routeDesc ? `${routeDesc} - ${flight.comments}` : flight.comments)
    : routeDesc;
  
  tsCode += `  {
    id: "${id}",
    date: "${flight.date}",
    route: {
      origin: "${flight.fromName}",
      originCode: "${flight.from}",
      destination: "${flight.toName}",
      destinationCode: "${flight.to}",
    },
    aircraft: {
      type: "${flight.make} ${flight.aircraft}",
      registration: "${flight.aircraftId}",
    },
    duration: "${flight.duration}",
    status: "completed",
${description ? `    description: ${JSON.stringify(description)},\n` : ''}  },
`;
});

tsCode += `];\n`;

// Write to file
fs.writeFileSync('src/data/flights.ts', tsCode);
console.log(`Generated ${flights.length} flights in src/data/flights.ts`);

