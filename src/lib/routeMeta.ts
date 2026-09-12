import { caseStudies } from "@/data/caseStudies";
import { projects, type Project } from "@/data/projectsCatalog";

/**
 * Per-route head data, shared by the runtime SEO component and by
 * scripts/prerender.mjs, so the HTML a crawler receives and the head the SPA
 * maintains after hydration always agree. Every public route gets its own
 * title, description, Open Graph image, and JSON-LD.
 */

export interface RouteMeta {
  path: string;
  title: string;
  description: string;
  ogImage: string; // site-absolute path
  ogType: string;
  jsonLd: object | null;
  /** Render full body markup at build time (projects routes). */
  ssr: boolean;
}

const ORIGIN = "https://noahiberman.com";
const PERSON_ID = `${ORIGIN}/#noah`;
const DEFAULT_OG = "/og-image.png";

/** Minimal Person node so @id references resolve on every page's own graph. */
const personStub = {
  "@type": "Person",
  "@id": PERSON_ID,
  name: "Noah Berman",
  url: `${ORIGIN}/`,
};

const breadcrumb = (items: Array<[string, string]>) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, url], i) => ({
    "@type": "ListItem",
    position: i + 1,
    name,
    item: `${ORIGIN}${url}`,
  })),
});

const projectNode = (p: Project) => {
  if (p.slug === "freedom-aviation") {
    return {
      "@type": "Organization",
      "@id": `${ORIGIN}/projects/${p.slug}#org`,
      name: p.name,
      description: p.oneLiner,
      founder: { "@id": PERSON_ID },
      dissolutionDate: "2026-05",
      url: `${ORIGIN}/projects/${p.slug}`,
    };
  }
  return {
    "@type": "SoftwareApplication",
    "@id": `${ORIGIN}/projects/${p.slug}#app`,
    name: p.name,
    description: p.oneLiner,
    applicationCategory: "WebApplication",
    operatingSystem: "Web",
    url: p.demoUrl ?? `${ORIGIN}/projects/${p.slug}`,
    image: `${ORIGIN}${p.poster}`,
    author: { "@id": PERSON_ID },
    creator: { "@id": PERSON_ID },
    ...(p.repoUrl ? { codeRepository: p.repoUrl } : {}),
  };
};

export function projectsIndexMeta(): RouteMeta {
  return {
    path: "/projects",
    title: "Projects | Noah Berman",
    description:
      "Live, interactive demos of software Noah Berman builds and runs: aviation operations, preflight briefing, AI agents, and small business automation.",
    ogImage: "/og/projects.png",
    ogType: "website",
    ssr: true,
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        personStub,
        {
          "@type": "CollectionPage",
          "@id": `${ORIGIN}/projects#page`,
          url: `${ORIGIN}/projects`,
          name: "Projects | Noah Berman",
          description: "Live demos of software Noah Berman builds and runs.",
          isPartOf: { "@id": `${ORIGIN}/#website` },
          about: { "@id": PERSON_ID },
        },
        {
          "@type": "ItemList",
          itemListElement: projects.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${ORIGIN}/projects/${p.slug}`,
            name: p.displayName,
          })),
        },
        breadcrumb([
          ["Home", "/"],
          ["Projects", "/projects"],
        ]),
        ...projects.map(projectNode),
      ],
    },
  };
}

export function projectDetailMeta(p: Project): RouteMeta {
  return {
    path: `/projects/${p.slug}`,
    title: `${p.displayName} | Projects | Noah Berman`,
    description: p.oneLiner,
    ogImage: `/og/projects/${p.slug}.png`,
    ogType: "website",
    ssr: true,
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        personStub,
        projectNode(p),
        breadcrumb([
          ["Home", "/"],
          ["Projects", "/projects"],
          [p.displayName, `/projects/${p.slug}`],
        ]),
      ],
    },
  };
}

/** Every statically known route the prerenderer should emit. */
export function prerenderManifest(): RouteMeta[] {
  const simple = (
    path: string,
    title: string,
    description: string,
    ogImage = DEFAULT_OG
  ): RouteMeta => ({
    path,
    title,
    description,
    ogImage,
    ogType: "website",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        personStub,
        {
          "@type": "WebPage",
          url: `${ORIGIN}${path}`,
          name: title,
          description,
          about: { "@id": PERSON_ID },
        },
        breadcrumb([
          ["Home", "/"],
          [title.split("|")[0].trim(), path],
        ]),
      ],
    },
    ssr: false,
  });

  return [
    simple(
      "/work",
      "Work | Noah Berman",
      "Shipped work by Noah Berman: production platforms built alone and in use, across restaurant operations, aviation training, education, and AI infrastructure."
    ),
    ...caseStudies.map((s) =>
      simple(`/work/${s.id}`, `${s.title} | Noah Berman`, s.summary)
    ),
    simple(
      "/aviation",
      "Aviation | Noah Berman",
      "Commercial pilot, single and multi-engine, instrument rated, rotorcraft-helicopter. The full flying record, synced live from ForeFlight."
    ),
    simple(
      "/now",
      "Now | Noah Berman",
      "What Noah Berman is doing right now: founding Aviari, working toward a CFI, flying out of Centennial, and planning a move to Latin America."
    ),
    simple(
      "/blog",
      "Blog | Noah Berman",
      "Aviation, AI systems, and technology insights from Noah Berman, a Denver-based commercial pilot, software engineer, and entrepreneur."
    ),
    simple(
      "/inoah",
      "iNoah | Noah Berman's digital twin",
      "Ask iNoah about Noah Berman's aviation career, ventures, and engineering work."
    ),
    simple(
      "/book",
      "Book a meeting | Noah Berman",
      "Choose a meeting type and pick a time that works for you."
    ),
    simple(
      "/es",
      "Noah Berman | Fundador y piloto comercial en Denver, Colorado",
      "Noah Berman es fundador de software y piloto comercial de la FAA con habilitaciones de instrumentos, multimotor y helicóptero, basado en Denver, Colorado. Fundador de Aviari LLC. Graduado de la Universidad de Denver."
    ),
    projectsIndexMeta(),
    ...projects.map(projectDetailMeta),
  ];
}
