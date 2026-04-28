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
