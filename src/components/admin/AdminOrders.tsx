import { useState } from 'react';
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
import { Search, Edit, QrCode, Save, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { STATUS_LABELS, type PackageStatus } from '@/types/delivery';
import type { AdminData } from '@/pages/admin/AdminDashboard';

interface Props { data: AdminData; onRefresh: () => void; }

export function AdminOrders({ data, onRefresh }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedQR, setExpandedQR] = useState<string | null>(null);
  const [editPkg, setEditPkg] = useState<any>(null);
  const [editForm, setEditForm] = useState({ status: '', receiver_name: '', receiver_address: '', cost: '' });

  const filtered = data.packages.filter(p => {
    const matchesSearch = !search ||
      p.tracking_number.toLowerCase().includes(search.toLowerCase()) ||
      p.sender_name.toLowerCase().includes(search.toLowerCase()) ||
      p.receiver_name.toLowerCase().includes(search.toLowerCase()) ||
      p.receiver_phone.includes(search);
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
    });
  };

  const saveEdit = async () => {
    if (!editPkg) return;
    const { error } = await supabase.from('packages').update({
      status: editForm.status as any,
      receiver_name: editForm.receiver_name,
      receiver_address: editForm.receiver_address,
      cost: Number(editForm.cost),
    }).eq('id', editPkg.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Package updated!');
    setEditPkg(null);
    onRefresh();
  };

  return (
    <div className="space-y-3 mt-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
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
              </div>
              <div className="flex gap-1">
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
    </div>
  );
}
