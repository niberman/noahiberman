import type { ComponentType } from 'react';

export interface DashboardModule {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  component: ComponentType;
  enabled: boolean;
  order: number;
  size?: 'small' | 'medium' | 'large' | 'full'; // Grid size hint
}

// Module registry - add new modules here
const moduleRegistry: Map<string, DashboardModule> = new Map();

export function registerModule(module: DashboardModule): void {
  moduleRegistry.set(module.id, module);
}

export function unregisterModule(id: string): void {
  moduleRegistry.delete(id);
}

export function getModule(id: string): DashboardModule | undefined {
  return moduleRegistry.get(id);
}

export function getAllModules(): DashboardModule[] {
  return Array.from(moduleRegistry.values()).sort((a, b) => a.order - b.order);
}

export function getEnabledModules(): DashboardModule[] {
  return getAllModules().filter(m => m.enabled);
}

export function setModuleEnabled(id: string, enabled: boolean): void {
  const module = moduleRegistry.get(id);
  if (module) {
    module.enabled = enabled;
  }
}

// Get enabled module IDs from localStorage
export function loadModulePreferences(): Record<string, boolean> {
  try {
    const saved = localStorage.getItem('dashboard-modules');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

// Save enabled module IDs to localStorage
export function saveModulePreferences(prefs: Record<string, boolean>): void {
  try {
    localStorage.setItem('dashboard-modules', JSON.stringify(prefs));
  } catch {
    // Ignore localStorage errors
  }
}

// Apply saved preferences to registry
export function applyModulePreferences(): void {
  const prefs = loadModulePreferences();
  for (const [id, enabled] of Object.entries(prefs)) {
    setModuleEnabled(id, enabled);
  }
}

