export type MapFlyToOptions = {
  lat: number;
  lng: number;
  zoom?: number;
  pitch?: number;
  bearing?: number;
  durationMs?: number;
};

export type MapController = {
  flyTo: (options: MapFlyToOptions) => void;
};

let controller: MapController | null = null;
const listeners = new Set<() => void>();

export function getMapController() {
  return controller;
}

export function setMapController(next: MapController | null) {
  controller = next;
  listeners.forEach((listener) => listener());
}

export function subscribeMapController(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

