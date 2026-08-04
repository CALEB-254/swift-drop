import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/StatusBadge';
import { PackageQRCode } from '@/components/PackageQRCode';
import { PrintReceiptButton } from '@/components/PrintReceiptButton';
import { DownloadReceiptButton } from '@/components/DownloadReceiptButton';
import { ShareWhatsAppButton } from '@/components/ShareWhatsAppButton';
import { Search, Edit, QrCode, Save, RefreshCw, Truck, Plus, ArrowRightLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { STATUS_LABELS, type PackageStatus } from '@/types/delivery';
import { StkWaitingAnimation } from '@/components/StkWaitingAnimation';
import type { AdminData } from '@/pages/admin/AdminDashboard';

interface Props { data: AdminData; onRefresh: () => void; }

export function AdminOrders({ data, onRefresh }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedQR, setExpandedQR] = useState<string | null>(null);
  const [editPkg, setEditPkg] = useState<any>(null);
  const [editForm, setEditForm] = useState({ status: '', receiver_name: '', receiver_address: '', cost: '', assigned_rider_id: '' });
  const [riders, setRiders] = useState<any[]>([]);
  const [assignPkg, setAssignPkg] = useState<any>(null);
  const [selectedRider, setSelectedRider] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [convertPkg, setConvertPkg] = useState<any>(null);
  const [convertCost, setConvertCost] = useState('300');
  const [converting, setConverting] = useState(false);
  const [convertAddress, setConvertAddress] = useState('');
  const [convertPhone, setConvertPhone] = useState('');
  const [stkWaiting, setStkWaiting] = useState<{ amount: number; phone: string } | null>(null);
  const [newPkg, setNewPkg] = useState({
    user_id: '', sender_name: '', sender_phone: '',
    receiver_name: '', receiver_phone: '', receiver_address: '',
    delivery_type: 'doorstep', cost: '200', package_description: '',
  });

  const senderUsers = data.users.filter((u: any) => u.role === 'sender');

  useEffect(() => {
    supabase.from('riders').select('*').then(({ data }) => setRiders(data || []));
  }, []);

  const filtered = data.packages.filter(p => {
    const matchesSearch = !search ||
      p.tracking_number.toLowerCase().includes(search.toLowerCase()) ||
      p.sender_name.toLowerCase().includes(search.toLowerCase()) ||
      p.receiver_name.toLowerCase().includes(search.toLowerCase()) ||
      p.receiver_phone.includes(search) ||
      (p.mpesa_receipt_number && p.mpesa_receipt_number.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openEdit = (pkg: any) => {
    setEditPkg(pkg);
    setEditForm({
      status: pkg.status,
      receiver_name: pkg.receiver_name,
      receiver_address: pkg.receiver_address,
      cost: pkg.cost.toString(),
      assigned_rider_id: pkg.assigned_rider_id || '',
    });
  };

  const saveEdit = async () => {
    if (!editPkg) return;
    const updates: any = {
      status: editForm.status as any,
      receiver_name: editForm.receiver_name,
      receiver_address: editForm.receiver_address,
      cost: Number(editForm.cost),
    };
    if (editForm.assigned_rider_id) updates.assigned_rider_id = editForm.assigned_rider_id;
    
    const { error } = await supabase.from('packages').update(updates).eq('id', editPkg.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Package updated!');
    setEditPkg(null);
    onRefresh();
  };

  const assignRider = async () => {
    if (!assignPkg || !selectedRider) return;
    const { error } = await supabase.from('packages').update({ assigned_rider_id: selectedRider }).eq('id', assignPkg.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Rider assigned!');
    setAssignPkg(null);
    setSelectedRider('');
    onRefresh();
  };

  const getRiderName = (riderId: string) => riders.find(r => r.id === riderId)?.full_name || 'Unknown';

  const convertToDoorstep = async () => {
    if (!convertPkg) return;
    const newCost = Number(convertCost);
    if (!newCost || newCost <= 0) { toast.error('Enter a valid cost'); return; }
    if (!convertAddress.trim()) { toast.error('Enter the doorstep delivery location'); return; }
    let formattedPhone = convertPhone.replace(/\s/g, '').replace(/^\+/, '').replace(/^0/, '254');
    if (!formattedPhone.startsWith('254')) formattedPhone = '254' + formattedPhone;
    if (!/^254[17]\d{8}$/.test(formattedPhone)) { toast.error('Enter a valid M-Pesa phone number'); return; }
    setConverting(true);
    const { data, error } = await supabase.rpc('admin_convert_to_doorstep' as any, {
      _package_id: convertPkg.id,
      _new_cost: newCost,
    });
    if (error) { setConverting(false); toast.error(error.message); return; }
    const { error: addrErr } = await supabase
      .from('packages')
      .update({ receiver_address: convertAddress.trim() })
      .eq('id', convertPkg.id);
    if (addrErr) toast.error('Location not saved: ' + addrErr.message);
    const balance = Number((data as any)?.balance_due ?? 0);
    if (balance > 0) {
      setStkWaiting({ amount: balance, phone: formattedPhone });
      const { error: stkErr } = await supabase.functions.invoke('mpesa-payment', {
        body: {
          phoneNumber: formattedPhone,
          amount: balance,
          packageIds: [convertPkg.id],
          paymentMethod: 'stk_push',
        },
      });
      if (stkErr) {
        setStkWaiting(null);
        toast.error('Conversion applied, but STK push failed', { description: stkErr.message });
      } else {
        toast.success(`Converted to Doorstep. STK push of KES ${balance} sent to ${formattedPhone}.`);
      }
    } else {
      toast.success('Converted to Doorstep. No additional payment needed.');
    }
    setConverting(false);
    setConvertPkg(null);
    onRefresh();
  };

  const generateTracking = () => `SWF-ADM-${Math.floor(1000 + Math.random() * 9000)}`;

  const createPackage = async () => {
    if (!newPkg.user_id || !newPkg.sender_name || !newPkg.sender_phone || !newPkg.receiver_name || !newPkg.receiver_phone || !newPkg.receiver_address) {
      toast.error('Fill all required fields'); return;
    }
    setCreating(true);
    try {
      const cost = Number(newPkg.cost) || 0;
      const { error } = await supabase.from('packages').insert({
        tracking_number: generateTracking(),
        user_id: newPkg.user_id,
        sender_name: newPkg.sender_name,
        sender_phone: newPkg.sender_phone,
        receiver_name: newPkg.receiver_name,
        receiver_phone: newPkg.receiver_phone,
        receiver_address: newPkg.receiver_address,
        delivery_type: newPkg.delivery_type as any,
        cost,
        commission: cost * 0.1,
        package_description: newPkg.package_description || null,
      });
      if (error) { toast.error(error.message); return; }
      toast.success('Package created');
      setShowCreate(false);
      setNewPkg({ user_id: '', sender_name: '', sender_phone: '', receiver_name: '', receiver_phone: '', receiver_address: '', delivery_type: 'doorstep', cost: '200', package_description: '' });
      onRefresh();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-3 mt-4">
      <Button className="w-full gap-2" onClick={() => setShowCreate(true)}>
        <Plus className="w-4 h-4" /> Create Package
      </Button>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search orders, M-Pesa code..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{filtered.length} orders</p>
        <Button variant="ghost" size="sm" onClick={onRefresh}><RefreshCw className="h-3.5 w-3.5" /></Button>
      </div>

      {filtered.map(pkg => (
        <Card key={pkg.id} className="border-0 shadow-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-sm font-medium">{pkg.tracking_number}</p>
                <p className="text-sm text-muted-foreground">{pkg.sender_name} → {pkg.receiver_name}</p>
                <p className="text-xs text-muted-foreground mt-1">{format(new Date(pkg.created_at), 'MMM d, yyyy HH:mm')}</p>
                {pkg.mpesa_receipt_number && (
                  <p className="text-xs font-mono text-primary mt-0.5">M-Pesa: {pkg.mpesa_receipt_number}</p>
                )}
                {pkg.assigned_rider_id && (
                  <p className="text-xs text-info mt-0.5">🏍 Rider: {getRiderName(pkg.assigned_rider_id)}</p>
                )}
              </div>
              <div className="text-right space-y-1">
                <StatusBadge status={pkg.status} />
                <p className="text-sm font-medium">KES {pkg.cost}</p>
                <span className={`text-xs ${pkg.payment_status === 'paid' ? 'text-primary' : 'text-warning'}`}>
                  {pkg.payment_status}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setExpandedQR(expandedQR === pkg.id ? null : pkg.id)}>
                  <QrCode className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(pkg)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setAssignPkg(pkg); setSelectedRider(pkg.assigned_rider_id || ''); }}>
                  <Truck className="w-4 h-4" />
                </Button>
                {pkg.delivery_type !== 'doorstep' && (
                <Button variant="ghost" size="sm" title="Convert to Doorstep" onClick={() => { setConvertPkg(pkg); setConvertCost('300'); setConvertAddress(pkg.receiver_address || ''); setConvertPhone(pkg.sender_phone || ''); }}>
                    <ArrowRightLeft className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="flex gap-1">
                {pkg.status === 'refunded' ? (
                  <span className="text-xs text-muted-foreground italic">Refunded</span>
                ) : (<>
                <ShareWhatsAppButton pkg={{
                  trackingNumber: pkg.tracking_number, receiverName: pkg.receiver_name,
                  receiverPhone: pkg.receiver_phone, receiverAddress: pkg.receiver_address,
                  deliveryType: pkg.delivery_type, pickupPoint: pkg.pickup_point, cost: pkg.cost,
                }} />
                <DownloadReceiptButton pkg={{
                  trackingNumber: pkg.tracking_number, senderName: pkg.sender_name,
                  senderPhone: pkg.sender_phone, senderAddress: pkg.sender_address,
                  receiverName: pkg.receiver_name, receiverPhone: pkg.receiver_phone,
                  receiverAddress: pkg.receiver_address, deliveryType: pkg.delivery_type,
                  pickupPoint: pkg.pickup_point, packageDescription: pkg.package_description,
                  packageValue: pkg.package_value, weight: pkg.weight, cost: pkg.cost,
                  createdAt: new Date(pkg.created_at), paymentStatus: pkg.payment_status,
                  mpesaReceiptNumber: pkg.mpesa_receipt_number,
                }} />
                <PrintReceiptButton pkg={{
                  trackingNumber: pkg.tracking_number, senderName: pkg.sender_name,
                  senderPhone: pkg.sender_phone, receiverName: pkg.receiver_name,
                  receiverPhone: pkg.receiver_phone, receiverAddress: pkg.receiver_address,
                  deliveryType: pkg.delivery_type, pickupPoint: pkg.pickup_point,
                  packageDescription: pkg.package_description, cost: pkg.cost,
                  createdAt: new Date(pkg.created_at), paymentStatus: pkg.payment_status,
                  mpesaReceiptNumber: pkg.mpesa_receipt_number,
                }} />
                </>)}
              </div>
            </div>
            {expandedQR === pkg.id && (
              <div className="flex justify-center mt-3">
                <PackageQRCode trackingNumber={pkg.tracking_number} size={140} />
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Edit Dialog */}
      <Dialog open={!!editPkg} onOpenChange={open => !open && setEditPkg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit - {editPkg?.tracking_number}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assign Rider</Label>
              <Select value={editForm.assigned_rider_id} onValueChange={v => setEditForm(p => ({ ...p, assigned_rider_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select rider" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No rider</SelectItem>
                  {riders.map(r => <SelectItem key={r.id} value={r.id}>{r.full_name} - {r.phone}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Receiver Name</Label>
              <Input value={editForm.receiver_name} onChange={e => setEditForm(p => ({ ...p, receiver_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Receiver Address</Label>
              <Input value={editForm.receiver_address} onChange={e => setEditForm(p => ({ ...p, receiver_address: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Cost (KES)</Label>
              <Input type="number" value={editForm.cost} onChange={e => setEditForm(p => ({ ...p, cost: e.target.value }))} />
            </div>
            <Button className="w-full gap-2" onClick={saveEdit}>
              <Save className="w-4 h-4" /> Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Rider Dialog */}
      <Dialog open={!!assignPkg} onOpenChange={open => !open && setAssignPkg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Rider - {assignPkg?.tracking_number}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{assignPkg?.sender_name} → {assignPkg?.receiver_name}</p>
            <div className="space-y-2">
              <Label>Select Rider</Label>
              <Select value={selectedRider} onValueChange={setSelectedRider}>
                <SelectTrigger><SelectValue placeholder="Choose a rider" /></SelectTrigger>
                <SelectContent>
                  {riders.length === 0 ? (
                    <SelectItem value="none" disabled>No riders available</SelectItem>
                  ) : (
                    riders.map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.full_name} - {r.vehicle_type} {r.is_online ? '🟢' : '🔴'}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full gap-2" onClick={assignRider} disabled={!selectedRider}>
              <Truck className="w-4 h-4" /> Assign Rider
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Package Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Package</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Sender Account *</Label>
              <Select value={newPkg.user_id} onValueChange={v => {
                const u = senderUsers.find((x: any) => x.user_id === v);
                setNewPkg(p => ({ ...p, user_id: v, sender_name: u?.full_name || p.sender_name, sender_phone: u?.phone || p.sender_phone }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select sender" /></SelectTrigger>
                <SelectContent>
                  {senderUsers.map((u: any) => (
                    <SelectItem key={u.user_id} value={u.user_id}>{u.full_name} — {u.phone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Sender Name *</Label>
                <Input value={newPkg.sender_name} onChange={e => setNewPkg(p => ({ ...p, sender_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Sender Phone *</Label>
                <Input value={newPkg.sender_phone} onChange={e => setNewPkg(p => ({ ...p, sender_phone: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Receiver Name *</Label>
                <Input value={newPkg.receiver_name} onChange={e => setNewPkg(p => ({ ...p, receiver_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Receiver Phone *</Label>
                <Input value={newPkg.receiver_phone} onChange={e => setNewPkg(p => ({ ...p, receiver_phone: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Receiver Address *</Label>
              <Input value={newPkg.receiver_address} onChange={e => setNewPkg(p => ({ ...p, receiver_address: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Delivery Type</Label>
                <Select value={newPkg.delivery_type} onValueChange={v => setNewPkg(p => ({ ...p, delivery_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="doorstep">Doorstep</SelectItem>
                    <SelectItem value="pickup_point">Pickup Point</SelectItem>
                    <SelectItem value="errand">Errand</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cost (KES)</Label>
                <Input type="number" value={newPkg.cost} onChange={e => setNewPkg(p => ({ ...p, cost: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={newPkg.package_description} onChange={e => setNewPkg(p => ({ ...p, package_description: e.target.value }))} placeholder="Optional" />
            </div>
            <Button className="w-full gap-2" onClick={createPackage} disabled={creating}>
              <Plus className="w-4 h-4" /> {creating ? 'Creating...' : 'Create Package'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Convert to Doorstep Dialog */}
      <Dialog open={!!convertPkg} onOpenChange={o => !o && setConvertPkg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Convert to Doorstep — {convertPkg?.tracking_number}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Current cost: KES {convertPkg?.cost} • Payment: {convertPkg?.payment_status}
            </p>
            <p className="text-xs text-warning">
              The sender will be prompted in their dashboard to accept this conversion before it takes effect.
            </p>
            <div className="space-y-2">
              <Label>New doorstep cost (KES)</Label>
              <Input type="number" value={convertCost} onChange={e => setConvertCost(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Doorstep delivery location</Label>
              <Input
                value={convertAddress}
                onChange={e => setConvertAddress(e.target.value)}
                placeholder="e.g. Kilimani, Argwings Kodhek Rd, Apt 4B"
              />
            </div>
            <div className="space-y-2">
              <Label>M-Pesa phone number for the prompt</Label>
              <Input
                value={convertPhone}
                onChange={e => setConvertPhone(e.target.value)}
                placeholder="0712345678"
              />
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Balance to prompt</span>
                <span className="text-lg font-bold text-primary">
                  KES {convertPkg?.payment_status === 'paid'
                    ? Math.max(Number(convertCost || 0) - Number(convertPkg?.cost || 0), 0)
                    : Number(convertCost || 0)}
                </span>
              </div>
              {convertPkg?.payment_status === 'paid' && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Sender already paid KES {convertPkg?.cost}; only the balance is charged.
                </p>
              )}
            </div>
            <Button className="w-full" onClick={convertToDoorstep} disabled={converting}>
              {converting ? 'Converting...' : 'Convert'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* STK waiting animation */}
      <Dialog open={!!stkWaiting} onOpenChange={o => !o && setStkWaiting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Awaiting sender confirmation</DialogTitle></DialogHeader>
          <StkWaitingAnimation amount={stkWaiting?.amount} phone={stkWaiting?.phone} />
          <Button variant="outline" className="w-full" onClick={() => { setStkWaiting(null); onRefresh(); }}>
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
