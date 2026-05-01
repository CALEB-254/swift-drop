import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Loader2, Clock, CheckCircle2 } from 'lucide-react';

interface JourneyEvent {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
}

interface Props {
  trackingNumber: string;
}

export function PackageJourney({ trackingNumber }: Props) {
  const [events, setEvents] = useState<JourneyEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('notifications')
        .select('id, title, message, type, created_at')
        .eq('tracking_number', trackingNumber)
        .order('created_at', { ascending: true });
      setEvents((data as any) || []);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`journey-${trackingNumber}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `tracking_number=eq.${trackingNumber}`,
      }, (payload) => {
        setEvents(prev => [...prev, payload.new as JourneyEvent]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [trackingNumber]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No journey events recorded yet.
      </p>
    );
  }

  return (
    <ol className="relative border-l border-border ml-3 space-y-4">
      {events.map((e, idx) => {
        const isLatest = idx === events.length - 1;
        return (
          <li key={e.id} className="ml-6">
            <span className={`absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-background ${
              isLatest ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
            }`}>
              {isLatest ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
            </span>
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="font-medium text-sm">{e.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{e.message}</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {format(new Date(e.created_at), 'MMM d, yyyy • h:mm a')}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}