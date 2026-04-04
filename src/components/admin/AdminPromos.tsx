import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Tag, Trash2, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { AdminData } from '@/pages/admin/AdminDashboard';

interface Props { data: AdminData; onRefresh: () => void; }

const emptyForm = {
  code: '', description: '', discount_type: 'percentage', discount_value: '',
  min_order: '', max_uses: '', valid_until: '', is_active: true,
};

export function AdminPromos({ data, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openNew = () => { setForm(emptyForm); setEditId(null); setShowForm(true); };

  const openEdit = (promo: any) => {
    setEditId(promo.id);
    setForm({
      code: promo.code,
      description: promo.description || '',
      discount_type: promo.discount_type,
      discount_value: promo.discount_value.toString(),
      min_order: promo.min_order?.toString() || '',
      max_uses: promo.max_uses?.toString() || '',
      valid_until: promo.valid_until ? format(new Date(promo.valid_until), 'yyyy-MM-dd') : '',
      is_active: promo.is_active,
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.code || !form.discount_value) { toast.error('Fill required fields'); return; }
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      code: form.code.toUpperCase(),
      description: form.description || null,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      min_order: form.min_order ? Number(form.min_order) : 0,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
      is_active: form.is_active,
      created_by: user?.id,
    };

    const { error } = editId
      ? await supabase.from('promo_codes').update(payload).eq('id', editId)
      : await supabase.from('promo_codes').insert(payload);

    if (error) { toast.error(error.message); return; }
    toast.success(editId ? 'Promo updated!' : 'Promo created!');
    setShowForm(false);
    onRefresh();
  };

  const deletePromo = async (id: string) => {
    const { error } = await supabase.from('promo_codes').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Promo deleted');
    onRefresh();
  };

  return (
    <div className="space-y-3 mt-4">
      <Button className="w-full gap-2" onClick={openNew}>
        <Plus className="w-4 h-4" /> Create Promo Code
      </Button>

      {data.promos.length === 0 ? (
        <Card className="border-0 shadow-card">
          <CardContent className="py-12 text-center">
            <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No promo codes yet</p>
          </CardContent>
        </Card>
      ) : (
        data.promos.map((promo: any) => (
          <Card key={promo.id} className="border-0 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono font-bold text-primary">{promo.code}</p>
                  {promo.description && <p className="text-xs text-muted-foreground">{promo.description}</p>}
                  <p className="text-sm mt-1">
                    {promo.discount_type === 'percentage' ? `${promo.discount_value}% off` : `KES ${promo.discount_value} off`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Used: {promo.current_uses}{promo.max_uses ? `/${promo.max_uses}` : ''}
                    {promo.valid_until && ` · Expires: ${format(new Date(promo.valid_until), 'MMM d, yyyy')}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${promo.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {promo.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(promo)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => deletePromo(promo.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Create'} Promo Code</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Code *</Label>
              <Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g. WELCOME20" className="font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select value={form.discount_type} onValueChange={v => setForm(p => ({ ...p, discount_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Value *</Label>
                <Input type="number" value={form.discount_value} onChange={e => setForm(p => ({ ...p, discount_value: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Min Order (KES)</Label>
                <Input type="number" value={form.min_order} onChange={e => setForm(p => ({ ...p, min_order: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max Uses</Label>
                <Input type="number" value={form.max_uses} onChange={e => setForm(p => ({ ...p, max_uses: e.target.value }))} placeholder="Unlimited" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Valid Until</Label>
              <Input type="date" value={form.valid_until} onChange={e => setForm(p => ({ ...p, valid_until: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Active</Label>
              <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
            </div>
            <Button className="w-full" onClick={save}>{editId ? 'Save Changes' : 'Create Promo'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
