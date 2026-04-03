import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { QRScanner } from '@/components/QRScanner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function AgentScanDoorstep() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scannerOpen, setScannerOpen] = useState(true);

  const handleScan = async (trackingNumber: string) => {
    setScannerOpen(false);
    if (!user) return;

    try {
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!agent) { toast.error('Agent not found'); return; }

      const { data: pkg } = await supabase
        .from('packages')
        .select('id, status, pickup_agent_id, delivery_type')
        .eq('tracking_number', trackingNumber)
        .maybeSingle();

      if (!pkg) { toast.error('Package not found'); return; }

      if (pkg.delivery_type !== 'doorstep') {
        toast.error('Action not allowed', { description: 'This is not a doorstep package.' });
        return;
      }

      if (pkg.pickup_agent_id !== agent.id) {
        toast.error('Action not allowed', { description: 'This package is not assigned to your point.' });
        return;
      }

      if (pkg.status !== 'pending' && pkg.status !== 'dropped_at_agent') {
        toast.error('Action not allowed', { description: `Package already "${pkg.status.replace(/_/g, ' ')}".` });
        return;
      }

      const { error } = await supabase
        .from('packages')
        .update({ status: 'picked_up' as any })
        .eq('id', pkg.id);

      if (error) throw error;
      toast.success('Doorstep package picked up!', { description: trackingNumber });
    } catch {
      toast.error('Failed to update package status');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-4 pt-4 pb-3 border-b border-border flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-lg font-bold">Scan Doorstep Packages</h1>
      </div>

      <div className="px-4 pt-8 text-center">
        <p className="text-muted-foreground mb-4">Scan a doorstep package QR code to mark it as picked up.</p>
        <Button onClick={() => setScannerOpen(true)} className="w-full h-12">
          Open Scanner
        </Button>
      </div>

      <QRScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleScan} />
      <BottomNav />
    </div>
  );
}
