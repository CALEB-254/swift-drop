import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, AlertTriangle, CheckCircle, Search, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface Collection {
  id: string;
  tracking_number: string;
  rider_id: string | null;
  payment_type: string;
  goods_amount: number;
  delivery_fee: number;
  total_amount: number;
  method: string;
  status: string;
  mpesa_receipt: string | null;
  phone: string | null;
  dispute_reason: string | null;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-success/10 text-success border-success/20',
  pending: 'bg-warning/10 text-warning border-warning/20',
  failed: 'bg-destructive/10 text-destructive border-destructive/20',
  disputed: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function AdminCashCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [riders, setRiders] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [disputeTarget, setDisputeTarget] = useState<Collection | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [{ data: cols, error }, { data: riderRows }] = await Promise.all([
        supabase
          .from('cash_collections' as any)
          .select('*')
          .order('created_at', { ascending: false })
          .limit(300),
        supabase.from('riders').select('id, full_name'),
      ]);
      if (error) throw error;
      setCollections((cols as any as Collection[]) || []);
      const map: Record<string, string> = {};
      (riderRows || []).forEach((r: any) => (map[r.id] = r.full_name));
      setRiders(map);
    } catch (err) {
      logger.error('Error loading cash collections:', err);
      toast.error('Could not load cash collections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return collections;
    return collections.filter(
      (c) =>
        c.tracking_number?.toLowerCase().includes(q) ||
        (c.rider_id && riders[c.rider_id]?.toLowerCase().includes(q)) ||
        c.status.toLowerCase().includes(q)
    );
  }, [collections, query, riders]);

  const perRider = useMemo(() => {
    const acc: Record<string, { name: string; collected: number; goods: number; fees: number; count: number; disputes: number }> = {};
    collections.forEach((c) => {
      const key = c.rider_id || 'unassigned';
      acc[key] = acc[key] || {
        name: c.rider_id ? riders[c.rider_id] || 'Unknown rider' : 'Unassigned',
        collected: 0,
        goods: 0,
        fees: 0,
        count: 0,
        disputes: 0,
      };
      if (c.status === 'paid') {
        acc[key].collected += Number(c.total_amount);
        acc[key].goods += Number(c.goods_amount);
        acc[key].fees += Number(c.delivery_fee);
        acc[key].count += 1;
      }
      if (c.status === 'disputed') acc[key].disputes += 1;
    });
    return Object.entries(acc).sort((a, b) => b[1].collected - a[1].collected);
  }, [collections, riders]);

  const totals = useMemo(
    () =>
      collections.reduce(
        (t, c) => {
          if (c.status === 'paid') {
            t.total += Number(c.total_amount);
            t.goods += Number(c.goods_amount);
            t.fees += Number(c.delivery_fee);
          }
          if (c.status === 'pending') t.pending += Number(c.total_amount);
          if (c.status === 'disputed') t.disputes += 1;
          return t;
        },
        { total: 0, goods: 0, fees: 0, pending: 0, disputes: 0 }
      ),
    [collections]
  );

  const submitDispute = async () => {
    if (!disputeTarget || !disputeReason.trim()) {
      toast.error('Add a reason for the dispute');
      return;
    }
    try {
      setBusy(true);
      const { error } = await supabase.rpc('flag_cash_dispute' as any, {
        _collection_id: disputeTarget.id,
        _reason: disputeReason.trim(),
      });
      if (error) throw error;
      toast.success('Dispute flagged');
      setDisputeTarget(null);
      setDisputeReason('');
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not flag the dispute');
    } finally {
      setBusy(false);
    }
  };

  const resolveDispute = async (c: Collection) => {
    try {
      setBusy(true);
      const { error } = await supabase.rpc('resolve_cash_dispute' as any, {
        _collection_id: c.id,
        _notes: 'Resolved by admin',
      });
      if (error) throw error;
      toast.success('Dispute resolved');
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not resolve the dispute');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="Collected (paid)" value={`KES ${totals.total.toLocaleString()}`} />
        <SummaryCard label="To sender wallets" value={`KES ${totals.goods.toLocaleString()}`} />
        <SummaryCard label="Delivery fees (app)" value={`KES ${totals.fees.toLocaleString()}`} />
        <SummaryCard label="Open disputes" value={String(totals.disputes)} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="w-4 h-4" /> Collections per rider
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {perRider.length ? (
            perRider.map(([id, r]) => (
              <div key={id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.count} collection(s) • goods KES {r.goods.toLocaleString()} • fees KES {r.fees.toLocaleString()}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display font-bold">KES {r.collected.toLocaleString()}</p>
                  {r.disputes > 0 && (
                    <p className="text-xs text-destructive">{r.disputes} disputed</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No cash collections recorded yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All collections</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by tracking number, rider or status"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filtered.length ? (
            filtered.map((c) => (
              <div key={c.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.tracking_number}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.rider_id ? riders[c.rider_id] || 'Unknown rider' : 'Unassigned'} •{' '}
                      {format(new Date(c.created_at), 'dd MMM yyyy, hh:mm a')}
                    </p>
                  </div>
                  <Badge variant="outline" className={STATUS_STYLES[c.status] || ''}>
                    {c.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <Field label="Goods" value={`KES ${Number(c.goods_amount).toLocaleString()}`} />
                  <Field label="Delivery fee" value={`KES ${Number(c.delivery_fee).toLocaleString()}`} />
                  <Field label="Total" value={`KES ${Number(c.total_amount).toLocaleString()}`} />
                </div>
                {c.mpesa_receipt && (
                  <p className="text-xs text-muted-foreground">Receipt: {c.mpesa_receipt}</p>
                )}
                {c.dispute_reason && (
                  <p className="text-xs text-destructive flex items-start gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {c.dispute_reason}
                  </p>
                )}
                <div className="flex gap-2">
                  {c.status === 'disputed' ? (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => resolveDispute(c)}>
                      <CheckCircle className="w-4 h-4 mr-1" /> Resolve dispute
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDisputeTarget(c);
                        setDisputeReason('');
                      }}
                    >
                      <AlertTriangle className="w-4 h-4 mr-1" /> Flag dispute
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No collections match your search.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!disputeTarget} onOpenChange={(o) => !o && setDisputeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag a dispute</DialogTitle>
            <DialogDescription>
              Raise a review on {disputeTarget?.tracking_number} (KES{' '}
              {Number(disputeTarget?.total_amount || 0).toLocaleString()}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="disputeReason">Reason</Label>
            <Textarea
              id="disputeReason"
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="e.g. Rider reported a shortfall on the amount collected"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDisputeTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={submitDispute} disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Flag dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="font-display text-lg font-bold truncate">{value}</p>
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-muted-foreground truncate">{label}</p>
      <p className="font-medium truncate">{value}</p>
    </div>
  );
}
