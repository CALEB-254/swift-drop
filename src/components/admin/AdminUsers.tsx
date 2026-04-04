import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, UserCheck, UserX, Eye, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { AdminData } from '@/pages/admin/AdminDashboard';

interface Props { data: AdminData; onRefresh: () => void; }

export function AdminUsers({ data, onRefresh }: Props) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const filtered = data.users.filter(u => {
    const matchesSearch = !search || 
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.phone.includes(search);
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getUserPackageCount = (userId: string) => data.packages.filter(p => p.user_id === userId).length;

  const updateUserRole = async (userId: string, newRole: string) => {
    // Only admins can change roles — update via user_roles table
    const { error: roleError } = await supabase.from('user_roles').upsert(
      { user_id: userId, role: newRole as any },
      { onConflict: 'user_id,role' }
    );
    if (roleError) {
      toast.error('Failed to update role: ' + roleError.message);
      return;
    }
    toast.success('User role updated');
    onRefresh();
  };

  return (
    <div className="space-y-3 mt-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="sender">Senders</SelectItem>
            <SelectItem value="agent">Agents</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} users found</p>

      {filtered.map(user => (
        <Card key={user.id} className="border-0 shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium">{user.full_name}</p>
                <p className="text-sm text-muted-foreground">{user.phone}</p>
                <p className="text-xs text-muted-foreground">
                  Joined {format(new Date(user.created_at), 'MMM d, yyyy')} · {getUserPackageCount(user.user_id)} packages
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                  user.role === 'agent' ? 'bg-warning/10 text-warning'
                  : user.role === 'admin' ? 'bg-primary/10 text-primary'
                  : 'bg-info/10 text-info'
                }`}>
                  {user.role}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setSelectedUser(user)}>
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={open => !open && setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-lg font-medium">{selectedUser.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedUser.phone}</p>
                {selectedUser.address && <p className="text-sm text-muted-foreground">{selectedUser.address}</p>}
                <p className="text-xs text-muted-foreground">
                  Joined {format(new Date(selectedUser.created_at), 'PPP')}
                </p>
              </div>
              
              <div>
                <Label className="text-xs">Change Role</Label>
                <div className="flex gap-2 mt-1">
                  {['sender', 'agent', 'admin'].map(role => (
                    <Button
                      key={role}
                      variant={selectedUser.role === role ? 'default' : 'outline'}
                      size="sm"
                      className="capitalize"
                      onClick={() => updateUserRole(selectedUser.user_id, role)}
                    >
                      {role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                      {role}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium">Package History</p>
                <p className="text-xs text-muted-foreground">
                  {getUserPackageCount(selectedUser.user_id)} total packages
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
