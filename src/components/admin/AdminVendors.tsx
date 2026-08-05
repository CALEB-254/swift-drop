import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, MapPin, Edit } from 'lucide-react';
import { UserCog, AlertCircle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AdminData } from '@/pages/admin/AdminDashboard';
import { logger } from "@/lib/logger";

interface Props { data: AdminData; onRefresh: () => void; }

interface AgentRecord {
  id: string;
  user_id?: string | null;
  business_name: string;
  location: string;
  phone: string;
  address?: string | null;
  operating_hours?: string | null;
  services?: string[] | null;
  is_active?: boolean | null;
  zone_id?: string | null;
}

interface AgentOwnerOption {
  user_id: string;
  full_name?: string | null;
  phone?: string | null;
  role?: string | null;
}

interface ZoneOption {
  id: string;
  name: string;
  is_cbd?: boolean | null;
}

interface AgentFormProps {
  form: {
    business_name: string;
    location: string;
    phone: string;
    address: string;
    operating_hours: string;
    tracking_prefix: string;
    user_id: string;
    zone_id: string;
  };
  setForm: Dispatch<SetStateAction<AgentFormProps['form']>>;
  agentUserOptions: AgentOwnerOption[];
  zoneOptions: ZoneOption[];
  onSubmit: () => void;
  submitLabel: string;
}

