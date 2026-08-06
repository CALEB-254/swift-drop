import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { logger } from '@/lib/logger';
import type { AdminData } from '@/pages/admin/AdminDashboard';

interface PaymentLog {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  mpesa_receipt_number: string | null;
  checkout_request_id: string | null;
  tracking_numbers: string[];
  created_at: string;
}

type Severity = 'ok' | 'warn' | 'error';

interface Mismatch {
  key: string;
  severity: Severity;
  label: string;
  detail: string;
  when: string;
}

/**
 * Reconciles M-PESA callbacks (payment_logs) against packages using
 * checkout_request_id, flagging anything that does not line up.
 */
export function AdminReconciliation({ data }: Props) {
  const [logs, setLogs] = useState<PaymentLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from('payment_logs')
      .select('id, amount, status, payment_method, mpesa_receipt_number, checkout_request_id, tracking_numbers, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) logger.error('Failed to load payment logs', error);
    setLogs((rows as PaymentLog[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const packages = data.packages;

  const mismatches = useMemo<Mismatch[]>(() => {
    const byCheckout = new Map<string, typeof packages>();
    packages.forEach(p => {
      if (!p.checkout_request_id) return;
      const list = byCheckout.get(p.checkout_request_id) || [];
      list.push(p);
      byCheckout.set(p.checkout_request_id, list);
    });

    const found: Mismatch[] = [];

    // 1. Successful payment logs with no matching package callback
    logs.filter(l => l.status === 'success').forEach(l => {
      const matched = l.checkout_request_id ? byCheckout.get(l.checkout_request_id) : undefined;
      if (!matched || matched.length === 0) {
        found.push({
          key: `orphan-${l.id}`,
          severity: 'error',
          label: 'Payment with no matching package',
          detail: `KES ${Number(l.amount).toLocaleString()} · ${l.tracking_numbers?.join(', ') || 'no tracking'} · ref ${l.mpesa_receipt_number || l.checkout_request_id || 'n/a'}`,
          when: l.created_at,
        });
        return;
      }
      const total = matched.reduce((s, p) => s + Number(p.cost || 0), 0);
      if (Math.round(total) !== Math.round(Number(l.amount))) {
        found.push({
          key: `amount-${l.id}`,
          severity: 'error',
          label: 'Amount mismatch',
          detail: `Logged KES ${Number(l.amount).toLocaleString()} vs package total KES ${total.toLocaleString()} (${matched.map(p => p.tracking_number).join(', ')})`,
          when: l.created_at,
        });
      }
      const unpaid = matched.filter(p => p.payment_status !== 'paid');
      if (unpaid.length > 0) {
        found.push({
          key: `unpaid-${l.id}`,
          severity: 'error',
          label: 'Paid callback but package not marked paid',
          detail: unpaid.map(p => `${p.tracking_number} (${p.payment_status})`).join(', '),
          when: l.created_at,
        });
      }
    });

    // 2. Packages marked paid without any successful payment log
    const successCheckouts = new Set(
      logs.filter(l => l.status === 'success' && l.checkout_request_id).map(l => l.checkout_request_id as string)
    );
    const successReceipts = new Set(
      logs.filter(l => l.mpesa_receipt_number).map(l => l.mpesa_receipt_number as string)
    );
    packages
      .filter(p => p.payment_status === 'paid')
      .forEach(p => {
        const hasLog =
          (p.checkout_request_id && successCheckouts.has(p.checkout_request_id)) ||
          (p.mpesa_receipt_number && successReceipts.has(p.mpesa_receipt_number));
        if (!hasLog) {
          found.push({
            key: `nolog-${p.id}`,
            severity: 'warn',
            label: 'Package paid with no payment log',
            detail: `${p.tracking_number} · KES ${Number(p.cost || 0).toLocaleString()} · receipt ${p.mpesa_receipt_number || 'missing'}`,
            when: p.paid_at || p.updated_at || p.created_at,
          });
        }
        if (!p.mpesa_receipt_number) {
          found.push({
            key: `noreceipt-${p.id}`,
            severity: 'warn',
            label: 'Missing M-PESA receipt number',
            detail: `${p.tracking_number} · KES ${Number(p.cost || 0).toLocaleString()}`,
            when: p.paid_at || p.updated_at || p.created_at,
          });
        }
      });

    // 3. Stale pending callbacks (older than 15 minutes, never resolved)
    const cutoff = Date.now() - 15 * 60 * 1000;
    logs
      .filter(l => l.status === 'pending' && new Date(l.created_at).getTime() < cutoff)
      .forEach(l => {
        found.push({
          key: `stale-${l.id}`,
          severity: 'warn',
          label: 'Callback never confirmed',
          detail: `KES ${Number(l.amount).toLocaleString()} · ${l.tracking_numbers?.join(', ') || 'no tracking'} · awaiting callback`,
          when: l.created_at,
        });
      });

    return found.sort((a, b) => +new Date(b.when) - +new Date(a.when));
  }, [logs, packages]);

  const errors = mismatches.filter(m => m.severity === 'error').length;
  const warnings = mismatches.filter(m => m.severity === 'warn').length;
  const verified = logs.filter(l => l.status === 'success').length - errors;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <p className="text-sm font-medium">M-PESA Reconciliation</p>
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="gap-1.5">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-card">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-primary">{Math.max(verified, 0)}</p>
            <p className="text-[10px] text-muted-foreground">Verified</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-destructive">{errors}</p>
            <p className="text-[10px] text-muted-foreground">Mismatches</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-warning">{warnings}</p>
            <p className="text-[10px] text-muted-foreground">To review</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : mismatches.length === 0 ? (
        <Card className="border-0 shadow-card">
          <CardContent className="p-6 text-center">
            <ShieldCheck className="w-10 h-10 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium">All payments reconcile</p>
            <p className="text-xs text-muted-foreground mt-1">
              Every successful callback matches a package and amount.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {mismatches.map(m => (
            <Card key={m.key} className="border-0 shadow-card">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className={`w-4 h-4 mt-0.5 shrink-0 ${m.severity === 'error' ? 'text-destructive' : 'text-warning'}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{m.label}</p>
                      <Badge variant={m.severity === 'error' ? 'destructive' : 'secondary'} className="text-[10px]">
                        {m.severity === 'error' ? 'Mismatch' : 'Review'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 break-words">{m.detail}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {format(new Date(m.when), 'MMM d, yyyy • h:mm a')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

interface Props { data: AdminData; }
