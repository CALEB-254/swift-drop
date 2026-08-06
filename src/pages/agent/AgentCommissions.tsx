import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BottomNav } from '@/components/BottomNav';
import { ArrowLeft, Loader2, Wallet, TrendingUp, Package as PackageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { logger } from '@/lib/logger';

interface CommissionRow {
  id: string;
  tracking_number: string;
  commission: number | null;
  cost: number;
  status: string;
  delivery_type: string;
  updated_at: string;
}

const money = (n: number) => `KES ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

/** Agent earnings: wallet balance, breakdown by delivery type and credit history. */
export default function AgentCommissions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState<CommissionRow[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const [{ data: agentRows }, { data: wallet }] = await Promise.all([
          supabase.from('agents').select('id').eq('user_id', user.id),
          supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle(),
        ]);
        setBalance(Number(wallet?.balance ?? 0));

        const agentIds = (agentRows || []).map(a => a.id);
        const { data: pkgs } = await supabase
          .from('packages')
          .select('id, tracking_number, commission, cost, status, delivery_type, updated_at')
          .or(
            [
              `agent_id.eq.${user.id}`,
              ...(agentIds.length ? [`pickup_agent_id.in.(${agentIds.join(',')})`] : []),
            ].join(',')
          )
          .order('updated_at', { ascending: false });
        setRows((pkgs as CommissionRow[]) || []);
      } catch (e) {
        logger.error('Failed to load commissions', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const earned = useMemo(
    () => rows.filter(r => r.status === 'delivered').reduce((s, r) => s + Number(r.commission || 0), 0),
    [rows]
  );
  const pending = useMemo(
    () => rows.filter(r => !['delivered', 'cancelled', 'refunded'].includes(r.status))
      .reduce((s, r) => s + Number(r.commission || 0), 0),
    [rows]
  );
  const byType = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    rows.filter(r => r.status === 'delivered').forEach(r => {
      const key = r.delivery_type;
      map[key] = map[key] || { count: 0, total: 0 };
      map[key].count += 1;
      map[key].total += Number(r.commission || 0);
    });
    return Object.entries(map);
  }, [rows]);

  const history = rows.filter(r => r.status === 'delivered').slice(0, 30);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="gradient-primary text-primary-foreground p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Go back" onClick={() => navigate('/agent')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-lg font-bold">My Commissions</h1>
      </header>

      <main className="px-4 py-5 space-y-5">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
        ) : (
          <>
            <Card className="border-0 shadow-card">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Wallet className="w-4 h-4 text-primary" /> Wallet balance
                </div>
                <p className="font-display text-3xl font-bold mt-1">{money(balance)}</p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Card className="border-0 shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" /> Earned
                  </div>
                  <p className="font-display font-bold text-lg mt-1">{money(earned)}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <PackageIcon className="w-3.5 h-3.5 text-warning" /> Pending
                  </div>
                  <p className="font-display font-bold text-lg mt-1">{money(pending)}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-card">
              <CardHeader className="pb-2"><CardTitle className="text-base">Earnings breakdown</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {byType.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No delivered packages yet.</p>
                ) : byType.map(([type, v]) => (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{type.replace('_', ' ')} · {v.count}</span>
                    <span className="font-semibold">{money(v.total)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card">
              <CardHeader className="pb-2"><CardTitle className="text-base">Commission credits</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No commission credits yet.</p>
                ) : history.map(r => (
                  <div key={r.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                    <div>
                      <p className="font-mono text-xs text-primary">{r.tracking_number}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {format(new Date(r.updated_at), 'MMM d, yyyy • h:mm a')}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-primary">
                      +{money(Number(r.commission || 0))}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
