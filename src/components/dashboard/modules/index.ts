// Dashboard Modules Index
// Register all modules here

import { registerModule, applyModulePreferences } from '@/lib/moduleRegistry';
import { FlightControlCard } from './flight';
import { ServerControlCard } from './server';
import { LinkedInAgentCard } from './linkedin';

// Register core modules
registerModule({
  id: 'flight',
  name: 'Flight Control',
  description: 'Manage flight status for live tracking',
  icon: 'Plane',
  component: FlightControlCard,
  enabled: true,
  order: 1,
  size: 'medium',
});

registerModule({
  id: 'server',
  name: 'Server Control',
  description: 'Manage your remote server',
  icon: 'Server',
  component: ServerControlCard,
  enabled: true,
  order: 2,
  size: 'large',
});

registerModule({
  id: 'linkedin',
  name: 'LinkedIn Agent',
  description: 'AI-powered LinkedIn automation',
  icon: 'Linkedin',
  component: LinkedInAgentCard,
  enabled: true,
  order: 3,
  size: 'medium',
});

// Apply user's saved preferences
applyModulePreferences();

// Re-export for convenience
export { FlightControlCard } from './flight';
export { ServerControlCard } from './server';
export { LinkedInAgentCard } from './linkedin';

