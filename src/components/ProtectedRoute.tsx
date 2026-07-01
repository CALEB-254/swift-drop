import { ReactNode, useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'sender' | 'agent' | 'admin';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, profile, loading, refresh } = useAuthContext();
  const location = useLocation();
  const lastPath = useRef<string | null>(null);

  // Re-validate session + profile on every route change so we never render
  // with stale role/profile data.
  useEffect(() => {
    if (loading) return;
    if (lastPath.current !== location.pathname) {
      lastPath.current = location.pathname;
      refresh();
    }
  }, [location.pathname, loading, refresh]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Block access until the user's email is verified.
  const isEmailUser = !!user.email && (user.app_metadata as any)?.provider !== 'phone';
  const emailVerified = !!user.email_confirmed_at || !!(user as any).confirmed_at;
  if (isEmailUser && !emailVerified) {
    return (
      <Navigate
        to={`/auth/verify?email=${encodeURIComponent(user.email || '')}&type=signup`}
        replace
      />
    );
  }

  // Only enforce role check if profile exists and requiredRole is specified
  if (requiredRole && profile && profile.role !== requiredRole) {
    // Redirect to the appropriate dashboard based on user's role
    const redirectPath = profile.role === 'admin' ? '/admin' : profile.role === 'agent' ? '/rider' : '/sender';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}
