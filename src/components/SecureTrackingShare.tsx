import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Share2, Check, Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const sharedTrackingUrl = (token: string) =>
  `${window.location.origin}/s/${encodeURIComponent(token)}`;

export function SecureTrackingShare({ packageId, trackingNumber }: { packageId: string; trackingNumber: string }) {
  const [copied, setCopied] = useState(false);
  const [pin, setPin] = useState('');
  const [expiry, setExpiry] = useState('never');
  const [creating, setCreating] = useState(false);
  const [secureLink, setSecureLink] = useState<string | null>(null);

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
    try { await navigator.clipboard.writeText(url); } catch { toast.error('Could not copy link. Please try again.'); return; }
    setCopied(true);
    toast.success('Tracking link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const createSecureLink = async () => {
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
    const token = (data as { token?: unknown } | null)?.token;
    if (typeof token !== 'string' || !token) { toast.error('Could not create link'); return; }
    setSecureLink(sharedTrackingUrl(token));
    toast.success('Secure tracking link created');
  };

  return (
          {(
            <div className="pt-3 border-t border-border space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium">Secured share link</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Optionally protect the link with a PIN and make it expire.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">PIN (optional)</Label>
                  <Input
                    aria-label="PIN (optional)"
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
                    <SelectTrigger aria-label="Expires"><SelectValue /></SelectTrigger>
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
                Create secured link
              </Button>
              {secureLink && (
                <div className="space-y-2">
                  <p className="text-[11px] text-muted-foreground text-center break-all">{secureLink}</p>
                  <Button variant="secondary" className="w-full gap-2" onClick={() => shareUrl(secureLink)}>
                    {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />} Share secured link
                  </Button>
                </div>
              )}
            </div>
          )}
  );
}
