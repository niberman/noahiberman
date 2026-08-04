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

createRoot(rootElement).render(<App />);
