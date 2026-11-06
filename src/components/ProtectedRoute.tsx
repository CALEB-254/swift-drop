import { ReactNode, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { EmailVerificationBlock } from './EmailVerificationBlock';
import { resolveRoleRedirect } from '@/lib/routing';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'sender' | 'agent' | 'admin' | 'rider';
}

/**
 * Marks the route as private for search engines. Rendered by ProtectedRoute
 * so every guarded page is excluded from indexing automatically.
 */
function useNoIndexMeta() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, profile, loading, refresh } = useAuthContext();
  const location = useLocation();
  const lastPath = useRef<string | null>(null);
  useNoIndexMeta();

  // Rider membership lives in the riders table, not in profiles.role.
  const [riderRecord, setRiderRecord] = useState<boolean | null>(null);

  // Re-validate session + profile on every route change so we never render
  // with stale role/profile data.
  useEffect(() => {
    if (loading) return;
    if (lastPath.current !== location.pathname) {
      lastPath.current = location.pathname;
      refresh();
    }
  }, [location.pathname, loading, refresh]);

  useEffect(() => {
    let cancelled = false;
    if (!user || loading) {
      setRiderRecord(null);
      return;
    }
    if (requiredRole !== 'rider' && requiredRole !== 'sender') {
      setRiderRecord(null);
      return;
    }
    setRiderRecord(null);
    supabase
      .from('riders')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setRiderRecord(!!data);
      });
    return () => {
      cancelled = true;
    };
  }, [user, loading, requiredRole]);

  const waitingOnRiderCheck =
    !!requiredRole &&
    (requiredRole === 'rider' || requiredRole === 'sender') &&
    riderRecord === null;

  if (loading || waitingOnRiderCheck) {
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

  // Block access until the user's email is verified — show a friendly gate
  // (not a silent redirect) with a direct Resend action.
  const isEmailUser = !!user.email && (user.app_metadata as any)?.provider !== 'phone';
  const emailVerified = !!user.email_confirmed_at || !!(user as any).confirmed_at;
  if (isEmailUser && !emailVerified) {
    return <EmailVerificationBlock email={user.email || ''} />;
  }

  if (requiredRole) {
    // Role must come from the authenticated profile, never from the client.
    // A missing profile means "not authorized" — deny instead of failing open.
    if (requiredRole !== 'rider' && !profile?.role) {
      return <Navigate to="/auth/login" state={{ from: location }} replace />;
    }

    // Riders are staff accounts created by admins: a rider record is required
    // for rider pages, and riders are kept out of the sender app.
    if (requiredRole === 'rider' && riderRecord === false) {
      return <Navigate to="/auth/login" state={{ from: location }} replace />;
    }
    if (requiredRole === 'sender' && riderRecord === true) {
      return <Navigate to="/rider" replace />;
    }

    const redirectPath = resolveRoleRedirect(profile?.role, requiredRole);
    if (redirectPath) {
      return <Navigate to={redirectPath} replace />;
    }
  }

  return <>{children}</>;
}
