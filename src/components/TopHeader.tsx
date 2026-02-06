import { Link } from 'react-router-dom';
import { ShoppingCart, Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { ProfileDropdown } from './ProfileDropdown';

export function TopHeader() {
  const { user } = useAuthContext();
  const [cartCount, setCartCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchCounts = async () => {
      const { count: cartItems } = await supabase
        .from('packages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('payment_status', 'pending');

      setCartCount(cartItems || 0);

      const { count: unreadNotifications } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setNotificationCount(unreadNotifications || 0);
    };

    fetchCounts();

    const packagesChannel = supabase
      .channel('cart-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'packages', filter: `user_id=eq.${user.id}` }, () => fetchCounts())
      .subscribe();

    const notificationsChannel = supabase
      .channel('notifications-header-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => fetchCounts())
      .subscribe();

    return () => {
      supabase.removeChannel(packagesChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [user]);

  return (
    <div className="flex items-center justify-between">
      <span className="font-display text-lg font-bold text-primary-foreground">
        SwiftDrop
      </span>
      <div className="flex items-center gap-2">
        <Link to="/notifications" className="p-2 relative">
          <Bell className="w-6 h-6 text-primary-foreground" />
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-medium px-1">
              {notificationCount > 99 ? '99+' : notificationCount}
            </span>
          )}
        </Link>
        <Link to="/sender/cart" className="p-2 relative">
          <ShoppingCart className="w-6 h-6 text-primary-foreground" />
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-medium px-1">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </Link>
        <ProfileDropdown />
      </div>
    </div>
  );
}
