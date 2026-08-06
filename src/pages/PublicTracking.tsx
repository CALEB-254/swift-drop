import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Package as PackageIcon, RefreshCw, MapPin } from 'lucide-react';
import { PackageJourney, JourneyEvent } from '@/components/PackageJourney';
import { TrackingTimeline } from '@/components/TrackingTimeline';
import { StatusBadge } from '@/components/StatusBadge';
import { PackageStatus, STATUS_LABELS } from '@/types/delivery';
import { format } from 'date-fns';
import { logger } from '@/lib/logger';

interface PublicPackage {
  found: boolean;
  tracking_number?: string;
  status?: PackageStatus;
  destination?: string;
  receiver_name?: string;
  sender_name?: string;
  created_at?: string;
  updated_at?: string;
  events?: JourneyEvent[];
}

/** Public, login-free tracking page reachable at /t/:trackingNumber */
export default function PublicTracking() {
  const { trackingNumber = '' } = useParams();
  const [data, setData] = useState<PublicPackage | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: res, error } = await supabase.rpc('get_public_tracking', {
      _tracking_number: trackingNumber,
    });
    if (error) logger.error('public tracking failed', error);
    setData((res as unknown as PublicPackage) || { found: false });
    setLoading(false);
  }, [trackingNumber]);

  useEffect(() => { load(); }, [load]);

  // Live refresh whenever the package changes
  useEffect(() => {
    const channel = supabase
      .channel(`public-track-${trackingNumber}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'packages',
        filter: `tracking_number=eq.${trackingNumber}`,
      }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [trackingNumber, load]);

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-primary text-primary-foreground p-5">
        <div className="container">
          <h1 className="font-display text-xl font-bold">Track Package</h1>
          <p className="text-sm opacity-80 font-mono">{trackingNumber}</p>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6 max-w-2xl">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !data?.found ? (
          <Card className="border-0 shadow-card">
            <CardContent className="flex flex-col items-center py-12">
              <PackageIcon className="w-14 h-14 text-muted-foreground mb-4" />
              <h2 className="font-display font-semibold text-lg mb-1">Package not found</h2>
              <p className="text-sm text-muted-foreground text-center">
                We could not find a package with this tracking number.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-0 shadow-card">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Current status</p>
                    <StatusBadge status={data.status as PackageStatus} className="mt-1" />
                  </div>
                  <Button variant="ghost" size="icon" aria-label="Refresh" onClick={load}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                  <span>{data.destination}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">From</p>
                    <p className="font-medium">{data.sender_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">To</p>
                    <p className="font-medium">{data.receiver_name}</p>
                  </div>
                </div>
                {data.created_at && (
                  <p className="text-xs text-muted-foreground pt-1">
                    Created {format(new Date(data.created_at), 'MMM d, yyyy • h:mm a')}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card">
              <CardHeader><CardTitle className="font-display text-lg">Delivery Progress</CardTitle></CardHeader>
              <CardContent>
                <TrackingTimeline currentStatus={data.status as PackageStatus} />
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card">
              <CardHeader><CardTitle className="font-display text-lg">Package Journey</CardTitle></CardHeader>
              <CardContent>
                <PackageJourney trackingNumber={data.tracking_number!} events={data.events || []} />
              </CardContent>
            </Card>

            <p className="text-center text-xs text-muted-foreground">
              Status: {STATUS_LABELS[data.status as PackageStatus]} ·{' '}
              <Link to="/" className="text-primary underline">Sign in to send a package</Link>
            </p>
          </>
        )}
      </main>
    </div>
  );
}
