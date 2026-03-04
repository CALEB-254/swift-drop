import { Link, useLocation } from 'react-router-dom';
import { Home, Search, LayoutDashboard } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';

const senderNavItems = [
  { icon: Home, label: 'Home', path: '/sender' },
  { icon: LayoutDashboard, label: 'Dashboard', path: '/sender/dashboard' },
  { icon: Search, label: 'Track', path: '/sender/track' },
];

const agentNavItems = [
  { icon: LayoutDashboard, label: 'Riders', path: '/rider' },
  { icon: Home, label: 'Agent Point', path: '/agent' },
  { icon: Search, label: 'Track', path: '/sender/track' },
];

export function BottomNav() {
  const location = useLocation();
  const { profile } = useAuthContext();
  
  const navItems = profile?.role === 'agent' ? agentNavItems : senderNavItems;

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
              <Icon 
                className={`w-6 h-6 ${
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                }`} 
              />
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
