import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Package, Bike, ShoppingBag, Warehouse } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';

const scanOptions = [
  { icon: Package, label: 'Mtaani', path: '/agent/scan/mtaani' },
  { icon: Bike, label: 'Doorstep', path: '/agent/scan/doorstep' },
  { icon: ShoppingBag, label: 'Errand', path: '/agent/scan/errand' },
  { icon: Warehouse, label: 'Create Sack for Warehouse Delivery', path: '/agent/scan/sack' },
];

export default function AgentScan() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-4 pt-4 pb-3 border-b border-border flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-lg font-bold">Scan</h1>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {scanOptions.map((item) => (
          <Card
            key={item.path}
            className="border border-border shadow-sm cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate(item.path)}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                <item.icon className="w-5 h-5 text-foreground" />
              </div>
              <span className="flex-1 font-medium">{item.label}</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
