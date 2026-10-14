/**
 * Title and description for every page that ships a prerendered head.
 * Read by the pages' <SEO> tags at runtime and by
 * scripts/prerender-routes.mjs at build time, so crawlers and link previews
 * see the same words the browser does. Case-study pages derive theirs from
 * src/data/caseStudies.ts.
 */
export const ROUTE_META = {
  "/": {
    title: "Noah Berman | Software Engineer and Commercial Pilot",
    description:
      "Noah Berman is a software engineer and FAA commercial pilot, multi-engine and instrument rated, who builds aviation software. University of Denver, Applied Computing. Based in Denver, open to Boulder, San Francisco and international roles.",
  },
  "/work": {
    title: "Work | Noah Berman",
    description:
      "Aviation software by Noah Berman, commercial pilot and software engineer: a flight school operations platform, preflight briefing automation, an aircraft owner portal, a ForeFlight logbook pipeline, and more.",
  },
  "/resume": {
    title: "Resume | Noah Berman, Software Engineer and Commercial Pilot",
    description:
      "Resume of Noah Berman: software engineer and FAA commercial pilot, multi-engine and instrument rated. Aviation operations software, preflight briefing automation, ForeFlight data pipelines. University of Denver, Applied Computing. Denver, open to Boulder, San Francisco and international roles.",
  },
  "/aviation": {
    title: "Aviation | Noah Berman",
    description:
      "Commercial pilot, single and multi-engine, instrument rated, with a private helicopter rating. Certificates, aircraft flown, and flight totals read live from ForeFlight.",
  },
  "/now": {
    title: "Now | Noah Berman",
    description:
      "What Noah Berman is doing right now: looking for an aviation or aerospace software role, software consulting through Aviari, and working toward a CFI.",
  },
  "/es": {
    title: "Noah Berman | Ingeniero de software y piloto comercial",
    description:
      "Noah Berman es ingeniero de software y piloto comercial de la FAA, con habilitaciones multimotor y de vuelo por instrumentos. Construye software de aviación. Vive en Denver, Colorado, y busca un puesto en Boulder, San Francisco o en el extranjero.",
  },
} as const;

export type MetaRoute = keyof typeof ROUTE_META;
