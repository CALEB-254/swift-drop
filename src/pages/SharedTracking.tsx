import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Package as PackageIcon, MapPin, Lock, RefreshCw } from 'lucide-react';
import { PackageJourney, JourneyEvent } from '@/components/PackageJourney';
import { TrackingTimeline } from '@/components/TrackingTimeline';
import { StatusBadge } from '@/components/StatusBadge';
import { PackageStatus } from '@/types/delivery';
import { format } from 'date-fns';
import { logger } from '@/lib/logger';

interface SharedResult {
  found: boolean;
  reason?: 'invalid' | 'revoked' | 'expired' | 'pin_required' | 'bad_pin';
  tracking_number?: string;
  status?: PackageStatus;
  destination?: string;
  receiver_name?: string;
  sender_name?: string;
  created_at?: string;
  events?: JourneyEvent[];
}

const REASONS: Record<string, string> = {
  invalid: 'This tracking link is not valid.',
  revoked: 'This tracking link has been revoked by the sender.',
  expired: 'This tracking link has expired. Ask the sender for a new one.',
  bad_pin: 'Incorrect PIN. Please try again.',
};

/** Secure shareable tracking page at /s/:token — supports optional PIN and expiry. */
export default function SharedTracking() {
  const { token = '' } = useParams();
  const [data, setData] = useState<SharedResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState('');

  const load = useCallback(async (withPin?: string) => {
    setLoading(true);
    const { data: res, error } = await supabase.rpc('get_shared_tracking' as any, {
      _token: token,
      _pin: withPin || null,
    });
    if (error) logger.error('shared tracking failed', error);
    setData((res as unknown as SharedResult) || { found: false, reason: 'invalid' });
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const needsPin = !data?.found && (data?.reason === 'pin_required' || data?.reason === 'bad_pin');

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-primary text-primary-foreground p-5">
        <div className="container">
          <h1 className="font-display text-xl font-bold">Track Package</h1>
          <p className="text-sm opacity-80">Secure tracking link</p>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6 max-w-2xl">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : needsPin ? (
          <Card className="border-0 shadow-card">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                <p className="font-medium">PIN required</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {data?.reason === 'bad_pin' ? REASONS.bad_pin : 'The sender protected this link with a PIN.'}
              </p>
              <div className="space-y-2">
                <Label htmlFor="track-pin">Enter PIN</Label>
                <Input
                  id="track-pin"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <Button className="w-full" onClick={() => load(pin)} disabled={pin.length < 4}>
                View status
              </Button>
            </CardContent>
          </Card>
        ) : !data?.found ? (
          <Card className="border-0 shadow-card">
            <CardContent className="flex flex-col items-center py-12">
              <PackageIcon className="w-14 h-14 text-muted-foreground mb-4" />
              <h2 className="font-display font-semibold text-lg mb-1">Link unavailable</h2>
              <p className="text-sm text-muted-foreground text-center">
                {REASONS[data?.reason || 'invalid']}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-0 shadow-card">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-mono">{data.tracking_number}</p>
                    <StatusBadge status={data.status as PackageStatus} className="mt-1" />
                  </div>
                  <Button variant="ghost" size="icon" aria-label="Refresh" onClick={() => load(pin)}>
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
              <Link to="/" className="text-primary underline">Sign in to send a package</Link>
            </p>
          </>
        )}
      </main>
    </div>
  );
}