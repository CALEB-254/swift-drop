import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, Package, Loader2 } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { QRScanner } from '@/components/QRScanner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function AgentScanSack() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [sackPackages, setSackPackages] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

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
        .select('id, tracking_number, status, pickup_agent_id')
        .eq('tracking_number', trackingNumber)
        .maybeSingle();

      if (!pkg) { toast.error('Package not found'); return; }

      if (pkg.pickup_agent_id !== agent.id) {
        toast.error('Action not allowed', { description: 'This package is not assigned to your point.' });
        return;
      }

      if (pkg.status !== 'dropped_at_agent') {
        toast.error('Action not allowed', { description: 'Package must be dropped at agent first.' });
        return;
      }

      if (sackPackages.includes(trackingNumber)) {
        toast.info('Already added to sack');
        return;
      }

      setSackPackages(prev => [...prev, trackingNumber]);
      toast.success(`Added ${trackingNumber} to sack`);
    } catch {
      toast.error('Failed to process package');
    }
  };

  const createSack = async () => {
    if (sackPackages.length === 0) {
      toast.error('Add packages to sack first');
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase
        .from('packages')
        .update({ status: 'in_transit' as any })
        .in('tracking_number', sackPackages);

      if (error) throw error;
      toast.success(`Sack created with ${sackPackages.length} packages`, { description: 'Packages marked as in transit to warehouse.' });
      setSackPackages([]);
    } catch {
      toast.error('Failed to create sack');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-4 pt-4 pb-3 border-b border-border flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-lg font-bold">Create Sack for Warehouse</h1>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <Button onClick={() => setScannerOpen(true)} className="w-full h-12">
          Scan Package to Add
        </Button>

        {sackPackages.length > 0 && (
          <Card className="border border-border">
            <CardContent className="p-4">
              <p className="font-semibold mb-3">Sack ({sackPackages.length} packages)</p>
              <div className="space-y-2">
                {sackPackages.map((tn) => (
                  <div key={tn} className="flex items-center gap-2 p-2 bg-secondary rounded-lg">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-mono">{tn}</span>
                  </div>
                ))}
              </div>
              <Button
                className="w-full mt-4 h-12"
                onClick={createSack}
                disabled={creating}
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Sack & Send to Warehouse
              </Button>
            </CardContent>
          </Card>
        )}

        {sackPackages.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Scan packages to add them to the sack</p>
          </div>
        )}
      </div>

      <QRScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleScan} />
      <BottomNav />
    </div>
  );
}
