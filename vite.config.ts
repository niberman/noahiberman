import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "localhost",
    port: 8080,
  },
  preview: {
    port: 8080,
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
          if (!id.includes("node_modules")) return undefined;

          if (id.includes("/react-dom/") || id.includes("/react/")) {
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

          if (
            id.includes("framer-motion") ||
            id.includes("recharts") ||
            id.includes("embla-carousel-react")
          ) {
            return "visuals";
          }

          if (id.includes("@radix-ui/")) {
            return "radix";
          }

          if (id.includes("react-day-picker") || id.includes("date-fns")) {
            return "dates";
          }

          return "vendor";
        },
      },
    },
  },
}));
