import raw from "./projects.json";
import repoStatus from "./repo-status.json";

/**
 * Typed access to projects.json, the single source of truth for /projects.
 * Repo buttons are gated by repo-status.json, which scripts/check-repos.mjs
 * refreshes at build time with a HEAD request per repository; a private or
 * deleted repo drops its button here rather than 404ing a visitor.
 */

export type ProjectStatus = "in use" | "parked" | "in progress" | "closed";

export interface ProjectLoop {
  mp4: string;
  webm: string;
}

export interface Project {
  slug: string;
  name: string;
  displayName: string;
  oneLiner: string;
  paragraph: string;
  status: ProjectStatus;
  statusNote: string | null;
  demoUrl: string | null;
  repoUrl: string | null;
  writeupUrl: string | null;
  poster: string;
  loop: ProjectLoop | null;
  shots: string[];
  accent: string;
  alt: string;
}

const reachable = repoStatus as Record<string, boolean>;

export const projects: Project[] = (raw.projects as Project[]).map((p) => ({
  ...p,
  repoUrl: p.repoUrl && reachable[p.repoUrl] ? p.repoUrl : null,
}));

export const projectBySlug = (slug: string): Project | undefined =>
  projects.find((p) => p.slug === slug);

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  "in use": "In use",
  parked: "Parked",
  "in progress": "In progress",
  closed: "Closed",
};
