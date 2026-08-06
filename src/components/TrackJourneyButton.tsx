import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Route, Share2, Copy, Check } from 'lucide-react';
import { PackageJourney } from './PackageJourney';
import { StatusBadge } from './StatusBadge';
import { PackageStatus } from '@/types/delivery';
import { toast } from 'sonner';

interface Props {
  trackingNumber: string;
  status?: PackageStatus;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  label?: string;
  className?: string;
}

export const publicTrackingUrl = (trackingNumber: string) =>
  `${window.location.origin}/t/${encodeURIComponent(trackingNumber)}`;

/** "Track order" button — opens the package journey and offers a public share link. */
export function TrackJourneyButton({
  trackingNumber, status, variant = 'outline', size = 'sm', label = 'Track order', className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const link = publicTrackingUrl(trackingNumber);

  const share = async () => {
    const text = `Track package ${trackingNumber}: ${link}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Package ${trackingNumber}`, text, url: link });
        return;
      } catch {
        /* user dismissed — fall through to copy */
      }
    }
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Tracking link copied');
    setTimeout(() => setCopied(false), 2000);
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

          <div className="pt-3 border-t border-border">
            <Button variant="secondary" className="w-full gap-2" onClick={share}>
              {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              Share tracking link
            </Button>
            <p className="text-[11px] text-muted-foreground mt-2 text-center break-all">{link}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
