import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bus, Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Courier {
  id: string;
  name: string;
  phone: string | null;
  zone_id: string | null;
  price: number;
  is_active: boolean;
  description: string | null;
}

interface Zone { id: string; name: string; zone_type?: string; area?: string | null }

export function AdminCouriers() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Courier | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', zone_id: '', price: '150', description: '' });

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: c }, { data: z }] = await Promise.all([
      supabase.from('couriers' as any).select('*').order('name'),
      supabase.from('zones').select('id, name, zone_type, area').eq('is_active', true).order('name'),
    ]);
    setCouriers((c as any) || []);
    setZones((z as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const errandZones = zones.filter(z => (z as any).zone_type === 'errand');

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', phone: '', zone_id: errandZones[0]?.id || '', price: '150', description: '' });
    setDialogOpen(true);
  };

  const openEdit = (c: Courier) => {
    setEditing(c);
    setForm({
      name: c.name,
      phone: c.phone || '',
      zone_id: c.zone_id || '',
      price: String(c.price),
      description: c.description || '',
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name || !form.zone_id) {
      toast.error('Name and location are required');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      phone: form.phone || null,
      zone_id: form.zone_id,
      price: Number(form.price) || 0,
      description: form.description || null,
    };
    const { error } = editing
      ? await supabase.from('couriers' as any).update(payload).eq('id', editing.id)
      : await supabase.from('couriers' as any).insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? 'Courier updated' : 'Courier created');
    setDialogOpen(false);
    fetchAll();
  };

  const toggleActive = async (c: Courier) => {
    await supabase.from('couriers' as any).update({ is_active: !c.is_active }).eq('id', c.id);
    fetchAll();
  };

  const del = async (c: Courier) => {
    if (!confirm(`Delete courier "${c.name}"?`)) return;
    await supabase.from('couriers' as any).delete().eq('id', c.id);
    toast.success('Courier deleted');
    fetchAll();
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold">Errand Couriers (Saccos)</h2>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Add Courier</Button>
      </div>

      {errandZones.length === 0 && (
        <Card className="border-0 shadow-card"><CardContent className="p-4 text-xs text-muted-foreground">
          You need at least one <strong>Errand</strong> location under Zones before adding couriers.
        </CardContent></Card>
      )}

      {couriers.length === 0 ? (
        <Card className="border-0 shadow-card">
          <CardContent className="p-6 text-center text-muted-foreground">
            <Bus className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No couriers yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {couriers.map(c => {
            const zone = zones.find(z => z.id === c.zone_id);
            return (
              <Card key={c.id} className="border-0 shadow-card">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${c.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Bus className={`w-4 h-4 ${c.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {zone?.name || 'No location'} • KES {Number(c.price)}
                        {c.phone && ` • ${c.phone}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c)} />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => del(c)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Courier' : 'Add Courier'}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. SuperMetro, 2NK" />
            </div>
            <div className="space-y-2">
              <Label>Location *</Label>
              <Select value={form.zone_id} onValueChange={v => setForm({ ...form, zone_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choose location" /></SelectTrigger>
                <SelectContent>
                  {errandZones.map(z => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sacco Delivery Fee (KES) *</Label>
              <Input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
              <p className="text-[11px] text-muted-foreground">This is the amount the sender pays the sacco (to Till 0114606040) after the parcel is scanned.</p>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
            </div>
            <Button className="w-full" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editing ? 'Update Courier' : 'Add Courier'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}