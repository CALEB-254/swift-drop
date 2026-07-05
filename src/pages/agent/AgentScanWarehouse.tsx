import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { QRScanner } from '@/components/QRScanner';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AgentScanWarehouse() {
  const navigate = useNavigate();
  const [scannerOpen, setScannerOpen] = useState(true);

  const handleScan = async (trackingNumber: string) => {
    setScannerOpen(false);
    const { data: pkg } = await supabase
      .from('packages')
      .select('id, status')
      .eq('tracking_number', trackingNumber)
      .maybeSingle();
    if (!pkg) { toast.error('Package not found'); return; }
    if (pkg.status !== 'in_transit') {
      toast.error('Action not allowed', { description: `Package status must be In Transit (currently ${pkg.status}).` });
      return;
    }
    const { error } = await supabase
      .from('packages')
      .update({ status: 'received_in_warehouse' as any })
      .eq('id', pkg.id);
    if (error) { toast.error('Failed to update'); return; }
    toast.success('Received in warehouse', { description: trackingNumber });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-4 pt-4 pb-3 border-b border-border flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-lg font-bold">Receive Sack at Warehouse</h1>
      </div>
      <div className="px-4 pt-8 text-center">
        <p className="text-muted-foreground mb-4">Scan each package out of the sack to mark it as received in the warehouse.</p>
        <Button onClick={() => setScannerOpen(true)} className="w-full h-12">Open Scanner</Button>
      </div>
      <QRScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleScan} />
      <BottomNav />
    </div>
  );
}