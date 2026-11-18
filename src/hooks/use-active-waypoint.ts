import { useSyncExternalStore } from "react";
import { HERO_WAYPOINT, WAYPOINT_BY_ID, type MapWaypoint } from "@/data/waypoints";

/**
 * Tiny external store for the currently-active waypoint id. Used by the
 * scrollytelling triggers to publish, and by the map + floating card to
 * subscribe. Lives outside React state to avoid prop drilling and to keep
 * the map a long-lived component that re-renders only when needed.
 */
let currentId: string = HERO_WAYPOINT.id;
const listeners = new Set<() => void>();

export function setActiveWaypointId(id: string) {
  if (id === currentId) return;
  currentId = id;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): string {
  return currentId;
}

export function useActiveWaypointId(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useActiveWaypoint(): MapWaypoint {
  const id = useActiveWaypointId();
  return WAYPOINT_BY_ID[id] ?? HERO_WAYPOINT;
}

// Tracks whether the WaypointStack is currently intersecting the viewport.
// Used to hide the floating pin/card once the user scrolls past the journey
// into Contact/SEO sections where the dot would float over opaque content.
let stackVisibleState = false;
const stackListeners = new Set<() => void>();

export function setStackVisible(v: boolean) {
  if (stackVisibleState === v) return;
  stackVisibleState = v;
  stackListeners.forEach((l) => l());
}

function subscribeStack(listener: () => void) {
  stackListeners.add(listener);
  return () => {
    stackListeners.delete(listener);
  };
}

function getStackSnapshot(): boolean {
  return stackVisibleState;
}

export function useStackVisible(): boolean {
  return useSyncExternalStore(subscribeStack, getStackSnapshot, getStackSnapshot);
}

// True while the visitor has taken the controls of the flight map ("Explore
// Map"). The map publishes it; the floating card and the iNoah launcher step
// aside so nothing sits on top of the map they are trying to pan.
let mapExploringState = false;
const exploringListeners = new Set<() => void>();

export function setMapExploring(v: boolean) {
  if (mapExploringState === v) return;
  mapExploringState = v;
  exploringListeners.forEach((l) => l());
}

function subscribeExploring(listener: () => void) {
  exploringListeners.add(listener);
  return () => {
    exploringListeners.delete(listener);
  };
}

function getExploringSnapshot(): boolean {
  return mapExploringState;
}

export function useMapExploring(): boolean {
  return useSyncExternalStore(subscribeExploring, getExploringSnapshot, getExploringSnapshot);
}
