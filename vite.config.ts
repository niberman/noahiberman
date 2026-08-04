import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "localhost",
    port: Number(process.env.PORT) || 8080,
  },
  preview: {
    port: Number(process.env.PORT) || 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
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