function AgentForm({ form, setForm, agentUserOptions, zoneOptions, onSubmit, submitLabel }: AgentFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Owner Account (agent user)</Label>
        <Select value={form.user_id || 'self'} onValueChange={v => setForm(p => ({ ...p, user_id: v === 'self' ? '' : v }))}>
          <SelectTrigger><SelectValue placeholder="Assign to agent user" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="self">My account (admin)</SelectItem>
            {agentUserOptions.map((u) => (
              <SelectItem key={u.user_id} value={u.user_id}>{u.full_name} — {u.phone}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Zone *</Label>
        <Select value={form.zone_id || 'none'} onValueChange={v => setForm(p => ({ ...p, zone_id: v === 'none' ? '' : v }))}>
          <SelectTrigger><SelectValue placeholder="Select zone" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— No zone —</SelectItem>
            {zoneOptions.map((z) => (
              <SelectItem key={z.id} value={z.id}>{z.name}{z.is_cbd ? ' (CBD)' : ''}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
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
}

export function AdminVendors({ data, onRefresh }: Props) {
  const [showNew, setShowNew] = useState(false);
  const [editAgent, setEditAgent] = useState<AgentRecord | null>(null);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [assignAgent, setAssignAgent] = useState<AgentRecord | null>(null);
  const [assignUserId, setAssignUserId] = useState<string>('');
  const [lastError, setLastError] = useState<{ action: string; message: string; details?: string; hint?: string; code?: string } | null>(null);
  const [form, setForm] = useState({
    business_name: '', location: '', phone: '', address: '', operating_hours: '', tracking_prefix: 'D01', user_id: '', zone_id: '',
  });

  const resetForm = () => setForm({ business_name: '', location: '', phone: '', address: '', operating_hours: '', tracking_prefix: 'D01', user_id: '', zone_id: '' });

  useEffect(() => {
    supabase.from('zones').select('id, name, is_cbd, zone_type, supports_doorstep' as any).eq('is_active', true).order('name').then(({ data }) => {
      const rows = (data as any[]) || [];
      // Only pickup zones are valid for agent pickup points
      const pickup = rows.filter((z: any) => (z.zone_type || (z.supports_doorstep ? 'doorstep' : 'pickup')) === 'pickup');
      setZones(pickup as ZoneOption[]);
    });
  }, []);

  const agentUserOptions = data.users.filter((u): u is AgentOwnerOption => u.role === 'agent');

  const openEdit = (agent: AgentRecord) => {
    const prefix = agent.services?.find((s: string) => s.startsWith('tracking_prefix:'))?.split(':')[1] || 'D01';
    setEditAgent(agent);
    setForm({
      business_name: agent.business_name,
      location: agent.location,
      phone: agent.phone,
      address: agent.address || '',
      operating_hours: agent.operating_hours || '',
      tracking_prefix: prefix,
      user_id: agent.user_id || '',
      zone_id: agent.zone_id || '',
    });
  };

  const createAgent = async () => {
    if (!form.business_name || !form.location || !form.phone) {
      toast.error('Fill required fields'); return;
    }
    let ownerId = form.user_id;
    if (!ownerId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Not signed in'); return; }
      ownerId = user.id;
    }

    const { error } = await supabase.from('agents').insert({
      user_id: ownerId,
      business_name: form.business_name,
      location: form.location,
      phone: form.phone,
      address: form.address || null,
      operating_hours: form.operating_hours || null,
      services: [`tracking_prefix:${form.tracking_prefix}`],
      zone_id: form.zone_id || null,
    });
    if (error) {
      logger.error('Create agent failed:', error);
      const errInfo = { action: 'Create agent', message: error.message || 'Failed to create agent', details: (error as any).details, hint: (error as any).hint, code: (error as any).code };
      setLastError(errInfo);
      toast.error(errInfo.message, { description: errInfo.details || errInfo.hint });
      return;
    }
    setLastError(null);
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
      user_id: form.user_id || editAgent.user_id,
      zone_id: form.zone_id || null,
    }).eq('id', editAgent.id);
    if (error) {
      logger.error('Update agent failed:', error);
      const errInfo = { action: 'Update agent', message: error.message, details: (error as any).details, hint: (error as any).hint, code: (error as any).code };
      setLastError(errInfo);
      toast.error(errInfo.message, { description: errInfo.details || errInfo.hint });
      return;
    }
    setLastError(null);
    toast.success('Agent updated!');
    setEditAgent(null);
    resetForm();
    onRefresh();
  };

  const deleteAgent = async (id: string) => {
    const { error } = await supabase.from('agents').delete().eq('id', id);
    if (error) {
      logger.error('Delete agent failed:', error);
      const errInfo = { action: 'Delete agent', message: error.message, details: (error as any).details, hint: (error as any).hint, code: (error as any).code };
      setLastError(errInfo);
      toast.error(errInfo.message, { description: errInfo.details || errInfo.hint });
      return;
    }
    setLastError(null);
    toast.success('Agent removed');
    onRefresh();
  };

  const openAssign = (agent: AgentRecord) => {
    setAssignAgent(agent);
    setAssignUserId(agent.user_id || '');
  };

  const saveAssign = async () => {
    if (!assignAgent) return;
    let ownerId = assignUserId;
    if (!ownerId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Not signed in'); return; }
      ownerId = user.id;
    }
    const { error } = await supabase.from('agents').update({ user_id: ownerId }).eq('id', assignAgent.id);
    if (error) {
      logger.error('Assign manager failed:', error);
      const errInfo = { action: 'Assign manager', message: error.message, details: (error as any).details, hint: (error as any).hint, code: (error as any).code };
      setLastError(errInfo);
      toast.error(errInfo.message, { description: errInfo.details || errInfo.hint });
      return;
    }
    setLastError(null);
    toast.success('Manager assigned');
    setAssignAgent(null);
    onRefresh();
  };

  return (
    <div className="space-y-3 mt-4">
      {lastError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-medium text-destructive">{lastError.action} failed</p>
                <p className="text-xs text-foreground break-words"><span className="text-muted-foreground">Message: </span>{lastError.message}</p>
                {lastError.details && (
                  <p className="text-xs text-foreground break-words"><span className="text-muted-foreground">Details: </span>{lastError.details}</p>
                )}
                {lastError.hint && (
                  <p className="text-xs text-foreground break-words"><span className="text-muted-foreground">Hint: </span>{lastError.hint}</p>
                )}
                {lastError.code && (
                  <p className="text-xs text-foreground break-words"><span className="text-muted-foreground">Code: </span><span className="font-mono">{lastError.code}</span></p>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => setLastError(null)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Button className="w-full gap-2" onClick={() => { resetForm(); setShowNew(true); }}>
        <Plus className="w-4 h-4" /> Create Agent Pickup Point
      </Button>

      {data.agents.map(agent => {
        const prefix = agent.services?.find((s: string) => s.startsWith('tracking_prefix:'))?.split(':')[1] || 'D01';
        const agentPkgCount = data.packages.filter(p => p.pickup_agent_id === agent.id).length;
        const manager = data.users.find((u: any) => u.user_id === agent.user_id);
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
                  <p className="text-xs mt-1">
                    <span className="text-muted-foreground">Manager: </span>
                    <span className="font-medium">{manager?.full_name || 'Unassigned (admin)'}</span>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${agent.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {agent.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" title="Assign manager" onClick={() => openAssign(agent)}><UserCog className="w-4 h-4" /></Button>
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
          <AgentForm form={form} setForm={setForm} agentUserOptions={agentUserOptions} zoneOptions={zones} onSubmit={createAgent} submitLabel="Create" />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editAgent} onOpenChange={open => { if (!open) { setEditAgent(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Agent</DialogTitle></DialogHeader>
          <AgentForm form={form} setForm={setForm} agentUserOptions={agentUserOptions} zoneOptions={zones} onSubmit={updateAgent} submitLabel="Save Changes" />
        </DialogContent>
      </Dialog>

      {/* Assign Manager Dialog */}
      <Dialog open={!!assignAgent} onOpenChange={open => { if (!open) setAssignAgent(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Manager</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Assign <span className="font-medium text-foreground">{assignAgent?.business_name}</span> to an agent user who will manage it.
            </p>
            <div className="space-y-2">
              <Label>Manager (agent user)</Label>
              <Select value={assignUserId || 'self'} onValueChange={v => setAssignUserId(v === 'self' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">My account (admin)</SelectItem>
                  {agentUserOptions.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>{u.full_name} — {u.phone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {agentUserOptions.length === 0 && (
                <p className="text-[11px] text-muted-foreground">No agent users found. Create an agent user in the Users tab first.</p>
              )}
            </div>
            <Button className="w-full" onClick={saveAssign}>Save Assignment</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
