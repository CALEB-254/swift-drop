import { Package } from '@/types/delivery';
import { StatusBadge } from './StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Package as PackageIcon, MapPin, User, Phone, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface PackageCardProps {
  pkg: Package;
  onClick?: () => void;
  showActions?: boolean;
  children?: React.ReactNode;
}

export function PackageCard({ pkg, onClick, children }: PackageCardProps) {
  return (
    <Card 
      className="shadow-card hover:shadow-lg transition-all duration-300 cursor-pointer border-0 overflow-hidden group"
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="gradient-primary p-4 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-foreground/10 rounded-lg backdrop-blur-sm">
                <PackageIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-display font-semibold">{pkg.trackingNumber}</p>
                <p className="text-xs opacity-80">{pkg.packageDescription}</p>
              </div>
            </div>
            <StatusBadge status={pkg.status} className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground" />
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">From</p>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{pkg.senderName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{pkg.senderPhone}</span>
              </div>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">To</p>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium">{pkg.receiverName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{pkg.receiverPhone}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="truncate">
              {pkg.deliveryType === 'pickup_point' ? pkg.pickupPoint : pkg.receiverAddress}
            </span>
          </div>
          
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>{format(pkg.createdAt, 'MMM d, yyyy • h:mm a')}</span>
            </div>
            <div className="font-display font-bold text-lg text-primary">
              KES {pkg.cost.toLocaleString()}
            </div>
          </div>
          
          {children && (
            <div className="pt-3 border-t border-border" onClick={(e) => e.stopPropagation()}>
              {children}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
