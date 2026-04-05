import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Truck, Plus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AdminData } from '@/pages/admin/AdminDashboard';

interface Props { data: AdminData; onRefresh: () => void; }

export function AdminRiders({ data, onRefresh }: Props) {
  const [riders, setRiders] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [editRider, setEditRider] = useState<any>(null);
  const [form, setForm] = useState({ full_name: '', phone: '', vehicle_type: 'motorcycle', license_plate: '' });

  const fetchRiders = async () => {
    const { data: r } = await supabase.from('riders').select('*').order('created_at', { ascending: false });
    setRiders(r || []);
  };

  useEffect(() => { fetchRiders(); }, []);

  const resetForm = () => setForm({ full_name: '', phone: '', vehicle_type: 'motorcycle', license_plate: '' });

  const getRiderStats = (riderId: string) => {
    const pkgs = data.packages.filter(p => p.assigned_rider_id === riderId);
    return {
      total: pkgs.length,
      delivered: pkgs.filter(p => p.status === 'delivered').length,
      active: pkgs.filter(p => !['delivered', 'cancelled'].includes(p.status)).length,
    };
  };

  const createRider = async () => {
    if (!form.full_name || !form.phone) { toast.error('Fill required fields'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('riders').insert({
      user_id: user.id, // placeholder — ideally link to a real user
      full_name: form.full_name,
      phone: form.phone,
      vehicle_type: form.vehicle_type,
      license_plate: form.license_plate || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Rider created!');
    setShowNew(false);
    resetForm();
    fetchRiders();
  };

  const updateRider = async () => {
    if (!editRider) return;
    const { error } = await supabase.from('riders').update({
      full_name: form.full_name,
      phone: form.phone,
      vehicle_type: form.vehicle_type,
      license_plate: form.license_plate || null,
    }).eq('id', editRider.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Rider updated!');
    setEditRider(null);
    resetForm();
    fetchRiders();
  };

  const toggleVerify = async (rider: any) => {
    const { error } = await supabase.from('riders').update({ is_verified: !rider.is_verified }).eq('id', rider.id);
    if (error) { toast.error(error.message); return; }
    toast.success(rider.is_verified ? 'Rider unverified' : 'Rider verified');
    fetchRiders();
  };

  const deleteRider = async (id: string) => {
    const { error } = await supabase.from('riders').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Rider removed');
    fetchRiders();
  };

  const RiderForm = ({ onSubmit, label }: { onSubmit: () => void; label: string }) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Full Name *</Label>
        <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label>Phone *</Label>
        <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+254..." />
      </div>
      <div className="space-y-2">
        <Label>Vehicle Type</Label>
        <Select value={form.vehicle_type} onValueChange={v => setForm(p => ({ ...p, vehicle_type: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="motorcycle">Motorcycle</SelectItem>
            <SelectItem value="bicycle">Bicycle</SelectItem>
            <SelectItem value="car">Car</SelectItem>
            <SelectItem value="van">Van</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>License Plate</Label>
        <Input value={form.license_plate} onChange={e => setForm(p => ({ ...p, license_plate: e.target.value }))} />
      </div>
      <Button className="w-full gap-2" onClick={onSubmit}><Plus className="w-4 h-4" /> {label}</Button>
    </div>
  );

  return (
    <div className="space-y-3 mt-4">
      <Button className="w-full gap-2" onClick={() => { resetForm(); setShowNew(true); }}>
        <Plus className="w-4 h-4" /> Add New Rider
      </Button>

      {riders.length === 0 ? (
        <Card className="border-0 shadow-card">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No riders registered yet</p>
          </CardContent>
        </Card>
      ) : (
        riders.map(rider => {
          const stats = getRiderStats(rider.id);
          return (
            <Card key={rider.id} className="border-0 shadow-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium">{rider.full_name}</p>
                    <p className="text-sm text-muted-foreground">{rider.phone}</p>
                    <p className="text-xs text-muted-foreground capitalize">{rider.vehicle_type} {rider.license_plate && `· ${rider.license_plate}`}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${rider.is_online ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {rider.is_online ? 'Online' : 'Offline'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${rider.is_verified ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'}`}>
                        {rider.is_verified ? 'Verified' : 'Unverified'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
                  <div className="text-center">
                    <p className="text-sm font-bold">{stats.total}</p>
                    <p className="text-[10px] text-muted-foreground">Total</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-primary">{stats.delivered}</p>
                    <p className="text-[10px] text-muted-foreground">Delivered</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-warning">{stats.active}</p>
                    <p className="text-[10px] text-muted-foreground">Active</p>
                  </div>
                </div>
                <div className="flex gap-1 mt-3 pt-3 border-t border-border">
                  <Button variant="ghost" size="sm" onClick={() => toggleVerify(rider)}>
                    {rider.is_verified ? <XCircle className="w-4 h-4 text-destructive" /> : <CheckCircle className="w-4 h-4 text-primary" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setEditRider(rider); setForm({ full_name: rider.full_name, phone: rider.phone, vehicle_type: rider.vehicle_type || 'motorcycle', license_plate: rider.license_plate || '' }); }}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteRider(rider.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Rider</DialogTitle></DialogHeader>
          <RiderForm onSubmit={createRider} label="Create Rider" />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRider} onOpenChange={open => { if (!open) { setEditRider(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Rider</DialogTitle></DialogHeader>
          <RiderForm onSubmit={updateRider} label="Save Changes" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
