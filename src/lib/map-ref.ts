import { useSyncExternalStore } from "react";
import type { Map as MapboxMap } from "mapbox-gl";

let mapRef: MapboxMap | null = null;
const listeners = new Set<() => void>();

/** Called by BackgroundFlightMap once the mapbox map has loaded. */
export function setMapRef(m: MapboxMap | null) {
  if (mapRef === m) return;
  mapRef = m;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): MapboxMap | null {
  return mapRef;
}

export function useMapRef(): MapboxMap | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
