import { forwardRef } from 'react';
import { PackageStatus, STATUS_LABELS, STATUS_COLORS } from '@/types/delivery';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: PackageStatus;
  className?: string;
}

export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  function StatusBadge({ status, className }, ref) {
    const colorMap: Record<string, string> = {
      warning: 'bg-warning/10 text-warning border-warning/20',
      info: 'bg-info/10 text-info border-info/20',
      primary: 'bg-primary/10 text-primary border-primary/20',
      success: 'bg-success/10 text-success border-success/20',
      destructive: 'bg-destructive/10 text-destructive border-destructive/20',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border',
          colorMap[STATUS_COLORS[status]],
          className
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current mr-2 animate-pulse-soft" />
        {STATUS_LABELS[status]}
      </span>
    );
  }
);
