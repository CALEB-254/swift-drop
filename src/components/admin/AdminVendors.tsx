import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, MapPin, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AdminData } from '@/pages/admin/AdminDashboard';

interface Props { data: AdminData; onRefresh: () => void; }

export function AdminVendors({ data, onRefresh }: Props) {
  const [showNew, setShowNew] = useState(false);
  const [editAgent, setEditAgent] = useState<any>(null);
  const [form, setForm] = useState({
    business_name: '', location: '', phone: '', address: '', operating_hours: '', tracking_prefix: 'D01',
  });

  const resetForm = () => setForm({ business_name: '', location: '', phone: '', address: '', operating_hours: '', tracking_prefix: 'D01' });

  const openEdit = (agent: any) => {
    const prefix = agent.services?.find((s: string) => s.startsWith('tracking_prefix:'))?.split(':')[1] || 'D01';
    setEditAgent(agent);
    setForm({
      business_name: agent.business_name,
      location: agent.location,
      phone: agent.phone,
      address: agent.address || '',
      operating_hours: agent.operating_hours || '',
      tracking_prefix: prefix,
    });
  };

  const createAgent = async () => {
    if (!form.business_name || !form.location || !form.phone) {
      toast.error('Fill required fields'); return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('agents').insert({
      user_id: user.id,
      business_name: form.business_name,
      location: form.location,
      phone: form.phone,
      address: form.address || null,
      operating_hours: form.operating_hours || null,
      services: [`tracking_prefix:${form.tracking_prefix}`],
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Agent created!');
    setShowNew(false);
    resetForm();
    onRefresh();
  };

  const updateAgent = async () => {
    if (!editAgent) return;
    const { error } = await supabase.from('agents').update({
      business_name: form.business_name,
      location: form.location,
      phone: form.phone,
      address: form.address || null,
      operating_hours: form.operating_hours || null,
      services: [`tracking_prefix:${form.tracking_prefix}`],
    }).eq('id', editAgent.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Agent updated!');
    setEditAgent(null);
    resetForm();
    onRefresh();
  };

  const deleteAgent = async (id: string) => {
    const { error } = await supabase.from('agents').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Agent removed');
    onRefresh();
  };

  const AgentForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Business Name *</Label>
        <Input value={form.business_name} onChange={e => setForm(p => ({ ...p, business_name: e.target.value }))} placeholder="e.g. Central Hub" />
      </div>
      <div className="space-y-2">
        <Label>Location *</Label>
        <Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Nairobi CBD" />
      </div>
      <div className="space-y-2">
        <Label>Phone *</Label>
        <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+254..." />
      </div>
      <div className="space-y-2">
        <Label>Address</Label>
        <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label>Operating Hours</Label>
        <Input value={form.operating_hours} onChange={e => setForm(p => ({ ...p, operating_hours: e.target.value }))} placeholder="Mon-Sat 8AM-6PM" />
      </div>
      <div className="space-y-2">
        <Label>Tracking Prefix</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-muted-foreground">SWF-</span>
          <Input value={form.tracking_prefix} onChange={e => setForm(p => ({ ...p, tracking_prefix: e.target.value.toUpperCase() }))} className="w-24 font-mono" maxLength={4} />
          <span className="text-sm font-mono text-muted-foreground">-XXXX</span>
        </div>
      </div>
      <Button className="w-full gap-2" onClick={onSubmit}>
        <Plus className="w-4 h-4" /> {submitLabel}
      </Button>
    </div>
  );

  return (
    <div className="space-y-3 mt-4">
      <Button className="w-full gap-2" onClick={() => { resetForm(); setShowNew(true); }}>
        <Plus className="w-4 h-4" /> Create Agent Pickup Point
      </Button>

      {data.agents.map(agent => {
        const prefix = agent.services?.find((s: string) => s.startsWith('tracking_prefix:'))?.split(':')[1] || 'D01';
        const agentPkgCount = data.packages.filter(p => p.pickup_agent_id === agent.id).length;
        return (
          <Card key={agent.id} className="border-0 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{agent.business_name}</p>
                  <p className="text-sm text-muted-foreground">{agent.location}</p>
                  <p className="text-xs text-muted-foreground">{agent.phone}</p>
                  {agent.operating_hours && <p className="text-xs text-muted-foreground">{agent.operating_hours}</p>}
                  <p className="text-xs font-mono mt-1">SWF-{prefix}-XXXX · {agentPkgCount} packages</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${agent.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {agent.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(agent)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteAgent(agent.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {data.agents.length === 0 && (
        <Card className="border-0 shadow-card">
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No agents yet</p>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Agent Pickup Point</DialogTitle></DialogHeader>
          <AgentForm onSubmit={createAgent} submitLabel="Create" />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editAgent} onOpenChange={open => { if (!open) { setEditAgent(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Agent</DialogTitle></DialogHeader>
          <AgentForm onSubmit={updateAgent} submitLabel="Save Changes" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
