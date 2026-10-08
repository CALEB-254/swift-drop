import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Route } from 'lucide-react';
import { PackageJourney } from './PackageJourney';
import { StatusBadge } from './StatusBadge';
import { SecureTrackingShare } from './SecureTrackingShare';
import { PackageStatus } from '@/types/delivery';

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

export function TrackJourneyButton({
  trackingNumber, packageId, status, variant = 'outline', size = 'sm', label = 'Track order', className,
}: Props) {
  const [open, setOpen] = useState(false);
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

          <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
            <p className="min-w-0 break-all font-mono text-sm text-primary">{trackingNumber}</p>
            {status && <StatusBadge status={status} />}
          </div>

          <PackageJourney trackingNumber={trackingNumber} />

          {packageId && <SecureTrackingShare packageId={packageId} trackingNumber={trackingNumber} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
