import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BottomNav } from '@/components/BottomNav';
import { StatusBadge } from '@/components/StatusBadge';
import { PackageQRCode } from '@/components/PackageQRCode';
import { PrintReceiptButton } from '@/components/PrintReceiptButton';
import { DownloadReceiptButton } from '@/components/DownloadReceiptButton';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  Package,
  Users,
  MapPin,
  DollarSign,
  Loader2,
  Plus,
  Edit,
  QrCode,
  Search,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { STATUS_LABELS, PackageStatus } from '@/types/delivery';

interface Stats {
  totalPackages: number;
  totalUsers: number;
  totalAgents: number;
  totalRevenue: number;
  pendingPackages: number;
  deliveredPackages: number;
}

interface PackageRow {
  id: string;
  tracking_number: string;
  sender_name: string;
  sender_phone: string;
  sender_address: string | null;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  delivery_type: string;
  pickup_point: string | null;
  package_description: string | null;
  package_value: number | null;
  weight: number | null;
  status: string;
  cost: number;
  payment_status: string;
  mpesa_receipt_number: string | null;
  created_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string;
  phone: string;
  role: string;
  address: string | null;
  created_at: string;
  user_id: string;
}

interface AgentRow {
  id: string;
  user_id: string;
  business_name: string;
  location: string;
  phone: string;
  address: string | null;
  is_active: boolean | null;
  operating_hours: string | null;
  services: string[] | null;
  created_at: string;
}

