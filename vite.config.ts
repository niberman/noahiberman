import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { promises as fs } from "node:fs";
import { componentTagger } from "lovable-tagger";

// Critical-CSS extraction: beasties inlines only the rules the shipped HTML
// uses and rewrites the entry stylesheet link to a media="print" onload swap,
// so the full Tailwind file loads off the critical path. Runs in closeBundle
// because beasties reads the emitted CSS from dist. Lazy-chunk CSS (maps) is
// never linked from index.html, so it's untouched.
const criticalCss = (): Plugin => ({
  name: "critical-css",
  apply: "build",
  async closeBundle() {
    const { default: Beasties } = await import("beasties");
    const file = path.resolve(__dirname, "dist/index.html");
    const html = await fs.readFile(file, "utf8");
    const beasties = new Beasties({
      path: path.resolve(__dirname, "dist"),
      preload: "media",
      logLevel: "warn",
    });
    await fs.writeFile(file, await beasties.process(html));
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "localhost",
    port: Number(process.env.PORT) || 8080,
  },
  preview: {
    port: Number(process.env.PORT) || 8080,
  },
  plugins: [react(), criticalCss(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Rollup's virtual commonjs interop helper is imported from nearly
          // everywhere; left unassigned it can land inside a lazy chunk and
          // drag it into the eager preload graph.
          if (id.includes("commonjsHelpers")) return "react";

          if (!id.includes("node_modules")) return undefined;

          // Pin core React into its own chunk — without this, Rollup can hoist
          // it into a lazy manual chunk (editor), dragging that chunk into the
          // eager preload graph.
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) {
            return "react";
          }

          if (
            id.includes("mapbox-gl") ||
            id.includes("react-map-gl")
          ) {
            return "maps";
          }

          if (id.includes("@tiptap/") || id.includes("prosemirror")) {
            return "editor";
          }

          // Everything else splits by usage, so dashboard-only libraries
          // don't ride along in an eager vendor chunk.
          return undefined;
        },
      },
    },
  },
}));
