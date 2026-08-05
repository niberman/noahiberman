import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// A deploy invalidates the old hashed chunk URLs; without this, a failed lazy
// import white-screens the SPA (no error boundary catches it). Reload once to
// pick up the fresh index.html — the timestamp guard prevents a reload loop.
window.addEventListener("vite:preloadError", (event) => {
  const last = Number(sessionStorage.getItem("chunk-reload-at") ?? 0);
  if (Date.now() - last > 10_000) {
    event.preventDefault();
    sessionStorage.setItem("chunk-reload-at", String(Date.now()));
    window.location.reload();
  }
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found. Make sure there's a <div id='root'></div> in your HTML.");
}

// Let the static hero shell in index.html reach the screen before React
// replaces it. This deferred module script executes before the browser's
// first rendering opportunity, so mounting synchronously means FCP/LCP wait
// for the whole bundle to parse and render — the shell never paints. rAF
// twice: frame one paints the shell, frame two mounts. Hidden tabs throttle
// rAF indefinitely (and paint nothing), so mount immediately there.
const mount = () => createRoot(rootElement).render(<App />);
if (document.visibilityState === "hidden") {
  mount();
} else {
  requestAnimationFrame(() => requestAnimationFrame(mount));
}
