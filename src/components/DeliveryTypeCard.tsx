import { cn } from '@/lib/utils';

interface DeliveryTypeCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected?: boolean;
  onClick?: () => void;
}

export function DeliveryTypeCard({
  icon,
  title,
  description,
  selected = false,
  onClick,
}: DeliveryTypeCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-4 p-4 rounded-lg border bg-card text-left transition-all',
        selected 
          ? 'border-primary ring-2 ring-primary/20' 
          : 'border-border hover:border-primary/50'
      )}
    >
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
      </div>
      <div 
        className={cn(
          'w-5 h-5 rounded-full border-2 flex-shrink-0',
          selected 
            ? 'border-primary bg-primary' 
            : 'border-muted-foreground/40'
        )}
      >
        {selected && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-primary-foreground" />
          </div>
        )}
      </div>
    </button>
  );
}
