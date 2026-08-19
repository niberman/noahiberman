// Shared ADS-B Exchange position lookup used by every live-flight surface
// (flight maps, tracker card, header indicator).

export interface AircraftPosition {
  latitude: number;
  longitude: number;
  altitude: number;
  heading: number;
  speed: number;
  timestamp: number;
}

export const AIRCRAFT_POSITION_POLL_MS = 30_000;

/** Tail number -> ICAO hex (Mode S) code. */
export const TAIL_TO_HEX: Record<string, string> = {
  N405MK: 'a4b605',
};

const ADSB_HOST = 'adsbexchange-com1.p.rapidapi.com';
// TODO: rotate this key and serve it from VITE_ADSB_RAPIDAPI_KEY only.
const ADSB_KEY = import.meta.env.VITE_ADSB_RAPIDAPI_KEY ??
  '311e23f637msh8454e570caa53a6p1a6fc8jsn8a0bf67a91ad';

const DEMO_CENTER: [number, number] = [39.8617, -104.6731];

interface AdsbAircraft {
  lat?: string | number;
  lon?: string | number;
  alt_baro?: string | number;
  alt_geom?: string | number;
  track?: string | number;
  true_heading?: string | number;
  gs?: string | number;
}

const num = (value: string | number | undefined): number => Number(value) || 0;

export function tailToHex(tailNumber: string): string {
  return TAIL_TO_HEX[tailNumber.toUpperCase()] ?? '';
}

/** Position used when a tail number has no hex mapping, so maps still animate. */
export function demoAircraftPosition(spread = 2): AircraftPosition {
  return {
    latitude: DEMO_CENTER[0] + (Math.random() - 0.5) * spread,
    longitude: DEMO_CENTER[1] + (Math.random() - 0.5) * spread,
    altitude: 8500 + Math.random() * 2000,
    heading: Math.random() * 360,
    speed: 150 + Math.random() * 50,
    timestamp: Date.now(),
  };
}

/**
 * Live position for a tail number, or null when it has no hex mapping, the
 * lookup fails, or the aircraft is not transmitting.
 */
export async function fetchAircraftPosition(
  tailNumber: string,
): Promise<AircraftPosition | null> {
  const hexCode = tailToHex(tailNumber);
  if (!hexCode) return null;

  try {
    const response = await fetch(`https://${ADSB_HOST}/v2/hex/${hexCode}/`, {
      headers: {
        'X-RapidAPI-Key': ADSB_KEY,
        'X-RapidAPI-Host': ADSB_HOST,
      },
    });

    if (!response.ok) {
      console.error('ADS-B response not ok:', response.status);
      return null;
    }

    const data = await response.json() as { ac?: AdsbAircraft[] };
    const aircraft = data.ac?.[0];
    if (!aircraft) return null;

    return {
      latitude: num(aircraft.lat),
      longitude: num(aircraft.lon),
      altitude: num(aircraft.alt_baro) || num(aircraft.alt_geom),
      heading: num(aircraft.track) || num(aircraft.true_heading),
      speed: num(aircraft.gs),
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Error fetching aircraft position:', error);
    return null;
  }
}