export default function AdminDashboard() {
  const { signOut } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalPackages: 0, totalUsers: 0, totalAgents: 0,
    totalRevenue: 0, pendingPackages: 0, deliveredPackages: 0,
  });
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedQR, setExpandedQR] = useState<string | null>(null);

  // Edit package dialog
  const [editPkg, setEditPkg] = useState<PackageRow | null>(null);
  const [editForm, setEditForm] = useState({ status: '', receiver_name: '', receiver_address: '', cost: '' });

  // New pickup point dialog
  const [showNewAgent, setShowNewAgent] = useState(false);
  const [agentForm, setAgentForm] = useState({
    business_name: '', location: '', phone: '', address: '', operating_hours: '',
    tracking_prefix: 'D01',
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: pkgData }, { data: profilesData }, { data: agentsData }] = await Promise.all([
      supabase.from('packages').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('agents').select('*').order('created_at', { ascending: false }),
    ]);

    if (pkgData) {
      setPackages(pkgData);
      const paidPkgs = pkgData.filter(p => p.payment_status === 'paid');
      setStats(prev => ({
        ...prev,
        totalPackages: pkgData.length,
        totalRevenue: paidPkgs.reduce((sum, p) => sum + (p.cost || 0), 0),
        pendingPackages: pkgData.filter(p => p.status === 'pending').length,
        deliveredPackages: pkgData.filter(p => p.status === 'delivered').length,
      }));
    }
    if (profilesData) {
      setUsers(profilesData);
      setStats(prev => ({
        ...prev,
        totalUsers: profilesData.filter(p => p.role === 'sender').length,
        totalAgents: profilesData.filter(p => p.role === 'agent').length,
      }));
    }
    if (agentsData) setAgents(agentsData);
    setLoading(false);
  };

  const openEditPkg = (pkg: PackageRow) => {
    setEditPkg(pkg);
    setEditForm({
      status: pkg.status,
      receiver_name: pkg.receiver_name,
      receiver_address: pkg.receiver_address,
      cost: pkg.cost.toString(),
    });
  };

  const saveEditPkg = async () => {
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
    fetchData();
  };

  const createAgentPickupPoint = async () => {
    if (!agentForm.business_name || !agentForm.location || !agentForm.phone) {
      toast.error('Fill required fields');
      return;
    }
    // For admin-created pickup points, we use the admin's user_id or a placeholder
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('agents').insert({
      user_id: user.id,
      business_name: agentForm.business_name,
      location: agentForm.location,
      phone: agentForm.phone,
      address: agentForm.address || null,
      operating_hours: agentForm.operating_hours || null,
      services: [`tracking_prefix:${agentForm.tracking_prefix}`],
    });

    if (error) { toast.error(error.message); return; }
    toast.success('Pickup point created!');
    setShowNewAgent(false);
    setAgentForm({ business_name: '', location: '', phone: '', address: '', operating_hours: '', tracking_prefix: 'D01' });
    fetchData();
  };

  const deleteAgent = async (id: string) => {
    const { error } = await supabase.from('agents').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Pickup point removed');
    fetchData();
  };

  const filteredPackages = packages.filter(p =>
    !searchQuery ||
    p.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sender_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.receiver_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="gradient-hero px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-primary-foreground">Admin Dashboard</h1>
            <p className="text-primary-foreground/80 text-sm">Manage your delivery platform</p>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="text-primary-foreground hover:bg-primary-foreground/10">
            Logout
          </Button>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-0 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalPackages}</p>
                  <p className="text-xs text-muted-foreground">Total Packages</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">KES {stats.totalRevenue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  <p className="text-xs text-muted-foreground">Senders</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalAgents}</p>
                  <p className="text-xs text-muted-foreground">Agents</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="packages" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="packages">Packages</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="pickups">Pickup Points</TabsTrigger>
          </TabsList>

          {/* PACKAGES TAB */}
          <TabsContent value="packages" className="mt-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search packages..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Button variant="outline" size="icon" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
            </div>

            {filteredPackages.map((pkg) => (
              <Card key={pkg.id} className="border-0 shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-sm font-medium">{pkg.tracking_number}</p>
                      <p className="text-sm text-muted-foreground">{pkg.sender_name} → {pkg.receiver_name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(pkg.created_at), 'MMM d, yyyy')}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <StatusBadge status={pkg.status as any} />
                      <p className="text-sm font-medium">KES {pkg.cost}</p>
                      <span className={`text-xs ${pkg.payment_status === 'paid' ? 'text-primary' : 'text-muted-foreground'}`}>
                        {pkg.payment_status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setExpandedQR(expandedQR === pkg.id ? null : pkg.id)}>
                        <QrCode className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditPkg(pkg)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <DownloadReceiptButton pkg={{
                        trackingNumber: pkg.tracking_number,
                        senderName: pkg.sender_name,
                        senderPhone: pkg.sender_phone,
                        senderAddress: pkg.sender_address,
                        receiverName: pkg.receiver_name,
                        receiverPhone: pkg.receiver_phone,
                        receiverAddress: pkg.receiver_address,
                        deliveryType: pkg.delivery_type,
                        pickupPoint: pkg.pickup_point,
                        packageDescription: pkg.package_description,
                        packageValue: pkg.package_value,
                        weight: pkg.weight,
                        cost: pkg.cost,
                        createdAt: new Date(pkg.created_at),
                        paymentStatus: pkg.payment_status,
                        mpesaReceiptNumber: pkg.mpesa_receipt_number,
                      }} />
                      <PrintReceiptButton pkg={{
                        trackingNumber: pkg.tracking_number,
                        senderName: pkg.sender_name,
                        senderPhone: pkg.sender_phone,
                        receiverName: pkg.receiver_name,
                        receiverPhone: pkg.receiver_phone,
                        receiverAddress: pkg.receiver_address,
                        deliveryType: pkg.delivery_type,
                        pickupPoint: pkg.pickup_point,
                        packageDescription: pkg.package_description,
                        cost: pkg.cost,
                        createdAt: new Date(pkg.created_at),
                        paymentStatus: pkg.payment_status,
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
          </TabsContent>

          {/* USERS TAB */}
          <TabsContent value="users" className="mt-4 space-y-3">
            {users.map((user) => (
              <Card key={user.id} className="border-0 shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{user.full_name}</p>
                      <p className="text-sm text-muted-foreground">{user.phone}</p>
                      <p className="text-xs text-muted-foreground">Joined {format(new Date(user.created_at), 'MMM d, yyyy')}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                      user.role === 'agent' ? 'bg-warning/10 text-warning'
                      : user.role === 'admin' ? 'bg-primary/10 text-primary'
                      : 'bg-info/10 text-info'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* PICKUP POINTS TAB */}
          <TabsContent value="pickups" className="mt-4 space-y-3">
            <Button className="w-full gap-2" onClick={() => setShowNewAgent(true)}>
              <Plus className="w-4 h-4" /> Create Pickup Point
            </Button>

            {agents.map((agent) => {
              const prefix = agent.services?.find(s => s.startsWith('tracking_prefix:'))?.split(':')[1] || 'D01';
              return (
                <Card key={agent.id} className="border-0 shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{agent.business_name}</p>
                        <p className="text-sm text-muted-foreground">{agent.location}</p>
                        <p className="text-xs text-muted-foreground">{agent.phone}</p>
                        {agent.operating_hours && <p className="text-xs text-muted-foreground">{agent.operating_hours}</p>}
                        <p className="text-xs font-mono mt-1">Pattern: SWF-{prefix}-XXXX</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${agent.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                          {agent.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => deleteAgent(agent.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {agents.length === 0 && (
              <Card className="border-0 shadow-card">
                <CardContent className="py-12 text-center">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No pickup points yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Package Dialog */}
      <Dialog open={!!editPkg} onOpenChange={(open) => !open && setEditPkg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Package - {editPkg?.tracking_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm(prev => ({ ...prev, status: v }))}>
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
              <Input value={editForm.receiver_name} onChange={e => setEditForm(prev => ({ ...prev, receiver_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Receiver Address</Label>
              <Input value={editForm.receiver_address} onChange={e => setEditForm(prev => ({ ...prev, receiver_address: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Cost (KES)</Label>
              <Input type="number" value={editForm.cost} onChange={e => setEditForm(prev => ({ ...prev, cost: e.target.value }))} />
            </div>
            <Button className="w-full gap-2" onClick={saveEditPkg}>
              <Save className="w-4 h-4" /> Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Pickup Point Dialog */}
      <Dialog open={showNewAgent} onOpenChange={setShowNewAgent}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Agent Pickup Point</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Business Name *</Label>
              <Input value={agentForm.business_name} onChange={e => setAgentForm(prev => ({ ...prev, business_name: e.target.value }))} placeholder="e.g. Central Hub Downtown" />
            </div>
            <div className="space-y-2">
              <Label>Location *</Label>
              <Input value={agentForm.location} onChange={e => setAgentForm(prev => ({ ...prev, location: e.target.value }))} placeholder="e.g. Nairobi CBD" />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input value={agentForm.phone} onChange={e => setAgentForm(prev => ({ ...prev, phone: e.target.value }))} placeholder="+254..." />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={agentForm.address} onChange={e => setAgentForm(prev => ({ ...prev, address: e.target.value }))} placeholder="Full address" />
            </div>
            <div className="space-y-2">
              <Label>Operating Hours</Label>
              <Input value={agentForm.operating_hours} onChange={e => setAgentForm(prev => ({ ...prev, operating_hours: e.target.value }))} placeholder="e.g. Mon-Sat 8AM-6PM" />
            </div>
            <div className="space-y-2">
              <Label>Tracking Number Pattern</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-muted-foreground">SWF-</span>
                <Input value={agentForm.tracking_prefix} onChange={e => setAgentForm(prev => ({ ...prev, tracking_prefix: e.target.value.toUpperCase() }))} className="w-24 font-mono" maxLength={4} placeholder="D01" />
                <span className="text-sm font-mono text-muted-foreground">-XXXX</span>
              </div>
              <p className="text-xs text-muted-foreground">This prefix will identify packages for this agent</p>
            </div>
            <Button className="w-full gap-2" onClick={createAgentPickupPoint}>
              <Plus className="w-4 h-4" /> Create Pickup Point
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
