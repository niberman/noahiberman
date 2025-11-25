import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { LogOut, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { getEnabledModules } from '@/lib/moduleRegistry';

// Import and register modules
import '@/components/dashboard/modules';

const Dashboard = () => {
  const navigate = useNavigate();
  const enabledModules = getEnabledModules();

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    navigate('/login');
  };

  return (
    <>
      <SEO
        title="Command Center - Noah Iberman"
        description="Personal command center and dashboard"
      />

      <div className="min-h-screen bg-gradient-dusk pt-24">
        <div className="container mx-auto px-4 py-8 lg:py-12 max-w-7xl">
          {/* Header */}
          <div className="mb-8 animate-fade-in flex justify-between items-start">
            <div>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2">
                Command Center
              </h1>
              <p className="text-white/70 text-lg">
                Control your digital infrastructure
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white/70 hover:text-white"
              >
                <Settings className="h-5 w-5" />
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>

          {/* Module Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
            {enabledModules.map((module) => {
              const ModuleComponent = module.component;
              const colSpan =
                module.size === 'full'
                  ? 'md:col-span-2 lg:col-span-3'
                  : module.size === 'large'
                  ? 'md:col-span-2 lg:col-span-2'
                  : '';

              return (
                <div key={module.id} className={colSpan}>
                  <ModuleComponent />
                </div>
              );
            })}
          </div>

          {/* Empty State */}
          {enabledModules.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Settings className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-medium text-white mb-2">
                No modules enabled
              </h2>
              <p className="text-muted-foreground">
                Enable modules in settings to see them here.
              </p>
            </div>
          )}

          {/* Quick Info Footer */}
          <div className="mt-12 pt-8 border-t border-white/10">
            <div className="flex flex-wrap gap-6 text-sm text-white/50">
              <div>
                <span className="text-white/70">Modules:</span>{' '}
                {enabledModules.length} active
              </div>
              <div>
                <span className="text-white/70">Last refresh:</span>{' '}
                {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
