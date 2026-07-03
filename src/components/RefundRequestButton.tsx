import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RotateCcw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  packageId: string;
  trackingNumber: string;
  amount: number;
  userId: string;
}

export function RefundRequestButton({ packageId, trackingNumber, amount, userId }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [amt, setAmt] = useState(String(amount));
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!reason.trim()) { toast.error('Reason is required'); return; }
    setSubmitting(true);
    const { error } = await supabase.from('refund_requests').insert({
      user_id: userId,
      package_id: packageId,
      tracking_number: trackingNumber,
      amount: Number(amt) || amount,
      reason: reason.trim(),
    });
    setSubmitting(false);
    if (error) { toast.error('Refund request failed', { description: error.message }); return; }
    toast.success('Refund request submitted');
    setOpen(false);
    setReason('');
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1 text-xs"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
      >
        <RotateCcw className="w-3.5 h-3.5" /> Refund
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader><DialogTitle>Request Refund</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Tracking: {trackingNumber}</p>
            <div className="space-y-1">
              <Label>Amount (KES)</Label>
              <Input type="number" value={amt} onChange={e => setAmt(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Reason</Label>
              <Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Why are you requesting a refund?" />
            </div>
            <Button className="w-full" disabled={submitting} onClick={submit}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Submit Request
            </Button>
            <p className="text-[10px] text-muted-foreground">Approved refunds are credited to your Pochi wallet.</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}