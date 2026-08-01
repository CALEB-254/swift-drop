import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeliveryTypeCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  selected?: boolean;
  onClick?: () => void;
}

export function DeliveryTypeCard({ icon: Icon, title, description, selected, onClick }: DeliveryTypeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!selected}
      className={cn(
        'w-full flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all',
        selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
      )}
    >
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground')}>
        {Icon && <Icon className="h-5 w-5" />}
      </div>
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}
