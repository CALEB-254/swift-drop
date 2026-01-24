import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Package, Bell, LayoutDashboard, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  badge?: number;
}

const senderNavItems: Omit<NavItem, 'badge'>[] = [
  { icon: Home, label: 'Home', path: '/sender' },
  { icon: LayoutDashboard, label: 'Dashboard', path: '/sender/dashboard' },
  { icon: Package, label: 'Send', path: '/sender/new' },
  { icon: Search, label: 'Track', path: '/sender/track' },
  { icon: Bell, label: 'Alerts', path: '/notifications' },
];

const agentNavItems: Omit<NavItem, 'badge'>[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/agent' },
  { icon: Bell, label: 'Alerts', path: '/notifications' },
];

export function BottomNav() {
  const location = useLocation();
  const { user, profile } = useAuthContext();
  const [unreadCount, setUnreadCount] = useState(0);
  
  const baseNavItems = profile?.role === 'agent' ? agentNavItems : senderNavItems;

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      setUnreadCount(count || 0);
    };

    fetchUnreadCount();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('notifications-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchUnreadCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const navItems: NavItem[] = baseNavItems.map(item => ({
    ...item,
    badge: item.path === '/notifications' && unreadCount > 0 ? unreadCount : undefined,
  }));

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex items-center justify-around py-2 pb-safe">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center py-2 px-4 relative"
            >
              <div className="relative">
                <Icon 
                  className={`w-6 h-6 ${
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  }`} 
                />
                {item.badge && (
                  <span className="absolute -top-1 -right-2 bg-destructive text-destructive-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span 
                className={`text-xs mt-1 ${
                  isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
