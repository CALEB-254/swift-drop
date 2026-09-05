import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Package,
  Truck,
  CheckCircle,
  User,
  Loader2,
  Phone,
  MapPin,
  Wallet,
  Clock,
  XCircle,
  ScrollText,
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { StkWaitingAnimation } from '@/components/StkWaitingAnimation';
import { useAuth } from '@/hooks/useAuth';
import {
  useRiderPackages,
  REJECTION_REASONS,
  RiderPackage,
  PackageLog,
} from '@/hooks/useRiderPackages';
import { format } from 'date-fns';
import { toast } from 'sonner';

const PAYMENT_LABELS: Record<string, string> = {
  prepaid: 'Prepaid',
  pay_on_delivery: 'Pay on Delivery',
  collect_my_cash: 'Collect My Cash',
};

export default function RiderDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const {
    rider,
    assigned,
    collected,
    inTransit,
    awaitingPayment,
    delivered,
    stats,
    loading,
    collectPackage,
    collectPackages,
    rejectPackage,
    updateStatus,
    collectPayment,
    checkCollectionStatus,
    giveOutPackage,
    fetchLogs,
    setOnline,
  } = useRiderPackages();

  const [activeTab, setActiveTab] = useState('assigned');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const [rejectTarget, setRejectTarget] = useState<RiderPackage | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');

  const [detail, setDetail] = useState<RiderPackage | null>(null);
  const [logs, setLogs] = useState<PackageLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [payTarget, setPayTarget] = useState<RiderPackage | null>(null);
  const [payPhone, setPayPhone] = useState('');
  const [payWaiting, setPayWaiting] = useState(false);

  const [releaseTarget, setReleaseTarget] = useState<RiderPackage | null>(null);
  const [releaseCode, setReleaseCode] = useState('');

  useEffect(() => {
    if (!detail) return;
    setLogsLoading(true);
    fetchLogs(detail.id)
      .then(setLogs)
      .finally(() => setLogsLoading(false));
  }, [detail, fetchLogs]);

  if (!authLoading && !user) return <Navigate to="/auth/login" replace />;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const toggleSelect = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleCollect = async (pkg: RiderPackage) => {
    try {
      setBusyId(pkg.id);
      await collectPackage(pkg);
      toast.success('Package collected');
      setSelected((prev) => prev.filter((id) => id !== pkg.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to collect package');
    } finally {
      setBusyId(null);
    }
  };

  const handleBulkCollect = async () => {
    const pkgs = assigned.filter((p) => selected.includes(p.id));
    if (!pkgs.length) return;
    try {
      setBusyId('bulk');
      await collectPackages(pkgs);
      toast.success(`${pkgs.length} package(s) collected`);
      setSelected([]);
      setActiveTab('active');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk collection failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason) return;
    if (rejectReason === 'Other' && !rejectNotes.trim()) {
      toast.error('Please add a comment explaining the reason');
      return;
    }
    try {
      setBusyId(rejectTarget.id);
      await rejectPackage(rejectTarget, rejectReason, rejectNotes.trim() || undefined);
      toast.success('Package rejected');
      setRejectTarget(null);
      setRejectReason('');
      setRejectNotes('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject package');
    } finally {
      setBusyId(null);
    }
  };

  const handleStatus = async (pkg: RiderPackage, status: any) => {
    try {
      setBusyId(pkg.id);
      await updateStatus(pkg, status);
      toast.success('Status updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setBusyId(null);
    }
  };

  const handleSendPrompt = async () => {
    if (!payTarget) return;
    try {
      setPayWaiting(true);
      await collectPayment(payTarget, payPhone.trim() || undefined);
      toast.success('Payment prompt sent to the recipient');
      const poll = setInterval(async () => {
        try {
          const status = await checkCollectionStatus(payTarget.id);
          if (status === 'paid') {
            clearInterval(poll);
            setPayWaiting(false);
            setPayTarget(null);
            toast.success('Payment confirmed');
          } else if (status === 'failed') {
            clearInterval(poll);
            setPayWaiting(false);
            toast.error('Payment failed. Try again.');
          }
        } catch {
          /* keep polling */
        }
      }, 5000);
      setTimeout(() => clearInterval(poll), 120000);
    } catch (err) {
      setPayWaiting(false);
      toast.error(err instanceof Error ? err.message : 'Failed to send payment prompt');
    }
  };

  const handleGiveOut = async () => {
    if (!releaseTarget || releaseCode.trim().length < 4) {
      toast.error('Enter the release code');
      return;
    }
    try {
      setBusyId(releaseTarget.id);
      await giveOutPackage(releaseTarget, releaseCode);
      toast.success('Package delivered');
      setReleaseTarget(null);
      setReleaseCode('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to release package');
    } finally {
      setBusyId(null);
    }
  };

  const paymentPending = (pkg: RiderPackage) =>
    pkg.paymentMethod !== 'prepaid' && pkg.paymentStatus !== 'paid' && pkg.amountDue > 0;

  const PackageRow = ({
    pkg,
    selectable = false,
    children,
  }: {
    pkg: RiderPackage;
    selectable?: boolean;
    children?: React.ReactNode;
  }) => (
    <Card className="border-0 shadow-card overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          {selectable && (
            <Checkbox
              className="mt-1 shrink-0"
              checked={selected.includes(pkg.id)}
              onCheckedChange={() => toggleSelect(pkg.id)}
              aria-label={`Select ${pkg.trackingNumber}`}
            />
          )}
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() => setDetail(pkg)}
          >
            <p className="font-display font-semibold truncate">{pkg.trackingNumber}</p>
            <p className="text-xs text-muted-foreground truncate">
              {pkg.packageDescription || 'Package'} • {pkg.deliveryType.replace(/_/g, ' ')}
            </p>
          </button>
          <StatusBadge status={pkg.status} className="shrink-0" />
        </div>

        <div className="grid gap-1.5 text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{pkg.senderName}</span>
            <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-auto" />
            <span className="truncate text-muted-foreground">{pkg.senderPhone}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{pkg.receiverName}</span>
            <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-auto" />
            <span className="truncate text-muted-foreground">{pkg.receiverPhone}</span>
          </div>
          <div className="flex items-start gap-2 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <span className="text-muted-foreground break-words">{pkg.receiverAddress}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Badge variant="secondary">{PAYMENT_LABELS[pkg.paymentMethod]}</Badge>
          <span className="text-sm font-semibold">KES {pkg.cost.toLocaleString()}</span>
        </div>

        {children}
      </CardContent>
    </Card>
  );

  const activeList = [...collected, ...inTransit];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-hero text-primary-foreground">
        <div className="container py-6 px-4">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0 overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Rider profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="font-display font-bold text-lg truncate">
                  {rider?.full_name || profile?.full_name || 'Rider'}
                </h1>
                <p className="text-xs opacity-80 truncate">
                  Rider ID: {rider?.id ? rider.id.slice(0, 8).toUpperCase() : '—'}
                </p>
              </div>
            </div>
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
                Switch App
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <Switch
              id="online"
              checked={!!rider?.is_online}
              disabled={!rider}
              onCheckedChange={async (v) => {
                try {
                  await setOnline(v);
                } catch {
                  toast.error('Could not update availability');
                }
              }}
            />
            <Label htmlFor="online" className="text-sm">
              {rider?.is_online ? '🟢 Online' : '🔴 Offline'}
            </Label>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Assigned', value: stats.assigned },
              { label: 'Collected', value: stats.collected },
              { label: 'In Transit', value: stats.inTransit },
              { label: 'Awaiting Pay', value: stats.awaitingPayment },
              { label: 'Delivered Today', value: stats.deliveredToday },
              { label: "Today's Earnings", value: `KES ${stats.todaysEarnings.toLocaleString()}` },
            ].map((s) => (
              <Card key={s.label} className="bg-primary-foreground/10 border-0 backdrop-blur-sm">
                <CardContent className="p-3">
                  <p className="text-lg font-display font-bold text-primary-foreground truncate">{s.value}</p>
                  <p className="text-[11px] text-primary-foreground/70 truncate">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {!rider && (
        <div className="container px-4 pt-4">
          <Card className="border-dashed">
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              No rider profile is linked to this account yet. Ask an admin to add you as a rider.
            </CardContent>
          </Card>
        </div>
      )}

      <div className="container py-6 px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="assigned">Assigned</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="payment">Payment</TabsTrigger>
            <TabsTrigger value="done">Done</TabsTrigger>
          </TabsList>

          {/* Assigned */}
          <TabsContent value="assigned" className="space-y-4">
            {assigned.length > 0 && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selected.length === assigned.length && assigned.length > 0}
                    onCheckedChange={(v) => setSelected(v ? assigned.map((p) => p.id) : [])}
                    aria-label="Select all packages"
                  />
                  Select all ({selected.length}/{assigned.length})
                </label>
                <Button size="sm" disabled={!selected.length || busyId === 'bulk'} onClick={handleBulkCollect}>
                  {busyId === 'bulk' && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Collect Selected
                </Button>
              </div>
            )}

            {assigned.length ? (
              assigned.map((pkg) => (
                <PackageRow key={pkg.id} pkg={pkg} selectable>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="hero"
                      onClick={() => handleCollect(pkg)}
                      disabled={busyId === pkg.id}
                    >
                      {busyId === pkg.id && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Collect
                    </Button>
                    <Button variant="outline" onClick={() => setRejectTarget(pkg)}>
                      Reject
                    </Button>
                  </div>
                </PackageRow>
              ))
            ) : (
              <EmptyState icon={<Package className="w-12 h-12 text-muted-foreground mb-4" />} text="No assigned packages" />
            )}
          </TabsContent>

          {/* Active */}
          <TabsContent value="active" className="space-y-4">
            {activeList.length ? (
              activeList.map((pkg) => (
                <PackageRow key={pkg.id} pkg={pkg}>
                  <div className="space-y-2">
                    {pkg.status === 'picked_up' && (
                      <Button className="w-full" variant="hero" disabled={busyId === pkg.id} onClick={() => handleStatus(pkg, 'in_transit')}>
                        Mark In Transit
                      </Button>
                    )}
                    {pkg.status === 'in_transit' && paymentPending(pkg) && (
                      <Button className="w-full" variant="hero" disabled={busyId === pkg.id} onClick={() => handleStatus(pkg, 'awaiting_payment')}>
                        Start Payment Collection
                      </Button>
                    )}
                    {pkg.status === 'in_transit' && !paymentPending(pkg) && (
                      <Button className="w-full" variant="hero" onClick={() => setReleaseTarget(pkg)}>
                        Give Out Package
                      </Button>
                    )}
                    {pkg.status === 'out_for_delivery' && (
                      <Button className="w-full" variant="hero" onClick={() => (paymentPending(pkg) ? handleStatus(pkg, 'awaiting_payment') : setReleaseTarget(pkg))}>
                        {paymentPending(pkg) ? 'Start Payment Collection' : 'Give Out Package'}
                      </Button>
                    )}
                  </div>
                </PackageRow>
              ))
            ) : (
              <EmptyState icon={<Truck className="w-12 h-12 text-muted-foreground mb-4" />} text="No packages in progress" />
            )}
          </TabsContent>

          {/* Awaiting payment */}
          <TabsContent value="payment" className="space-y-4">
            {awaitingPayment.length ? (
              awaitingPayment.map((pkg) => {
                const goods = pkg.codCollected ? 0 : pkg.codAmount;
                const fee = pkg.feeOnDelivery && !pkg.feeCollected ? pkg.cost : 0;
                const total = goods + fee;
                const paid = pkg.paymentStatus === 'paid' || total === 0;
                return (
                  <PackageRow key={pkg.id} pkg={pkg}>
                    <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
                      {goods > 0 && (
                        <Row label="Goods Amount" value={`KES ${goods.toLocaleString()}`} />
                      )}
                      {fee > 0 && <Row label="Collect My Cash (delivery fee)" value={`KES ${fee.toLocaleString()}`} />}
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">Total to Collect</span>
                        <span className="font-display font-bold text-success">KES {total.toLocaleString()}</span>
                      </div>
                      {paid ? (
                        <Button className="w-full" variant="hero" onClick={() => setReleaseTarget(pkg)}>
                          Give Out Package
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          variant="hero"
                          onClick={() => {
                            setPayTarget(pkg);
                            setPayPhone(pkg.receiverPhone);
                          }}
                        >
                          <Wallet className="w-4 h-4 mr-2" /> Collect Payment
                        </Button>
                      )}
                      {!paid && (
                        <p className="text-xs text-muted-foreground text-center">
                          Package can only be handed over after payment is confirmed.
                        </p>
                      )}
                    </div>
                  </PackageRow>
                );
              })
            ) : (
              <EmptyState icon={<Wallet className="w-12 h-12 text-muted-foreground mb-4" />} text="No payments pending" />
            )}
          </TabsContent>

          {/* Delivered */}
          <TabsContent value="done" className="space-y-4">
            {delivered.length ? (
              delivered.map((pkg) => (
                <PackageRow key={pkg.id} pkg={pkg}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Commission earned</span>
                    <span className="font-display font-bold text-success">
                      KES {(pkg.commission || 0).toLocaleString()}
                    </span>
                  </div>
                </PackageRow>
              ))
            ) : (
              <EmptyState icon={<CheckCircle className="w-12 h-12 text-muted-foreground mb-4" />} text="No completed deliveries yet" />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reject Package</DialogTitle>
            <DialogDescription>Select a reason for rejecting {rejectTarget?.trackingNumber}.</DialogDescription>
          </DialogHeader>
          <RadioGroup value={rejectReason} onValueChange={setRejectReason} className="space-y-2">
            {REJECTION_REASONS.map((r) => (
              <div key={r} className="flex items-center gap-2">
                <RadioGroupItem value={r} id={`reason-${r}`} />
                <Label htmlFor={`reason-${r}`} className="font-normal">{r}</Label>
              </div>
            ))}
          </RadioGroup>
          {rejectReason === 'Other' && (
            <Textarea
              placeholder="Explain the reason"
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
            />
          )}
          {rejectReason && rejectReason !== 'Other' && (
            <Textarea
              placeholder="Additional comments (optional)"
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
            />
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={!rejectReason || busyId === rejectTarget?.id} onClick={handleReject}>
              {busyId === rejectTarget?.id && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Collect payment dialog */}
      <Dialog
        open={!!payTarget}
        onOpenChange={(o) => {
          if (!o) {
            setPayTarget(null);
            setPayWaiting(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Collect Payment</DialogTitle>
            <DialogDescription>An M-Pesa prompt is sent to the recipient's phone.</DialogDescription>
          </DialogHeader>
          {payWaiting ? (
            <StkWaitingAnimation amount={payTarget?.amountDue} phone={payPhone} />
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-border p-3 space-y-1.5">
                {payTarget && payTarget.codAmount > 0 && !payTarget.codCollected && (
                  <Row label="Goods" value={`KES ${payTarget.codAmount.toLocaleString()}`} />
                )}
                {payTarget?.feeOnDelivery && !payTarget.feeCollected && (
                  <Row label="Delivery fee" value={`KES ${payTarget.cost.toLocaleString()}`} />
                )}
                <Separator />
                <div className="flex items-center justify-between font-semibold">
                  <span>Total</span>
                  <span>KES {(payTarget?.amountDue || 0).toLocaleString()}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payPhone">Recipient M-Pesa number</Label>
                <Input id="payPhone" value={payPhone} onChange={(e) => setPayPhone(e.target.value)} placeholder="07XXXXXXXX" />
              </div>
              <Button className="w-full" variant="hero" onClick={handleSendPrompt}>
                Send M-Pesa Prompt
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Give out dialog */}
      <Dialog open={!!releaseTarget} onOpenChange={(o) => !o && setReleaseTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Give Out Package</DialogTitle>
            <DialogDescription>Ask the recipient for the release code sent to them.</DialogDescription>
          </DialogHeader>
          <Input
            value={releaseCode}
            onChange={(e) => setReleaseCode(e.target.value)}
            placeholder="6-digit release code"
            inputMode="numeric"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReleaseTarget(null)}>Cancel</Button>
            <Button variant="hero" onClick={handleGiveOut} disabled={busyId === releaseTarget?.id}>
              {busyId === releaseTarget?.id && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Confirm Handover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Package details */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{detail?.trackingNumber}</SheetTitle>
          </SheetHeader>
          {detail && (
            <div className="mt-4 space-y-5 text-sm">
              <Section title="Sender">
                <Row label="Name" value={detail.senderName} />
                <Row label="Phone" value={detail.senderPhone} />
                <Row label="Pickup address" value={detail.senderAddress || detail.pickupPoint || '—'} />
              </Section>
              <Section title="Recipient">
                <Row label="Name" value={detail.receiverName} />
                <Row label="Phone" value={detail.receiverPhone} />
                <Row label="Delivery address" value={detail.receiverAddress} />
              </Section>
              <Section title="Package">
                <Row label="Type" value={detail.deliveryType.replace(/_/g, ' ')} />
                <Row label="Weight" value={detail.weight ? `${detail.weight} kg` : '—'} />
                <Row label="Description" value={detail.packageDescription || '—'} />
                <Row label="Declared value" value={detail.packageValue ? `KES ${detail.packageValue.toLocaleString()}` : '—'} />
              </Section>
              <Section title="Delivery">
                <Row label="Status" value={detail.status.replace(/_/g, ' ')} />
                <Row label="Delivery fee" value={`KES ${detail.cost.toLocaleString()}`} />
                <Row label="Payment method" value={PAYMENT_LABELS[detail.paymentMethod]} />
                <Row label="Payment status" value={detail.paymentStatus} />
              </Section>
              <Section title="Package Logs">
                {logsLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : logs.length ? (
                  <ol className="space-y-3 border-l border-dashed border-border pl-4">
                    {logs.map((l) => (
                      <li key={l.id} className="relative">
                        <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-primary" />
                        <p className="font-medium">{l.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(l.createdAt, 'dd MMM yyyy, hh:mm a')}
                          {l.actorName ? ` • ${l.actorName}` : ''}
                        </p>
                        {(l.statusBefore || l.statusAfter) && (
                          <p className="text-xs text-muted-foreground">
                            {(l.statusBefore || '—').replace(/_/g, ' ')} → {(l.statusAfter || '—').replace(/_/g, ' ')}
                          </p>
                        )}
                        {l.locationText && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {l.locationText}
                          </p>
                        )}
                        {l.notes && <p className="text-xs">{l.notes}</p>}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <ScrollText className="w-4 h-4" /> No log entries yet.
                  </p>
                )}
              </Section>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right break-words">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="font-display font-semibold text-sm">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12">
        {icon}
        <p className="text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}
