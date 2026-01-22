import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Bell, 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Trash2,
  Check
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { BottomNav } from '@/components/BottomNav';
import { format } from 'date-fns';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  tracking_number: string | null;
  created_at: string;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'delivery_created':
      return <Package className="w-5 h-5 text-primary" />;
    case 'in_transit':
      return <Truck className="w-5 h-5 text-blue-500" />;
    case 'delivered':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'pending':
      return <Clock className="w-5 h-5 text-amber-500" />;
    case 'alert':
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    default:
      return <Bell className="w-5 h-5 text-muted-foreground" />;
  }
};

export default function Notifications() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth/login');
      return;
    }

    if (user) {
      fetchNotifications();
    }
  }, [user, authLoading]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
      
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (error: any) {
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user?.id)
        .eq('is_read', false);

      if (error) throw error;
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch (error: any) {
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notification deleted');
    } catch (error: any) {
      toast.error('Failed to delete notification');
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-sm opacity-80">{unreadCount} unread</p>
              )}
            </div>
          </div>
          
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={markAllAsRead}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Check className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="p-4 space-y-3">
        {notifications.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No notifications yet</h3>
              <p className="text-muted-foreground text-sm">
                You'll receive updates about your deliveries here
              </p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`border-0 shadow-sm transition-all ${
                !notification.is_read ? 'bg-primary/5 border-l-4 border-l-primary' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <div className="shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={`font-medium text-sm ${!notification.is_read ? 'font-semibold' : ''}`}>
                        {notification.title}
                      </h4>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    {notification.tracking_number && (
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto mt-2 text-primary"
                        onClick={() => navigate(`/sender/track?id=${notification.tracking_number}`)}
                      >
                        Track: {notification.tracking_number}
                      </Button>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Mark as read
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-destructive hover:text-destructive"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}
