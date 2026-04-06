import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BottomNav } from '@/components/BottomNav';
import { HelpButton } from '@/components/HelpButton';
import { Wallet, ArrowDownToLine, Loader2, Package, AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function Pochi() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<{ id: string; balance: number } | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [activeTab, setActiveTab] = useState('received');

  useEffect(() => {
    if (user) fetchWalletData();
  }, [user]);

  const fetchWalletData = async () => {
    setLoading(true);
    const { data: w } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user!.id)
      .maybeSingle();

    if (w) {
      setWallet({ id: w.id, balance: Number(w.balance) });

      const [txRes, wdRes] = await Promise.all([
        supabase
          .from('wallet_transactions')
          .select('*')
          .eq('wallet_id', w.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('withdrawal_requests')
          .select('*')
          .eq('wallet_id', w.id)
          .order('created_at', { ascending: false }),
      ]);
      setTransactions(txRes.data || []);
      setWithdrawals(wdRes.data || []);
    }
    setLoading(false);
  };

  const handleWithdraw = async () => {
    if (!wallet) return;
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (amount > wallet.balance) {
      toast.error('Insufficient balance');
      return;
    }
    if (!withdrawPhone || withdrawPhone.length < 10) {
      toast.error('Enter a valid M-Pesa phone number');
      return;
    }

    setWithdrawing(true);
    const { error } = await supabase.from('withdrawal_requests').insert({
      wallet_id: wallet.id,
      amount,
      phone: withdrawPhone,
    });

    if (error) {
      toast.error('Failed to submit withdrawal request');
    } else {
      toast.success('Withdrawal request submitted! Processing via M-Pesa.');
      setWithdrawOpen(false);
      setWithdrawAmount('');
      setWithdrawPhone('');
      fetchWalletData();
    }
    setWithdrawing(false);
  };

  const receivedTx = transactions.filter(t => t.type === 'deposit' && t.status === 'completed');
  const pendingWd = withdrawals.filter(w => w.status === 'pending' || w.status === 'processing');
  const failedWd = withdrawals.filter(w => w.status === 'failed');

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-3 text-center">
        <h1 className="font-display text-lg font-semibold">Withdrawals</h1>
      </div>
      <div className="h-1 bg-warning" />

      <div className="p-4 space-y-4">
        {/* Balance Card */}
        <Card className="border-0 shadow-card">
          <CardContent className="p-6 text-center">
            <Wallet className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
            <p className="text-3xl font-bold">{(wallet?.balance || 0).toFixed(2)} KES</p>
            <p className="text-sm text-muted-foreground">Balance</p>
          </CardContent>
        </Card>

        {/* Withdraw Button */}
        <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-warning text-warning-foreground hover:bg-warning/90 rounded-full text-lg py-6">
              Withdraw
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Withdraw to M-Pesa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Amount (KES)</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Available: KES {(wallet?.balance || 0).toFixed(2)}</p>
              </div>
              <div className="space-y-2">
                <Label>M-Pesa Phone Number</Label>
                <Input
                  type="tel"
                  placeholder="e.g. 0712345678"
                  value={withdrawPhone}
                  onChange={(e) => setWithdrawPhone(e.target.value)}
                />
              </div>
              <Button onClick={handleWithdraw} disabled={withdrawing} className="w-full">
                {withdrawing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Confirm Withdrawal
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Transactions Section */}
        <div>
          <h2 className="font-display font-bold text-lg border-l-4 border-primary pl-3 mb-3">Transactions</h2>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full bg-transparent border-b border-border rounded-none gap-0 h-auto p-0">
              <TabsTrigger value="received" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-muted px-2 py-2 text-xs">
                Received
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-muted px-2 py-2 text-xs">
                Pending
              </TabsTrigger>
              <TabsTrigger value="unsuccessful" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-muted px-2 py-2 text-xs">
                Unsuccessful
              </TabsTrigger>
              <TabsTrigger value="all" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-muted px-2 py-2 text-xs">
                Transactions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="received" className="mt-4">
              {receivedTx.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="space-y-2">
                  {receivedTx.map(tx => (
                    <TransactionItem key={tx.id} tx={tx} type="deposit" />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="pending" className="mt-4">
              {pendingWd.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="space-y-2">
                  {pendingWd.map(wd => (
                    <WithdrawalItem key={wd.id} wd={wd} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="unsuccessful" className="mt-4">
              {failedWd.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="space-y-2">
                  {failedWd.map(wd => (
                    <WithdrawalItem key={wd.id} wd={wd} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="all" className="mt-4">
              {transactions.length === 0 && withdrawals.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="space-y-2">
                  {[...transactions.map(t => ({ ...t, _type: 'tx' })), ...withdrawals.map(w => ({ ...w, _type: 'wd' }))]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map(item =>
                      item._type === 'tx' ? (
                        <TransactionItem key={item.id} tx={item} type={item.type} />
                      ) : (
                        <WithdrawalItem key={item.id} wd={item} />
                      )
                    )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <HelpButton />
      <BottomNav />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Package className="w-16 h-16 mb-3 opacity-40" />
      <p>List empty</p>
    </div>
  );
}

function TransactionItem({ tx, type }: { tx: any; type: string }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${type === 'deposit' ? 'bg-primary/10' : 'bg-destructive/10'}`}>
            {type === 'deposit' ? (
              <ArrowDownToLine className="w-4 h-4 text-primary" />
            ) : (
              <ArrowDownToLine className="w-4 h-4 text-destructive rotate-180" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium">{tx.description || (type === 'deposit' ? 'COD Payment' : 'Withdrawal')}</p>
            <p className="text-[10px] text-muted-foreground">{format(new Date(tx.created_at), 'MMM dd, yyyy HH:mm')}</p>
          </div>
        </div>
        <p className={`font-bold text-sm ${type === 'deposit' ? 'text-primary' : 'text-destructive'}`}>
          {type === 'deposit' ? '+' : '-'}KES {Number(tx.amount).toFixed(2)}
        </p>
      </CardContent>
    </Card>
  );
}

function WithdrawalItem({ wd }: { wd: any }) {
  const statusIcon = {
    pending: <Clock className="w-4 h-4 text-warning" />,
    processing: <Loader2 className="w-4 h-4 text-info animate-spin" />,
    completed: <CheckCircle2 className="w-4 h-4 text-primary" />,
    failed: <XCircle className="w-4 h-4 text-destructive" />,
  }[wd.status as string] || <AlertCircle className="w-4 h-4" />;

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center">
            {statusIcon}
          </div>
          <div>
            <p className="text-sm font-medium">Withdrawal to {wd.phone}</p>
            <p className="text-[10px] text-muted-foreground">{format(new Date(wd.created_at), 'MMM dd, yyyy HH:mm')} • {wd.status}</p>
          </div>
        </div>
        <p className="font-bold text-sm text-destructive">-KES {Number(wd.amount).toFixed(2)}</p>
      </CardContent>
    </Card>
  );
}
