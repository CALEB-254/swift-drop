import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'sender' | 'agent' | 'admin';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuthContext();
  const location = useLocation();

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

  // Only enforce role check if profile exists and requiredRole is specified
  if (requiredRole && profile && profile.role !== requiredRole) {
    // Redirect to the appropriate dashboard based on user's role
    const redirectPath = profile.role === 'admin' ? '/admin' : profile.role === 'agent' ? '/rider' : '/sender';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}
