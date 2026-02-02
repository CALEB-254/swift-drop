import { forwardRef } from 'react';
import { PackageStatus, STATUS_LABELS } from '@/types/delivery';
import { Check, Package, Truck, MapPin, Home, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrackingTimelineProps {
  currentStatus: PackageStatus;
}

const TIMELINE_STEPS: { status: PackageStatus; icon: React.ElementType }[] = [
  { status: 'pending', icon: Package },
  { status: 'picked_up', icon: Package },
  { status: 'in_transit', icon: Truck },
  { status: 'out_for_delivery', icon: MapPin },
  { status: 'delivered', icon: Home },
];

export const TrackingTimeline = forwardRef<HTMLDivElement, TrackingTimelineProps>(
  function TrackingTimeline({ currentStatus }, ref) {
    if (currentStatus === 'cancelled') {
      return (
        <div ref={ref} className="flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <X className="w-8 h-8 text-destructive" />
            </div>
            <p className="font-display font-semibold text-destructive">Delivery Cancelled</p>
          </div>
        </div>
      );
    }

    const currentIndex = TIMELINE_STEPS.findIndex(step => step.status === currentStatus);

    return (
      <div ref={ref} className="py-4">
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute top-6 left-0 right-0 h-1 bg-muted rounded-full">
            <div 
              className="h-full gradient-primary rounded-full transition-all duration-500"
              style={{ width: `${(currentIndex / (TIMELINE_STEPS.length - 1)) * 100}%` }}
            />
          </div>

          {/* Steps */}
          <div className="relative flex justify-between">
            {TIMELINE_STEPS.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index <= currentIndex;
              const isCurrent = index === currentIndex;

              return (
                <div key={step.status} className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 relative z-10',
                      isCompleted
                        ? 'gradient-primary text-primary-foreground shadow-lg'
                        : 'bg-muted text-muted-foreground',
                      isCurrent && 'ring-4 ring-primary/20 scale-110'
                    )}
                  >
                    {isCompleted && index < currentIndex ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <p
                    className={cn(
                      'mt-3 text-xs font-medium text-center max-w-20',
                      isCompleted ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {STATUS_LABELS[step.status]}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
);
