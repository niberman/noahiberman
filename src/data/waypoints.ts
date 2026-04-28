/**
 * Ordered waypoints for the home page scrollytelling map.
 * The map flies from one waypoint to the next as each trigger crosses
 * the middle of the viewport. Order in this array IS the scroll order.
 */
export interface MapWaypoint {
  id: string;
  /** Optional airport code shown as a label in the card */
  code?: string;
  /** Year(s) for the card eyebrow */
  year?: string;
  /** Card title */
  title: string;
  /** Optional Spanish subtitle */
  subtitle?: string;
  /** Card body — keep short, 1–3 lines */
  body: string;
  /** Camera target [lng, lat] */
  center: [number, number];
  zoom: number;
  pitch?: number;
  bearing?: number;
  /** flyTo duration in ms (default 1800) */
  duration?: number;
  /** Optional secondary point to draw an arc to (e.g. IFR → KASE) */
  arcTo?: [number, number];
  /** Optional CTA on the card */
  cta?: { label: string; href?: string; event?: string };
  /** Optional logo path */
  logo?: string;
  /** Visual accent — drives card chrome and pin color */
  accent?: "aviation" | "education" | "business";
  /**
   * Desktop card placement. "anchored" (default) positions the card next to
   * the map pin via map.project(). "centered" pins it to bottom-center of
   * the viewport — useful for climax/CTA waypoints where the pin marks a
   * hub area rather than a single visit, and a centered card reads better.
   */
  cardPlacement?: "anchored" | "centered";
}

export const HERO_WAYPOINT: MapWaypoint = {
  id: "hero",
  title: "Hero",
  body: "",
  center: [-95, 40],
  zoom: 3.2,
  pitch: 35,
  bearing: -15,
  duration: 2200,
};

export const WAYPOINTS: MapWaypoint[] = [
  {
    id: "ppl",
    code: "KBJC",
    year: "2023",
    title: "Private Pilot License",
    subtitle: "Donde todo comenzó",
    body: "Earned my first certificate at Rocky Mountain Metropolitan Airport. The beginning of the journey.",
    center: [-105.117, 39.9083],
    zoom: 11,
    pitch: 55,
    bearing: 30,
    accent: "aviation",
  },
  {
    id: "ifr",
    code: "KAPA",
    year: "2023",
    title: "Instrument Rating",
    subtitle: "Volando por instrumentos",
    body: "Earned my Instrument Rating at Centennial. Cleared to fly in clouds, low visibility, and the IFR system.",
    center: [-104.849, 39.5701],
    zoom: 11,
    pitch: 55,
    bearing: -10,
    accent: "aviation",
  },
  {
    id: "mountain-flying",
    code: "KASE",
    title: "Mountain Flying",
    subtitle: "Vuelo de montaña",
    body: "Extensive mountain flying experience — high density altitude, dynamic weather, demanding terrain. Aspen is one of the most challenging airports in the country.",
    center: [-106.868, 39.2232],
    zoom: 10.5,
    pitch: 65,
    bearing: 25,
    duration: 2400,
    accent: "aviation",
  },
  {
    id: "commercial",
    code: "KAPA",
    year: "2024",
    title: "Commercial Pilot License",
    subtitle: "Piloto comercial",
    body: "FAA Commercial Pilot certificate at Centennial. Now able to fly professionally — for hire and beyond.",
    center: [-104.849, 39.5701],
    zoom: 11,
    pitch: 55,
    bearing: 20,
    accent: "aviation",
  },
  {
    id: "spain",
    code: "Bilbao",
    year: "2024 – 2025",
    title: "Studied in Bilbao, Spain",
    subtitle: "Un año en Bilbao",
    body: "Immersive year abroad at the University of Deusto. Lived with a local family, built fluency in Spanish, and learned European business and culture.",
    center: [-2.935, 43.263],
    zoom: 11,
    pitch: 55,
    bearing: 20,
    duration: 2600,
    accent: "education",
  },
  {
    id: "helicopter",
    code: "KBJC",
    year: "2024",
    title: "Helicopter Private Pilot",
    subtitle: "De alas fijas a rotores",
    body: "Added a rotorcraft-helicopter rating back at Rocky Mountain Metro — a different way to read the air.",
    center: [-105.117, 39.9083],
    zoom: 12,
    pitch: 60,
    bearing: -45,
    duration: 2400,
    accent: "aviation",
  },
  {
    id: "multi",
    code: "KFNL",
    year: "2025",
    title: "Commercial Multi-Engine",
    subtitle: "Dos motores, más capacidad",
    body: "Multi-engine commercial rating at Northern Colorado Regional. Bigger aircraft, bigger missions.",
    center: [-105.013, 40.4513],
    zoom: 11,
    pitch: 55,
    bearing: 15,
    accent: "aviation",
  },
  {
    id: "language-school",
    year: "2025",
    title: "The Language School",
    subtitle: "Lenguaje como oportunidad",
    body: "Technical Co-Founder. Built the prototype platform digitizing a proven English-fluency curriculum for Spanish-speaking adults.",
    center: [-104.88, 39.777],
    zoom: 14,
    pitch: 55,
    bearing: 0,
    logo: "/language-school.png",
    cta: { label: "Visit thelanguageschool.us", href: "https://thelanguageschool.us" },
    accent: "business",
  },
  {
    id: "freedom-aviation",
    code: "KAPA",
    year: "2025 – Present",
    title: "Freedom Aviation",
    subtitle: "El cielo no es el límite",
    body: "Founder & CEO. Concierge aircraft management and elite flight instruction at Centennial Airport.",
    center: [-104.849, 39.5701],
    zoom: 13,
    pitch: 65,
    bearing: -25,
    duration: 2400,
    logo: "/freedom-aviation.png",
    cta: { label: "Visit freedomaviationco.com", href: "https://freedomaviationco.com" },
    accent: "business",
  },
  {
    id: "follow-my-flight",
    code: "KAPA hub",
    title: "Every flight I've taken",
    subtitle: "Sigue mi vuelo",
    body: "Every route, every airport. Click below to take the controls — pan, zoom, and explore.",
    center: [-105.5, 41.5],
    zoom: 6.5,
    pitch: 45,
    bearing: -15,
    duration: 2600,
    cta: { label: "Click to Explore Map", event: "enableFlightMapInteractive" },
    accent: "aviation",
    cardPlacement: "centered",
  },
];

export const WAYPOINT_BY_ID: Record<string, MapWaypoint> = Object.fromEntries(
  [HERO_WAYPOINT, ...WAYPOINTS].map((w) => [w.id, w])
);
