import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MapPin, Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { AdminData } from '@/pages/admin/AdminDashboard';

interface Props { data: AdminData; onRefresh: () => void; }

interface Zone {
  id: string;
  name: string;
  description: string | null;
  delivery_fee: number;
  is_active: boolean;
}

export function AdminZones({ data, onRefresh }: Props) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Zone | null>(null);
  const [form, setForm] = useState({ name: '', description: '', delivery_fee: '150' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchZones(); }, []);

  const fetchZones = async () => {
    setLoading(true);
    const { data } = await supabase.from('zones').select('*').order('name');
    setZones((data as Zone[]) || []);
    setLoading(false);
  };

  const logAction = async (action: string, targetId: string, oldVals?: any, newVals?: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('audit_logs').insert({
        admin_id: user.id,
        admin_email: user.email,
        action,
        target_table: 'zones',
        target_id: targetId,
        old_values: oldVals || null,
        new_values: newVals || null,
      });
    }
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Zone name is required'); return; }
    setSaving(true);

    if (editing) {
      const { error } = await supabase.from('zones').update({
        name: form.name,
        description: form.description || null,
        delivery_fee: parseFloat(form.delivery_fee) || 150,
      }).eq('id', editing.id);

      if (error) toast.error(error.message);
      else {
        await logAction('update_zone', editing.id, editing, form);
        toast.success('Zone updated');
      }
    } else {
      const { data: newZone, error } = await supabase.from('zones').insert({
        name: form.name,
        description: form.description || null,
        delivery_fee: parseFloat(form.delivery_fee) || 150,
      }).select().single();

      if (error) toast.error(error.message);
      else {
        await logAction('create_zone', newZone.id, null, form);
        toast.success('Zone created');
      }
    }

    setSaving(false);
    setDialogOpen(false);
    setEditing(null);
    setForm({ name: '', description: '', delivery_fee: '150' });
    fetchZones();
  };

  const toggleActive = async (zone: Zone) => {
    await supabase.from('zones').update({ is_active: !zone.is_active }).eq('id', zone.id);
    await logAction(zone.is_active ? 'deactivate_zone' : 'activate_zone', zone.id);
    fetchZones();
  };

  const deleteZone = async (zone: Zone) => {
    if (!confirm(`Delete zone "${zone.name}"?`)) return;
    await supabase.from('zones').delete().eq('id', zone.id);
    await logAction('delete_zone', zone.id, zone);
    toast.success('Zone deleted');
    fetchZones();
  };

  const openEdit = (zone: Zone) => {
    setEditing(zone);
    setForm({ name: zone.name, description: zone.description || '', delivery_fee: String(zone.delivery_fee) });
    setDialogOpen(true);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold">Delivery Zones</h2>
        <Button size="sm" onClick={() => { setEditing(null); setForm({ name: '', description: '', delivery_fee: '150' }); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Add Zone
        </Button>
      </div>

      {zones.length === 0 ? (
        <Card className="border-0 shadow-card">
          <CardContent className="p-6 text-center text-muted-foreground">
            <MapPin className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No zones created yet. Add zones to manage delivery areas.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {zones.map(zone => (
            <Card key={zone.id} className="border-0 shadow-card">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${zone.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                    <MapPin className={`w-4 h-4 ${zone.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{zone.name}</p>
                    <p className="text-[10px] text-muted-foreground">KES {zone.delivery_fee} • {zone.description || 'No description'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Switch checked={zone.is_active} onCheckedChange={() => toggleActive(zone)} />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(zone)}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteZone(zone)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Zone' : 'Create Zone'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Zone Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Nairobi CBD" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description" />
            </div>
            <div className="space-y-2">
              <Label>Delivery Fee (KES)</Label>
              <Input type="number" value={form.delivery_fee} onChange={e => setForm({ ...form, delivery_fee: e.target.value })} />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editing ? 'Update Zone' : 'Create Zone'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
