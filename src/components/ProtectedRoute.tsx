import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { hasSecretAccess, SECRET_ACCESS_EVENT } from "@/lib/secretAccess";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [secretAccess, setSecretAccess] = useState(() => hasSecretAccess());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleSecretAccess = () => setSecretAccess(true);
    window.addEventListener(SECRET_ACCESS_EVENT, handleSecretAccess);
    return () => window.removeEventListener(SECRET_ACCESS_EVENT, handleSecretAccess);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) {
        setIsAuthenticated(secretAccess);
        setIsLoading(false);
        return;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setIsAuthenticated(!!user || secretAccess);
      } catch (error) {
        console.error("Auth check error:", error);
        setIsAuthenticated(secretAccess);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    if (!supabase) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
      } else if (!secretAccess) {
        setIsAuthenticated(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [secretAccess]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-dusk flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

