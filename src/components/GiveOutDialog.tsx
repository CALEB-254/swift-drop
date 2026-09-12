import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GiveOutTarget {
  id: string;
  trackingNumber: string;
  deliveryType: string;
}

interface Props {
  target: GiveOutTarget | null;
  onClose: () => void;
  onReleased: () => void;
}

/** Handover dialog: release with the 6-digit code, or (non-doorstep) without a code. */
export function GiveOutDialog({ target, onClose, onReleased }: Props) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const doorstep = target?.deliveryType === 'doorstep';

  useEffect(() => {
    if (target) {
      setCode('');
      setName('');
      setIdNumber('');
      setPhone('');
    }
  }, [target]);

  const releaseWithCode = async () => {
    if (!target) return;
    if (!/^\d{6}$/.test(code)) {
      toast.error('Enter the 6-digit release code');
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc('release_package' as any, {
      _package_id: target.id,
      _release_code: code,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Package released to receiver');
    onReleased();
    onClose();
  };

  const releaseWithoutCode = async () => {
    if (!target) return;
    if (!name.trim() || !idNumber.trim() || !phone.trim()) {
      toast.error('Enter the receiver name, ID number and phone');
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc('release_package_without_code' as any, {
      _package_id: target.id,
      _receiver_name: name.trim(),
      _receiver_id_number: idNumber.trim(),
      _receiver_phone: phone.trim(),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Package given out and receiver details recorded');
    onReleased();
    onClose();
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Give Out — {target?.trackingNumber}</DialogTitle>
          <DialogDescription>
            {doorstep
              ? 'Doorstep deliveries can only be handed over with the release code.'
              : 'Use the release code, or record the receiver details if they do not have it.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="code">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="code">With code</TabsTrigger>
            <TabsTrigger value="nocode" disabled={doorstep}>Without code</TabsTrigger>
          </TabsList>

          <TabsContent value="code" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="releaseCode">Release code</Label>
              <Input
                id="releaseCode"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
              <p className="text-xs text-muted-foreground">
                The code is also saved in the sender's package log if the SMS never arrived.
              </p>
            </div>
            <Button className="w-full" onClick={releaseWithCode} disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Confirm Handover
            </Button>
          </TabsContent>

          <TabsContent value="nocode" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="rcvName">Receiver name</Label>
              <Input id="rcvName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rcvId">ID number</Label>
              <Input id="rcvId" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="National ID" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rcvPhone">Phone number</Label>
              <Input id="rcvPhone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XXXXXXXX" inputMode="tel" />
            </div>
            <Button className="w-full" onClick={releaseWithoutCode} disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Give Out Without Code
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
