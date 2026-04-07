import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, Package, Bell, Loader2, CheckSquare, Truck, Zap } from 'lucide-react';
import type { AdminData } from '@/pages/admin/AdminDashboard';

interface Props { data: AdminData; onRefresh: () => void; }

export function AdminBulkActions({ data, onRefresh }: Props) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [bulkUserAction, setBulkUserAction] = useState('');
  const [bulkPkgAction, setBulkPkgAction] = useState('');
  const [processing, setProcessing] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);

  const pendingUsers = data.users.filter(u => u.role !== 'admin');
  const pendingPackages = data.packages.filter(p => p.status === 'pending' || p.status === 'in_transit');
  const availableRiders = (data as any).riders?.filter((r: any) => r.is_online && r.is_verified) || [];

  const toggleUser = (id: string) => {
    setSelectedUsers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const togglePackage = (id: string) => {
    setSelectedPackages(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAllUsers = () => {
    if (selectedUsers.length === pendingUsers.length) setSelectedUsers([]);
    else setSelectedUsers(pendingUsers.map(u => u.user_id));
  };

  const selectAllPackages = () => {
    if (selectedPackages.length === pendingPackages.length) setSelectedPackages([]);
    else setSelectedPackages(pendingPackages.map(p => p.id));
  };

  const handleBulkUserAction = async () => {
    if (!selectedUsers.length || !bulkUserAction) {
      toast.error('Select users and an action');
      return;
    }
    setProcessing(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (bulkUserAction === 'notify') {
      for (const userId of selectedUsers) {
        await supabase.from('notifications').insert({
          user_id: userId,
          title: 'Admin Notice',
          message: 'You have a new notification from the admin team.',
          type: 'admin',
        });
      }
      toast.success(`Notification sent to ${selectedUsers.length} users`);
    }

    if (user) {
      await supabase.from('audit_logs').insert({
        admin_id: user.id,
        admin_email: user.email,
        action: `bulk_${bulkUserAction}_users`,
        target_table: 'profiles',
        new_values: { count: selectedUsers.length, action: bulkUserAction },
      });
    }

    setProcessing(false);
    setSelectedUsers([]);
    onRefresh();
  };

  const handleBulkPkgAction = async () => {
    if (!selectedPackages.length || !bulkPkgAction) {
      toast.error('Select packages and an action');
      return;
    }
    setProcessing(true);
    const { data: { user } } = await supabase.auth.getUser();

    for (const pkgId of selectedPackages) {
      if (bulkPkgAction === 'cancel') {
        await supabase.from('packages').update({ status: 'cancelled' }).eq('id', pkgId);
      } else if (bulkPkgAction === 'in_transit') {
        await supabase.from('packages').update({ status: 'in_transit' }).eq('id', pkgId);
      }
    }

    if (user) {
      await supabase.from('audit_logs').insert({
        admin_id: user.id,
        admin_email: user.email,
        action: `bulk_${bulkPkgAction}_packages`,
        target_table: 'packages',
        new_values: { count: selectedPackages.length, action: bulkPkgAction },
      });
    }

    toast.success(`${bulkPkgAction} applied to ${selectedPackages.length} packages`);
    setProcessing(false);
    setSelectedPackages([]);
    onRefresh();
  };

  // Smart dispatch: auto-assign pending packages to available riders round-robin
  const handleSmartDispatch = async () => {
    if (availableRiders.length === 0) {
      toast.error('No online verified riders available');
      return;
    }
    const unassigned = data.packages.filter(p => p.status === 'pending' && !p.assigned_rider_id);
    if (unassigned.length === 0) {
      toast.error('No unassigned pending packages');
      return;
    }

    setAutoAssigning(true);
    const { data: { user } } = await supabase.auth.getUser();
    let assigned = 0;

    for (let i = 0; i < unassigned.length; i++) {
      const rider = availableRiders[i % availableRiders.length];
      const { error } = await supabase.from('packages')
        .update({ assigned_rider_id: rider.id, status: 'in_transit' })
        .eq('id', unassigned[i].id);
      if (!error) assigned++;
    }

    if (user) {
      await supabase.from('audit_logs').insert({
        admin_id: user.id,
        admin_email: user.email,
        action: 'smart_dispatch',
        target_table: 'packages',
        new_values: { assigned_count: assigned, rider_count: availableRiders.length },
      });
    }

    toast.success(`Smart dispatch: ${assigned} packages assigned to ${availableRiders.length} riders`);
    setAutoAssigning(false);
    onRefresh();
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Smart Dispatch */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-warning" />
            <h3 className="font-display font-bold">Smart Dispatch</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Auto-assign {data.packages.filter(p => p.status === 'pending' && !p.assigned_rider_id).length} unassigned packages
            to {availableRiders.length} online riders (round-robin by rating).
          </p>
          <Button onClick={handleSmartDispatch} disabled={autoAssigning} className="w-full">
            {autoAssigning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Truck className="w-4 h-4 mr-2" />}
            Auto-Assign Packages
          </Button>
        </CardContent>
      </Card>

      {/* Bulk User Actions */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="font-medium text-sm">Bulk User Actions</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={selectAllUsers} className="h-7 text-xs">
              <CheckSquare className="w-3 h-3 mr-1" /> {selectedUsers.length === pendingUsers.length ? 'Deselect' : 'Select'} All
            </Button>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1 mb-3">
            {pendingUsers.slice(0, 20).map(u => (
              <label key={u.user_id} className="flex items-center gap-2 text-xs py-1 cursor-pointer">
                <Checkbox checked={selectedUsers.includes(u.user_id)} onCheckedChange={() => toggleUser(u.user_id)} />
                <span>{u.full_name} ({u.role})</span>
              </label>
            ))}
          </div>

          <div className="flex gap-2">
            <Select value={bulkUserAction} onValueChange={setBulkUserAction}>
              <SelectTrigger className="flex-1 h-8">
                <SelectValue placeholder="Action..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="notify">Send Notification</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleBulkUserAction} disabled={processing} className="h-8">
              {processing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Apply'}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{selectedUsers.length} selected</p>
        </CardContent>
      </Card>

      {/* Bulk Package Actions */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-info" />
              <h3 className="font-medium text-sm">Bulk Package Actions</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={selectAllPackages} className="h-7 text-xs">
              <CheckSquare className="w-3 h-3 mr-1" /> {selectedPackages.length === pendingPackages.length ? 'Deselect' : 'Select'} All
            </Button>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1 mb-3">
            {pendingPackages.slice(0, 20).map(p => (
              <label key={p.id} className="flex items-center gap-2 text-xs py-1 cursor-pointer">
                <Checkbox checked={selectedPackages.includes(p.id)} onCheckedChange={() => togglePackage(p.id)} />
                <span>{p.tracking_number} • {p.status}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-2">
            <Select value={bulkPkgAction} onValueChange={setBulkPkgAction}>
              <SelectTrigger className="flex-1 h-8">
                <SelectValue placeholder="Action..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_transit">Mark In Transit</SelectItem>
                <SelectItem value="cancel">Cancel All</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleBulkPkgAction} disabled={processing} className="h-8">
              {processing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Apply'}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{selectedPackages.length} selected</p>
        </CardContent>
      </Card>
    </div>
  );
}
