import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft, Bell, Package, Truck, CheckCircle, Clock, AlertCircle,
  Trash2, Check, Megaphone, Wallet,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { BottomNav } from '@/components/BottomNav';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  category: string | null;
  media_url: string | null;
  media_type: string | null;
  is_read: boolean;
  read_at: string | null;
  tracking_number: string | null;
  created_at: string;
}

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'packages', label: 'Packages' },
  { key: 'payments', label: 'Payments' },
  { key: 'general', label: 'General' },
  { key: 'offers', label: 'Offers' },
] as const;

/** Falls back to inferring a category from the notification type. */
const resolveCategory = (n: Notification): string => {
  if (n.category) return n.category;
  const t = n.type || '';
  if (t.includes('payment') || t.includes('refund') || t.includes('wallet')) return 'payments';
  if (n.tracking_number) return 'packages';
  if (t.includes('promo') || t.includes('offer')) return 'offers';
  return 'general';
};

const categoryIcon = (category: string, type: string) => {
  if (category === 'payments') return <Wallet className="w-5 h-5 text-primary" />;
  if (category === 'offers') return <Megaphone className="w-5 h-5 text-accent" />;
  switch (type) {
    case 'delivery_created': return <Package className="w-5 h-5 text-primary" />;
    case 'in_transit': return <Truck className="w-5 h-5 text-primary" />;
    case 'delivered': return <CheckCircle className="w-5 h-5 text-primary" />;
    case 'pending': return <Clock className="w-5 h-5 text-warning" />;
    case 'alert': return <AlertCircle className="w-5 h-5 text-destructive" />;
    default: return <Bell className="w-5 h-5 text-muted-foreground" />;
  }
};

export default function Notifications() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth/login');
      return;
    }
    if (!user) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) toast.error('Failed to load notifications');
      setNotifications((data as Notification[]) || []);
      setLoading(false);
    };
    fetchNotifications();

    const channel = supabase
      .channel('information-desk')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, authLoading, navigate]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) return toast.error('Failed to mark as read');
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from('notifications').update({ is_read: true })
      .eq('user_id', user?.id).eq('is_read', false);
    if (error) return toast.error('Failed to mark all as read');
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    toast.success('All notifications marked as read');
  };

  const deleteNotification = async (id: string) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) return toast.error('Failed to delete notification');
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast.success('Notification deleted');
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: notifications.length };
    notifications.forEach(n => {
      const cat = resolveCategory(n);
      c[cat] = (c[cat] || 0) + 1;
    });
    return c;
  }, [notifications]);

  const visible = useMemo(
    () => (activeCategory === 'all'
      ? notifications
      : notifications.filter(n => resolveCategory(n) === activeCategory)),
    [notifications, activeCategory]
  );

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-background sticky top-0 z-20 border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-display font-bold text-xl">Information desk</h1>
              {unreadCount > 0 && (
                <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              <Check className="w-4 h-4 mr-1" /> Mark all read
            </Button>
          )}
        </div>

        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => setActiveCategory(c.key)}
              className={cn(
                'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors',
                activeCategory === c.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-muted-foreground border-border'
              )}
            >
              {c.label}
              {counts[c.key] ? <span className="ml-1.5 opacity-70">{counts[c.key]}</span> : null}
            </button>
          ))}
        </div>
      </header>

      <div className="p-4 space-y-3">
        {visible.length === 0 ? (
          <Card className="border-0 shadow-card">
            <CardContent className="p-10 text-center">
              <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="font-display font-semibold text-lg mb-1">Nothing here yet</h2>
              <p className="text-muted-foreground text-sm">
                Updates about your deliveries and offers will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          visible.map(n => {
            const category = resolveCategory(n);
            return (
              <Card
                key={n.id}
                className={cn(
                  'border-0 shadow-card overflow-hidden transition-all',
                  !n.is_read && 'ring-1 ring-primary/40'
                )}
                onClick={() => !n.is_read && markAsRead(n.id)}
              >
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className="shrink-0 mt-0.5 w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                      {categoryIcon(category, n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={cn('text-sm', !n.is_read ? 'font-semibold' : 'font-medium')}>
                          {n.title}
                        </h3>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {format(new Date(n.created_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                        {n.message}
                      </p>
                      {n.is_read && n.read_at && (
                        <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                          <Check className="w-3 h-3 text-primary" />
                          Read {format(new Date(n.read_at), 'MMM d, h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Media banner */}
                  {n.media_url && (
                    n.media_type === 'video' ? (
                      <video
                        src={n.media_url}
                        controls
                        className="mt-3 w-full rounded-xl max-h-64 bg-black"
                      />
                    ) : (
                      <img
                        src={n.media_url}
                        alt={n.title}
                        loading="lazy"
                        className="mt-3 w-full rounded-xl object-cover max-h-64"
                      />
                    )
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    {n.tracking_number && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/sender/track?q=${n.tracking_number}`);
                        }}
                      >
                        Track {n.tracking_number}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-destructive hover:text-destructive ml-auto"
                      onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
}
