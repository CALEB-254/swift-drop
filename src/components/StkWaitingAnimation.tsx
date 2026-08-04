import { Smartphone, Loader2 } from 'lucide-react';

interface Props {
  amount?: number;
  phone?: string;
  title?: string;
}

/** Animated waiting state shown while an M-Pesa STK prompt is pending confirmation. */
export function StkWaitingAnimation({ amount, phone, title = 'Waiting for M-Pesa confirmation' }: Props) {
  return (
    <div className="flex flex-col items-center text-center py-6">
      <div className="relative flex items-center justify-center mb-5">
        <span className="absolute h-24 w-24 rounded-full bg-primary/20 animate-ping" />
        <span className="absolute h-16 w-16 rounded-full bg-primary/30 animate-pulse" />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Smartphone className="h-7 w-7 animate-bounce" />
        </span>
      </div>
      <p className="font-medium">{title}</p>
      {typeof amount === 'number' && (
        <p className="mt-1 text-sm text-muted-foreground">
          KES {amount}{phone ? ` • ${phone}` : ''}
        </p>
      )}
      <p className="mt-2 text-sm text-muted-foreground">
        Check the phone and enter the M-Pesa PIN to approve.
      </p>
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Listening for confirmation…
      </div>
    </div>
  );
}
