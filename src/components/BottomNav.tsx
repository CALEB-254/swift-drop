import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Package, Bell } from 'lucide-react';

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Home', path: '/sender' },
  { icon: Search, label: 'Track', path: '/sender/track' },
  { icon: Package, label: 'Pochi', path: '/sender/new' },
  { icon: Bell, label: 'Notifications', path: '/sender/notifications', badge: 7 },
];

export function BottomNav() {
  const location = useLocation();

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
