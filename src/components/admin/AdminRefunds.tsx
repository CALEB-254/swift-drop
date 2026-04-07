import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RotateCcw, Loader2, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { AdminData } from '@/pages/admin/AdminDashboard';

interface Props { data: AdminData; onRefresh: () => void; }

interface Refund {
  id: string;
  user_id: string;
  package_id: string | null;
  tracking_number: string | null;
  amount: number;
  reason: string;
  status: string;
  admin_notes: string | null;
  reviewed_by: string | null;
  created_at: string;
}

export function AdminRefunds({ data, onRefresh }: Props) {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Refund | null>(null);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => { fetchRefunds(); }, []);

  const fetchRefunds = async () => {
    setLoading(true);
    const { data } = await supabase.from('refund_requests').select('*').order('created_at', { ascending: false });
    setRefunds((data as Refund[]) || []);
    setLoading(false);
  };

  const handleAction = async (refund: Refund, action: 'approved' | 'rejected') => {
    setProcessing(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('refund_requests').update({
      status: action,
      admin_notes: notes || null,
      reviewed_by: user?.id,
    }).eq('id', refund.id);

    if (error) toast.error(error.message);
    else {
      // Log the action
      if (user) {
        await supabase.from('audit_logs').insert({
          admin_id: user.id,
          admin_email: user.email,
          action: `refund_${action}`,
          target_table: 'refund_requests',
          target_id: refund.id,
          new_values: { status: action, notes },
        });
      }
      toast.success(`Refund ${action}`);
    }

    setProcessing(false);
    setSelected(null);
    setNotes('');
    fetchRefunds();
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-warning" />;
      case 'approved': return <CheckCircle2 className="w-4 h-4 text-primary" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const filtered = filter === 'all' ? refunds : refunds.filter(r => r.status === filter);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold">Refund & Dispute Center</h2>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-28 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Pending', count: refunds.filter(r => r.status === 'pending').length, color: 'text-warning' },
          { label: 'Approved', count: refunds.filter(r => r.status === 'approved').length, color: 'text-primary' },
          { label: 'Rejected', count: refunds.filter(r => r.status === 'rejected').length, color: 'text-destructive' },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-card">
            <CardContent className="p-3 text-center">
              <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="border-0 shadow-card">
          <CardContent className="p-6 text-center text-muted-foreground">
            <RotateCcw className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No refund requests</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(refund => (
            <Card key={refund.id} className="border-0 shadow-card cursor-pointer" onClick={() => { setSelected(refund); setNotes(refund.admin_notes || ''); }}>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {statusIcon(refund.status)}
                  <div>
                    <p className="text-sm font-medium">KES {Number(refund.amount).toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">{refund.tracking_number || 'No tracking'} • {refund.reason.slice(0, 40)}</p>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">{format(new Date(refund.created_at), 'MMM dd')}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Refund Request</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 pt-2">
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Amount:</span> KES {Number(selected.amount).toLocaleString()}</p>
                <p><span className="text-muted-foreground">Tracking:</span> {selected.tracking_number || 'N/A'}</p>
                <p><span className="text-muted-foreground">Reason:</span> {selected.reason}</p>
                <p><span className="text-muted-foreground">Status:</span> {selected.status}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Notes</label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes..." rows={3} />
              </div>
              {selected.status === 'pending' && (
                <div className="flex gap-2">
                  <Button onClick={() => handleAction(selected, 'approved')} disabled={processing} className="flex-1">
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                  </Button>
                  <Button variant="destructive" onClick={() => handleAction(selected, 'rejected')} disabled={processing} className="flex-1">
                    <XCircle className="w-4 h-4 mr-1" /> Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
