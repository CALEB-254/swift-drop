import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Route, Share2, Check, Lock, Loader2 } from 'lucide-react';
import { PackageJourney } from './PackageJourney';
import { StatusBadge } from './StatusBadge';
import { PackageStatus } from '@/types/delivery';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  trackingNumber: string;
  /** When provided, a secure (PIN / expiring) share link can be generated. */
  packageId?: string;
  status?: PackageStatus;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  label?: string;
  className?: string;
}

export const publicTrackingUrl = (trackingNumber: string) =>
  `${window.location.origin}/t/${encodeURIComponent(trackingNumber)}`;

export const sharedTrackingUrl = (token: string) =>
  `${window.location.origin}/s/${token}`;

/** "Track order" button — opens the package journey and offers a public share link. */
export function TrackJourneyButton({
  trackingNumber, packageId, status, variant = 'outline', size = 'sm', label = 'Track order', className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pin, setPin] = useState('');
  const [expiry, setExpiry] = useState('never');
  const [creating, setCreating] = useState(false);
  const [secureLink, setSecureLink] = useState<string | null>(null);

  const link = publicTrackingUrl(trackingNumber);

  const shareUrl = async (url: string) => {
    const text = `Track package ${trackingNumber}: ${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Package ${trackingNumber}`, text, url });
        return;
      } catch {
        /* user dismissed — fall through to copy */
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Tracking link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const createSecureLink = async () => {
    if (!packageId) return;
    if (pin && !/^\d{4,6}$/.test(pin)) { toast.error('PIN must be 4–6 digits'); return; }
    setCreating(true);
    const days = expiry === 'never' ? null : Number(expiry);
    const expiresAt = days ? new Date(Date.now() + days * 86400000).toISOString() : null;
    const { data, error } = await supabase.rpc('create_tracking_link' as any, {
      _package_id: packageId,
      _pin: pin || null,
      _expires_at: expiresAt,
    });
    setCreating(false);
    if (error) { toast.error('Could not create link', { description: error.message }); return; }
    const token = (data as any)?.token as string;
    setSecureLink(sharedTrackingUrl(token));
    toast.success('Secure tracking link created');
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={`gap-2 ${className || ''}`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
      >
        <Route className="w-4 h-4" />
        {size !== 'icon' && <span className="text-xs">{label}</span>}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Package Journey</DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between gap-2 pb-2">
            <p className="font-mono text-sm text-primary">{trackingNumber}</p>
            {status && <StatusBadge status={status} />}
          </div>

          <PackageJourney trackingNumber={trackingNumber} />

          <div className="pt-3 border-t border-border space-y-2">
            <Button variant="secondary" className="w-full gap-2" onClick={() => shareUrl(link)}>
              {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              Share tracking link
            </Button>
            <p className="text-[11px] text-muted-foreground mt-2 text-center break-all">{link}</p>
          </div>

          {packageId && (
            <div className="pt-3 border-t border-border space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium">Secure share link</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Optionally protect the link with a PIN and make it expire.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">PIN (optional)</Label>
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="4–6 digits"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Expires</Label>
                  <Select value={expiry} onValueChange={setExpiry}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never</SelectItem>
                      <SelectItem value="1">In 1 day</SelectItem>
                      <SelectItem value="3">In 3 days</SelectItem>
                      <SelectItem value="7">In 7 days</SelectItem>
                      <SelectItem value="30">In 30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full gap-2" onClick={createSecureLink} disabled={creating}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Create secure link
              </Button>
              {secureLink && (
                <div className="space-y-2">
                  <p className="text-[11px] text-muted-foreground text-center break-all">{secureLink}</p>
                  <Button variant="secondary" className="w-full gap-2" onClick={() => shareUrl(secureLink)}>
                    <Share2 className="w-4 h-4" /> Share secure link
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
