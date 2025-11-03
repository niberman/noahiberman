// Airport code to coordinates mapping
// This is a subset of airports from the flight logbook
export const airportCoordinates: Record<string, [number, number]> = {
  // Colorado airports
  'KAPA': [-104.849, 39.5701], // Centennial
  'KCFO': [-104.702, 38.9589], // Colorado Springs
  'KCOS': [-104.700, 38.8078], // Colorado Springs
  'KFNL': [-105.013, 40.4513], // Fort Collins
  'KASE': [-106.868, 39.2232], // Aspen
  'KLXV': [-106.317, 39.2203], // Leadville
  'KBJC': [-105.117, 39.9083], // Broomfield
  'KPUB': [-104.496, 38.2891], // Pueblo
  'KEIK': [-105.048, 40.0103], // Erie
  'KGXY': [-104.629, 40.4371], // Greeley
  'KLIC': [-103.666, 39.2747], // Limon
  'KTEX': [-107.908, 37.9538], // Telluride
  'KEGE': [-106.373, 39.6428], // Eagle
  'KFLY': [-104.978, 40.2303], // Mead
  'KTAD': [-104.341, 37.2594], // Trinidad
  'KMEJ': [-107.887, 40.0375], // Meeker
  'KSBS': [-106.868, 40.4847], // Steamboat Springs
  'KAEJ': [-105.526, 39.8014], // Central City
  'KANK': [-106.049, 38.5381], // Salida
  'KBDU': [-105.226, 40.0397], // Boulder
  'KLMO': [-105.164, 40.1636], // Longmont
  
  // Wyoming airports
  'KLAR': [-105.675, 41.3121], // Laramie
  'KCYS': [-104.806, 41.1556], // Cheyenne
  'KDGW': [-105.384, 42.7972], // Converse County (Douglas)
  'KCPR': [-106.463, 42.9081], // Casper
  
  // Montana airports
  'KBIL': [-108.542, 45.8077], // Billings
  'KRAP': [-103.057, 44.0453], // Rapid City (SD)
  
  // Nebraska airports
  'KBFF': [-103.5956, 41.8744], // Scottsbluff
  
  // Kansas airports
  'KAKO': [-103.222, 40.1758], // Akron (CO)
  'KSNY': [-102.985, 41.1014], // Sidney (NE)
  'KGLD': [-101.699, 39.3706], // Goodland
  'KDDC': [-99.9647, 37.7633], // Dodge City
  
  // Other airports
  'KIBM': [-103.852, 41.1886], // Kimball (NE)
  'KFMM': [-103.803, 40.3333], // Fort Morgan (CO)
  'KMTN': [-104.842, 40.0686], // Mount Pleasant
  
  // Non-standard codes
  '1V6': [-105.527, 38.4656], // Silver West (CO)
  '18V': [-103.678, 40.3608], // Platte Valley (CO)
};

/**
 * Get coordinates for an airport code
 * Returns null if airport code is not found
 */
export function getAirportCoordinates(code: string): [number, number] | null {
  return airportCoordinates[code.toUpperCase()] || null;
}

/**
 * Calculate great circle distance between two coordinates (in km)
 */
export function calculateDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const R = 6371; // Earth's radius in km
  const [lat1, lon1] = [coord1[1], coord1[0]];
  const [lat2, lon2] = [coord2[1], coord2[0]];
  
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generate a curved arc between two points for map display
 * Returns an array of intermediate points along a great circle
 */
export function generateArc(
  start: [number, number],
  end: [number, number],
  numPoints: number = 50
): [number, number][] {
  const points: [number, number][] = [];
  const [startLon, startLat] = start;
  const [endLon, endLat] = end;
  
  for (let i = 0; i <= numPoints; i++) {
    const fraction = i / numPoints;
    const lat = startLat + (endLat - startLat) * fraction;
    const lon = startLon + (endLon - startLon) * fraction;
    
    // Add slight curve for visual appeal
    const height = Math.sin(fraction * Math.PI) * 0.1;
    const curvedLat = lat + height;
    
    points.push([lon, curvedLat]);
  }
  
  return points;
}

