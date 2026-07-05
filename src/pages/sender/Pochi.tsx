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
import { Wallet, ArrowDownToLine, Loader2, Package, AlertCircle, CheckCircle2, Clock, XCircle, Shield, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MIN_WITHDRAW = 10;

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What is your mother's maiden name?",
  "What city were you born in?",
  "What was the name of your primary school?",
  "What is the name of your favourite teacher?",
  "What was your childhood nickname?",
  "What is your favourite food?",
  "What is the make of your first car?",
];

export default function Pochi() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<{ id: string; balance: number; hasPin: boolean } | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [activeTab, setActiveTab] = useState('received');
  // Withdraw flow
  const [step, setStep] = useState<'amount' | 'pin' | 'code'>('amount');
  const [pinEntry, setPinEntry] = useState('');
  const [codeEntry, setCodeEntry] = useState('');
  // Setup flow
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupPin, setSetupPin] = useState('');
  const [setupPin2, setSetupPin2] = useState('');
  const [setupQ, setSetupQ] = useState('');
  const [setupA, setSetupA] = useState('');
  const [savingSetup, setSavingSetup] = useState(false);

  useEffect(() => {
    if (user) fetchWalletData();
  }, [user]);

  const fetchWalletData = async () => {
    setLoading(true);
    const { data: w } = await supabase
      .from('wallets')
      .select('id, balance, pin_hash' as any)
      .eq('user_id', user!.id)
      .maybeSingle();

    if (w) {
      setWallet({ id: (w as any).id, balance: Number((w as any).balance), hasPin: !!(w as any).pin_hash });

      const [txRes, wdRes] = await Promise.all([
        supabase
          .from('wallet_transactions')
          .select('*')
          .eq('wallet_id', (w as any).id)
          .order('created_at', { ascending: false }),
        supabase
          .from('withdrawal_requests')
          .select('*')
          .eq('wallet_id', (w as any).id)
          .order('created_at', { ascending: false }),
      ]);
      setTransactions(txRes.data || []);
      setWithdrawals(wdRes.data || []);
    } else {
      setWallet({ id: '', balance: 0, hasPin: false });
    }
    setLoading(false);
  };

  const saveSetup = async () => {
    if (setupPin.length !== 4 || !/^\d{4}$/.test(setupPin)) { toast.error('PIN must be 4 digits'); return; }
    if (setupPin !== setupPin2) { toast.error('PINs do not match'); return; }
    if (!setupQ.trim() || !setupA.trim()) { toast.error('Security question and answer required'); return; }
    setSavingSetup(true);
    const { error } = await supabase.rpc('setup_pochi_security' as any, {
      _pin: setupPin, _question: setupQ.trim(), _answer: setupA.trim(),
    });
    setSavingSetup(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Pochi security set up');
    setSetupOpen(false);
    setSetupPin(''); setSetupPin2(''); setSetupQ(''); setSetupA('');
    fetchWalletData();
  };

  const openWithdraw = () => {
    if (!wallet?.hasPin) { setSetupOpen(true); return; }
    setStep('amount');
    setPinEntry(''); setCodeEntry('');
    setWithdrawOpen(true);
  };

  const proceedToPin = () => {
    if (!wallet) return;
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < MIN_WITHDRAW) { toast.error(`Minimum withdrawal is KES ${MIN_WITHDRAW}`); return; }
    if (amount > wallet.balance) { toast.error('Insufficient balance'); return; }
    if (!withdrawPhone || withdrawPhone.length < 10) { toast.error('Enter a valid M-Pesa phone number'); return; }
    setStep('pin');
  };

  const verifyPinAndSendCode = async () => {
    if (pinEntry.length !== 4) { toast.error('Enter your 4-digit PIN'); return; }
    setWithdrawing(true);
    const { data: ok, error: pErr } = await supabase.rpc('verify_pochi_pin' as any, { _pin: pinEntry });
    if (pErr || !ok) { setWithdrawing(false); toast.error('Incorrect PIN'); return; }
    const { error: fErr } = await supabase.functions.invoke('send-pochi-code', {
      body: { amount: parseFloat(withdrawAmount), phone: withdrawPhone },
    });
    setWithdrawing(false);
    if (fErr) { toast.error('Could not send code', { description: fErr.message }); return; }
    toast.success('Verification code sent to your registered email');
    setStep('code');
  };

  const confirmWithdraw = async () => {
    if (!wallet) return;
    if (codeEntry.length < 4) { toast.error('Enter the code you received'); return; }
    setWithdrawing(true);
    const { data: ok, error: cErr } = await supabase.rpc('consume_pochi_withdrawal_code' as any, { _code: codeEntry });
    if (cErr || !ok) { setWithdrawing(false); toast.error('Invalid or expired code'); return; }

    const amount = parseFloat(withdrawAmount);
    const { error } = await supabase.from('withdrawal_requests').insert({
      wallet_id: wallet.id, amount, phone: withdrawPhone,
    });
    setWithdrawing(false);
    if (error) { toast.error('Failed to submit withdrawal request'); return; }
    toast.success('Withdrawal authorized! Processing via M-Pesa.');
    setWithdrawOpen(false);
    setWithdrawAmount(''); setWithdrawPhone(''); setPinEntry(''); setCodeEntry('');
    fetchWalletData();
  };

  const receivedTx = transactions.filter(t => t.type === 'deposit' && t.status === 'completed');
  const pendingWd = withdrawals.filter(w => w.status === 'pending' || w.status === 'processing');
  const failedWd = withdrawals.filter(w => w.status === 'failed');
  const balance = wallet?.balance || 0;
  const canWithdraw = balance >= MIN_WITHDRAW;

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
        {!wallet?.hasPin ? (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="p-6 space-y-3 text-center">
              <Shield className="w-10 h-10 mx-auto text-warning" />
              <p className="font-medium">Set up your Pochi wallet</p>
              <p className="text-xs text-muted-foreground">
                To keep your money safe, create a 4-digit PIN and choose a security question.
                Your balance, transactions and withdrawals will appear here once setup is complete.
              </p>
              <Button className="w-full" onClick={() => setSetupOpen(true)}>Set up Pochi</Button>
            </CardContent>
          </Card>
        ) : (
        <>
        {/* Balance Card */}
        <Card className="border-0 shadow-card">
          <CardContent className="p-6 text-center">
            <Wallet className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
            <p className="text-3xl font-bold">{balance.toFixed(2)} KES</p>
            <p className="text-sm text-muted-foreground">Balance</p>
          </CardContent>
        </Card>

        {/* Withdraw Button */}
        <Button
          onClick={openWithdraw}
          disabled={!canWithdraw || !wallet?.hasPin}
          className="w-full bg-warning text-warning-foreground hover:bg-warning/90 rounded-full text-lg py-6 disabled:opacity-50"
        >
          Withdraw
        </Button>
        {!canWithdraw && (
          <p className="text-center text-xs text-muted-foreground">
            Minimum withdrawal is KES {MIN_WITHDRAW}. Top up your wallet to withdraw.
          </p>
        )}

        {/* Withdraw multi-step dialog */}
        <Dialog open={withdrawOpen} onOpenChange={(o) => { setWithdrawOpen(o); if (!o) setStep('amount'); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {step === 'amount' && 'Withdraw to M-Pesa'}
                {step === 'pin' && 'Enter your Pochi PIN'}
                {step === 'code' && 'Enter email verification code'}
              </DialogTitle>
            </DialogHeader>

            {step === 'amount' && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Amount (KES)</Label>
                  <Input type="number" placeholder="Enter amount" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Available: KES {balance.toFixed(2)} • Min: KES {MIN_WITHDRAW}</p>
                </div>
                <div className="space-y-2">
                  <Label>M-Pesa Phone Number</Label>
                  <Input type="tel" placeholder="e.g. 0712345678" value={withdrawPhone} onChange={(e) => setWithdrawPhone(e.target.value)} />
                </div>
                <Button onClick={proceedToPin} className="w-full">Continue</Button>
              </div>
            )}

            {step === 'pin' && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>4-digit PIN</Label>
                  <Input type="password" inputMode="numeric" maxLength={4} value={pinEntry} onChange={e => setPinEntry(e.target.value.replace(/\D/g,''))} />
                </div>
                <Button onClick={verifyPinAndSendCode} disabled={withdrawing} className="w-full">
                  {withdrawing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                  Verify & Send Code
                </Button>
              </div>
            )}

            {step === 'code' && (
              <div className="space-y-4 pt-2">
                <p className="text-xs text-muted-foreground">
                  We sent a 6-digit verification code to your registered email. Enter it below to authorize the withdrawal.
                </p>
                <div className="space-y-2">
                  <Label>Verification code</Label>
                  <Input inputMode="numeric" maxLength={6} value={codeEntry} onChange={e => setCodeEntry(e.target.value.replace(/\D/g,''))} />
                </div>
                <Button onClick={confirmWithdraw} disabled={withdrawing} className="w-full">
                  {withdrawing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Authorize Withdrawal
                </Button>
              </div>
            )}
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
        </>
        )}

        {/* Setup dialog (always mounted so it can open from the setup prompt) */}
        <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Set up Pochi security</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label>4-digit PIN</Label>
                <Input type="password" inputMode="numeric" maxLength={4} value={setupPin} onChange={e => setSetupPin(e.target.value.replace(/\D/g,''))} />
              </div>
              <div className="space-y-1">
                <Label>Confirm PIN</Label>
                <Input type="password" inputMode="numeric" maxLength={4} value={setupPin2} onChange={e => setSetupPin2(e.target.value.replace(/\D/g,''))} />
              </div>
              <div className="space-y-1">
                <Label>Security question</Label>
                <Select value={setupQ} onValueChange={setSetupQ}>
                  <SelectTrigger><SelectValue placeholder="Choose a question" /></SelectTrigger>
                  <SelectContent>
                    {SECURITY_QUESTIONS.map(q => (
                      <SelectItem key={q} value={q}>{q}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Answer</Label>
                <Input value={setupA} onChange={e => setSetupA(e.target.value)} />
              </div>
              <Button onClick={saveSetup} disabled={savingSetup} className="w-full">
                {savingSetup ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
