import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Shield, UserPlus, Users, Crown, Settings, HeadphonesIcon, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AdminData } from '@/pages/admin/AdminDashboard';

interface Props { data: AdminData; onRefresh: () => void; }

const ADMIN_ROLE_INFO: Record<string, { icon: any; label: string; description: string }> = {
  super_admin: { icon: Crown, label: 'Super Admin', description: 'Full system control' },
  operations_admin: { icon: Settings, label: 'Operations', description: 'Orders & riders management' },
  finance_admin: { icon: DollarSign, label: 'Finance', description: 'Payments & reports' },
  support_admin: { icon: HeadphonesIcon, label: 'Support', description: 'Customer service' },
};

export function AdminSecurity({ data, onRefresh }: Props) {
  const [showAssign, setShowAssign] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('operations_admin');

  const adminUsers = data.users.filter(u => u.role === 'admin');

  const assignAdminLevel = async () => {
    if (!selectedUserId || !selectedRole) { toast.error('Select user and role'); return; }
    
    const { error } = await supabase.from('admin_levels').upsert({
      user_id: selectedUserId,
      admin_role: selectedRole as any,
    }, { onConflict: 'user_id' });

    if (error) { toast.error(error.message); return; }
    toast.success('Admin level assigned!');
    setShowAssign(false);
    onRefresh();
  };

  return (
    <div className="space-y-4 mt-4">
      <Card className="border-0 shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-primary" />
            <p className="text-sm font-medium">Admin Role Levels</p>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Assign different admin levels to control what each admin can access
          </p>
          
          <div className="space-y-2">
            {Object.entries(ADMIN_ROLE_INFO).map(([key, info]) => (
              <div key={key} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30">
                <info.icon className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">{info.label}</p>
                  <p className="text-xs text-muted-foreground">{info.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button className="w-full gap-2" onClick={() => setShowAssign(true)}>
        <UserPlus className="w-4 h-4" /> Assign Admin Level
      </Button>

      {/* Current Admins */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-info" />
            <p className="text-sm font-medium">Current Admin Users</p>
          </div>
          {adminUsers.length === 0 ? (
            <p className="text-xs text-muted-foreground">No admin users found</p>
          ) : (
            <div className="space-y-2">
              {adminUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                  <div>
                    <p className="text-sm font-medium">{user.full_name}</p>
                    <p className="text-xs text-muted-foreground">{user.phone}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary capitalize">
                    {data.adminLevel || 'admin'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Platform Rules */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-warning" />
            <p className="text-sm font-medium">Security Policies</p>
          </div>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>✅ Row-level security enabled on all tables</p>
            <p>✅ Role-based access control active</p>
            <p>✅ Password HIBP check enabled</p>
            <p>✅ Financial fields protected from client modification</p>
            <p>✅ Admin role escalation prevention in place</p>
          </div>
        </CardContent>
      </Card>

      {/* Assign Dialog */}
      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Admin Level</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Admin User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger><SelectValue placeholder="Select admin user" /></SelectTrigger>
                <SelectContent>
                  {adminUsers.map(u => (
                    <SelectItem key={u.user_id} value={u.user_id}>{u.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Admin Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ADMIN_ROLE_INFO).map(([key, info]) => (
                    <SelectItem key={key} value={key}>{info.label} — {info.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={assignAdminLevel}>Assign Level</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
