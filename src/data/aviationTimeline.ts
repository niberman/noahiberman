export interface AviationTimelineItem {
  id: string;
  year: string;
  title: string;
  subtitleEs?: string;
  body: string;
  status?: "earned" | "in-progress";
}

/**
 * The flying record, oldest to newest. Dates come from the calendar and
 * logbook, not memory: first logged flights May 2021 (KASE), training at
 * McAir Aviation (KBJC) from September 2021, helicopter work at Mile High
 * Rotors through 2024, multi-engine training spring 2025.
 */
export const aviationTimeline: AviationTimelineItem[] = [
  {
    id: "first-flights",
    year: "2021",
    title: "First logged flights",
    subtitleEs: "Los primeros vuelos",
    body: "First logbook entries out of Aspen, then the start of structured training at McAir Aviation on the G1000 fleet at Rocky Mountain Metro.",
    status: "earned",
  },
  {
    id: "ppl",
    year: "2023",
    title: "Private Pilot, Airplane Single-Engine Land",
    subtitleEs: "Piloto privado",
    body: "A summer of near-daily flying and PHAK study sessions. First certificate, earned at Rocky Mountain Metropolitan.",
    status: "earned",
  },
  {
    id: "instrument",
    year: "2023",
    title: "Instrument Rating",
    subtitleEs: "Habilitación de vuelo por instrumentos",
    body: "Earned at Independence Aviation at Centennial. Cleared into the IFR system: clouds, low visibility, real cross-country capability.",
    status: "earned",
  },
  {
    id: "commercial-sel",
    year: "2024",
    title: "Commercial Pilot, Airplane Single-Engine Land",
    subtitleEs: "Piloto comercial",
    body: "The professional certificate. Authorized to fly for hire.",
    status: "earned",
  },
  {
    id: "helicopter",
    year: "2025",
    title: "Private Pilot, Rotorcraft-Helicopter",
    subtitleEs: "De alas fijas a rotores",
    body: "One summer of training at Mile High Rotors, then a pause for the year in Spain. Came back over winter break and finished the rating quickly.",
    status: "earned",
  },
  {
    id: "multi-engine",
    year: "2025",
    title: "Commercial Pilot, Airplane Multi-Engine Land",
    subtitleEs: "Dos motores",
    body: "Multi-engine commercial rating after a spring of training. Bigger aircraft, bigger missions.",
    status: "earned",
  },
  {
    id: "mountain",
    year: "Ongoing",
    title: "Mountain flying",
    subtitleEs: "Vuelo de montaña",
    body: "High density altitude, dynamic weather, demanding terrain. Aspen and the mountain airports are the regular circuit, not the exception.",
    status: "earned",
  },
  {
    id: "cfi",
    year: "In progress",
    title: "Certified Flight Instructor",
    subtitleEs: "El siguiente capítulo",
    body: "Written tests complete, lesson plans underway. Next: teaching other people to fly.",
    status: "in-progress",
  },
];
