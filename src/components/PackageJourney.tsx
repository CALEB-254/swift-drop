import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Loader2, Package as PackageIcon, MapPin, Circle } from 'lucide-react';

export interface JourneyEvent {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
}

interface Props {
  trackingNumber: string;
  /** Pre-loaded events (public tracking page). When set, no fetching happens. */
  events?: JourneyEvent[];
}

/** Timeline of everything that happened to a package, newest last. */
export function PackageJourney({ trackingNumber, events: providedEvents }: Props) {
  const [events, setEvents] = useState<JourneyEvent[]>(providedEvents || []);
  const [loading, setLoading] = useState(!providedEvents);

  useEffect(() => {
    if (providedEvents) {
      setEvents(providedEvents);
      setLoading(false);
      return;
    }

    let active = true;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('notifications')
        .select('id, title, message, type, created_at')
        .eq('tracking_number', trackingNumber)
        .order('created_at', { ascending: true });
      if (!active) return;
      setEvents((data as JourneyEvent[]) || []);
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

    return () => { active = false; supabase.removeChannel(channel); };
  }, [trackingNumber, providedEvents]);

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
    <ol className="space-y-0">
      {events.map((e, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === events.length - 1;
        const Icon = isFirst ? PackageIcon : isLast ? MapPin : Circle;
        return (
          <li key={e.id} className="flex gap-3">
            {/* Marker + connector */}
            <div className="flex flex-col items-center">
              <span className="w-7 h-7 shrink-0 rounded-full border-2 border-primary/70 bg-primary/10 flex items-center justify-center">
                <Icon className="w-3.5 h-3.5 text-primary" />
              </span>
              {!isLast && (
                <span
                  className="flex-1 w-px my-1 border-l-2 border-dashed border-primary/40"
                  aria-hidden="true"
                />
              )}
            </div>

            {/* Event body */}
            <div className={isLast ? 'pb-1 flex-1' : 'pb-5 flex-1'}>
              <p className="text-xs text-muted-foreground">
                {format(new Date(e.created_at), 'h:mm:ss a, EEE MMM dd yyyy')}
              </p>
              <p className="text-sm leading-snug mt-0.5">{e.message || e.title}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
