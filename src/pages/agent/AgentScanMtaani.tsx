import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Package, Truck } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { QRScanner } from '@/components/QRScanner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function AgentScanMtaani() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanSource, setScanSource] = useState<'vendor' | 'rider' | null>(null);

  const openScanner = (source: 'vendor' | 'rider') => {
    setScanSource(source);
    setScannerOpen(true);
  };

  const handleScan = async (trackingNumber: string) => {
    setScannerOpen(false);
    if (!user) return;

    try {
      // Get agent record
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!agent) {
        toast.error('Agent not found');
        return;
      }

      // Find the package
      const { data: pkg } = await supabase
        .from('packages')
        .select('id, status, pickup_agent_id, delivery_type')
        .eq('tracking_number', trackingNumber)
        .maybeSingle();

      if (!pkg) {
        toast.error('Package not found');
        return;
      }

      if (pkg.delivery_type !== 'pickup_point' && pkg.delivery_type !== 'xpress') {
        toast.error('Action not allowed', { description: 'This package is not a Mtaani package.' });
        return;
      }

      if (pkg.pickup_agent_id !== agent.id) {
        toast.error('Action not allowed', { description: 'This package is not assigned to your pickup point.' });
        return;
      }

      if (pkg.status !== 'pending') {
        toast.error('Action not allowed', { description: `Package already "${pkg.status.replace(/_/g, ' ')}".` });
        return;
      }

      const { error } = await supabase
        .from('packages')
        .update({ status: 'dropped_at_agent' as any })
        .eq('id', pkg.id);

      if (error) throw error;

      const sourceLabel = scanSource === 'vendor' ? 'vendor' : 'rider';
      toast.success('Package received!', { description: `${trackingNumber} picked from ${sourceLabel} and marked as dropped.` });
    } catch {
      toast.error('Failed to update package status');
    }
  };

  const options = [
    { icon: Package, label: 'Pick From Vendor', source: 'vendor' as const },
    { icon: Truck, label: 'Pick From Rider', source: 'rider' as const },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-4 pt-4 pb-3 border-b border-border flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-lg font-bold">Scan Mtaani Packages</h1>
      </div>

      <div className="px-4 pt-6 space-y-3">
        {options.map((item) => (
          <Card
            key={item.source}
            className="border border-border shadow-sm cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => openScanner(item.source)}
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

      <QRScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleScan} />
      <BottomNav />
    </div>
  );
}
