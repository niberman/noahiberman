import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { Route, Routes } from "react-router-dom";
import { LazyMotion, domAnimation } from "framer-motion";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";

export { prerenderManifest } from "./lib/routeMeta";

/**
 * Build-time renderer for the fully prerendered routes (/projects and
 * /projects/[slug]). The wrapper divs mirror App.tsx so the markup React
 * commits on the client is pixel identical to what the prerenderer wrote.
 * Only these routes render here; the rest of the site stays client rendered
 * and receives head-only prerendering from scripts/prerender.mjs.
 */
export function render(url: string): string {
  return renderToString(
    <LazyMotion features={domAnimation}>
      <StaticRouter location={url}>
        <div className="min-h-screen flex flex-col relative">
          <div className="flex-1 relative z-10">
            <Routes>
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:slug" element={<ProjectDetail />} />
            </Routes>
          </div>
        </div>
      </StaticRouter>
    </LazyMotion>
  );
}
