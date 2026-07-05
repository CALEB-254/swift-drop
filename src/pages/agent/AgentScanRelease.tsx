import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { QRScanner } from '@/components/QRScanner';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AgentScanRelease() {
  const navigate = useNavigate();
  const [scannerOpen, setScannerOpen] = useState(true);
  const [pkgId, setPkgId] = useState<string | null>(null);
  const [tracking, setTracking] = useState<string>('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const handleScan = async (trackingNumber: string) => {
    setScannerOpen(false);
    const { data: pkg } = await supabase
      .from('packages')
      .select('id, status')
      .eq('tracking_number', trackingNumber)
      .maybeSingle();
    if (!pkg) { toast.error('Package not found'); return; }
    if (pkg.status === 'delivered') { toast.error('Already delivered'); return; }
    setPkgId(pkg.id);
    setTracking(trackingNumber);
    setCode('');
  };

  const release = async () => {
    if (!pkgId) return;
    if (!/^\d{6}$/.test(code)) { toast.error('Enter the 6-digit release code'); return; }
    setBusy(true);
    const { error } = await supabase.rpc('release_package' as any, {
      _package_id: pkgId, _release_code: code,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Package released to receiver');
    setPkgId(null); setTracking(''); setCode('');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-4 pt-4 pb-3 border-b border-border flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-lg font-bold">Release to Receiver</h1>
      </div>
      <div className="px-4 pt-8 text-center">
        <p className="text-muted-foreground mb-4">Scan the package, then enter the receiver's 6-digit release code to hand it over.</p>
        <Button onClick={() => setScannerOpen(true)} className="w-full h-12">Open Scanner</Button>
      </div>
      <QRScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleScan} />

      <Dialog open={!!pkgId} onOpenChange={(o) => { if (!o) { setPkgId(null); setCode(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Release {tracking}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <Label>Release code (from receiver)</Label>
            <Input inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g,''))} />
            <Button onClick={release} disabled={busy} className="w-full">
              {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm Release
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}