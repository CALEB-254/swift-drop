import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { BottomNav } from '@/components/BottomNav';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard, Users, Package, DollarSign, Settings, HeadphonesIcon,
  Megaphone, Shield, Loader2, RefreshCw, Truck, Store, Bell, Search,
  MapPin, FileText, RotateCcw, Activity, Layers,
} from 'lucide-react';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { AdminUsers } from '@/components/admin/AdminUsers';
import { AdminOrders } from '@/components/admin/AdminOrders';
import { AdminFinance } from '@/components/admin/AdminFinance';
import { AdminRiders } from '@/components/admin/AdminRiders';
import { AdminVendors } from '@/components/admin/AdminVendors';
import { AdminAnalytics } from '@/components/admin/AdminAnalytics';
import { AdminConfig } from '@/components/admin/AdminConfig';
import { AdminSupport } from '@/components/admin/AdminSupport';
import { AdminPromos } from '@/components/admin/AdminPromos';
import { AdminSecurity } from '@/components/admin/AdminSecurity';
import { AdminNotifications } from '@/components/admin/AdminNotifications';
import { AdminGlobalSearch } from '@/components/admin/AdminGlobalSearch';
import { AdminZones } from '@/components/admin/AdminZones';
import { AdminAuditLogs } from '@/components/admin/AdminAuditLogs';
import { AdminRefunds } from '@/components/admin/AdminRefunds';
import { AdminSLA } from '@/components/admin/AdminSLA';
import { AdminBulkActions } from '@/components/admin/AdminBulkActions';

export interface AdminData {
  packages: any[];
  users: any[];
  agents: any[];
  tickets: any[];
  promos: any[];
  config: any[];
  adminLevel: string | null;
  stats: {
    totalPackages: number;
    totalUsers: number;
    totalAgents: number;
    totalRevenue: number;
    pendingPackages: number;
    deliveredPackages: number;
    cancelledPackages: number;
    inTransitPackages: number;
    totalCommissions: number;
    paidOrders: number;
    unpaidOrders: number;
  };
}

const TABS = [
  { value: 'overview', label: 'Overview', icon: LayoutDashboard, roles: ['super_admin', 'operations_admin', 'finance_admin', 'support_admin'] },
  { value: 'search', label: 'Search', icon: Search, roles: ['super_admin', 'operations_admin', 'finance_admin', 'support_admin'] },
  { value: 'users', label: 'Users', icon: Users, roles: ['super_admin', 'operations_admin'] },
  { value: 'orders', label: 'Orders', icon: Package, roles: ['super_admin', 'operations_admin'] },
  { value: 'finance', label: 'Finance', icon: DollarSign, roles: ['super_admin', 'finance_admin'] },
  { value: 'riders', label: 'Riders', icon: Truck, roles: ['super_admin', 'operations_admin'] },
  { value: 'vendors', label: 'Agents', icon: Store, roles: ['super_admin', 'operations_admin'] },
  { value: 'zones', label: 'Zones', icon: MapPin, roles: ['super_admin', 'operations_admin'] },
  { value: 'bulk', label: 'Bulk', icon: Layers, roles: ['super_admin', 'operations_admin'] },
  { value: 'sla', label: 'SLA', icon: Activity, roles: ['super_admin', 'operations_admin', 'finance_admin'] },
  { value: 'refunds', label: 'Refunds', icon: RotateCcw, roles: ['super_admin', 'finance_admin', 'support_admin'] },
  { value: 'notifications', label: 'Notify', icon: Bell, roles: ['super_admin', 'operations_admin'] },
  { value: 'support', label: 'Support', icon: HeadphonesIcon, roles: ['super_admin', 'support_admin'] },
  { value: 'promos', label: 'Promos', icon: Megaphone, roles: ['super_admin', 'finance_admin'] },
  { value: 'audit', label: 'Audit', icon: FileText, roles: ['super_admin'] },
  { value: 'config', label: 'Config', icon: Settings, roles: ['super_admin'] },
  { value: 'security', label: 'Security', icon: Shield, roles: ['super_admin'] },
];

export default function AdminDashboard() {
  const { signOut } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState<AdminData>({
    packages: [], users: [], agents: [], tickets: [], promos: [], config: [],
    adminLevel: null,
    stats: {
      totalPackages: 0, totalUsers: 0, totalAgents: 0, totalRevenue: 0,
      pendingPackages: 0, deliveredPackages: 0, cancelledPackages: 0,
      inTransitPackages: 0, totalCommissions: 0, paidOrders: 0, unpaidOrders: 0,
    },
  });

  useEffect(() => { fetchAllData(); }, []);

  const fetchAllData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const [pkgRes, profileRes, agentRes, ticketRes, promoRes, configRes, levelRes] = await Promise.all([
      supabase.from('packages').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('agents').select('*').order('created_at', { ascending: false }),
      supabase.from('support_tickets').select('*').order('created_at', { ascending: false }),
      supabase.from('promo_codes').select('*').order('created_at', { ascending: false }),
      supabase.from('system_config').select('*'),
      user ? supabase.from('admin_levels').select('admin_role').eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
    ]);

    const pkgs = pkgRes.data || [];
    const profiles = profileRes.data || [];
    const paidPkgs = pkgs.filter((p: any) => p.payment_status === 'paid');

    setData({
      packages: pkgs,
      users: profiles,
      agents: agentRes.data || [],
      tickets: ticketRes.data || [],
      promos: promoRes.data || [],
      config: configRes.data || [],
      adminLevel: levelRes.data?.admin_role || 'super_admin',
      stats: {
        totalPackages: pkgs.length,
        totalUsers: profiles.filter((p: any) => p.role === 'sender').length,
        totalAgents: (agentRes.data || []).length,
        totalRevenue: paidPkgs.reduce((sum: number, p: any) => sum + (p.cost || 0), 0),
        pendingPackages: pkgs.filter((p: any) => p.status === 'pending').length,
        deliveredPackages: pkgs.filter((p: any) => p.status === 'delivered').length,
        cancelledPackages: pkgs.filter((p: any) => p.status === 'cancelled').length,
        inTransitPackages: pkgs.filter((p: any) => p.status === 'in_transit').length,
        totalCommissions: paidPkgs.reduce((sum: number, p: any) => sum + (p.commission || 0), 0),
        paidOrders: paidPkgs.length,
        unpaidOrders: pkgs.filter((p: any) => p.payment_status !== 'paid').length,
      },
    });
    setLoading(false);
  };

  const canAccess = (roles: string[]) => {
    if (!data.adminLevel) return true;
    return roles.includes(data.adminLevel);
  };

  const visibleTabs = TABS.filter(t => canAccess(t.roles));

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
            <p className="text-primary-foreground/80 text-sm capitalize">
              {data.adminLevel?.replace('_', ' ') || 'Administrator'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={fetchAllData} className="text-primary-foreground hover:bg-primary-foreground/10">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-primary-foreground hover:bg-primary-foreground/10">
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto -mx-4 px-4 pb-2">
            <TabsList className="inline-flex w-auto min-w-full gap-1 bg-secondary/50">
              {visibleTabs.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="overview"><AdminOverview data={data} onRefresh={fetchAllData} /></TabsContent>
          <TabsContent value="search"><AdminGlobalSearch data={data} /></TabsContent>
          <TabsContent value="users"><AdminUsers data={data} onRefresh={fetchAllData} /></TabsContent>
          <TabsContent value="orders"><AdminOrders data={data} onRefresh={fetchAllData} /></TabsContent>
          <TabsContent value="finance"><AdminFinance data={data} onRefresh={fetchAllData} /></TabsContent>
          <TabsContent value="riders"><AdminRiders data={data} onRefresh={fetchAllData} /></TabsContent>
          <TabsContent value="vendors"><AdminVendors data={data} onRefresh={fetchAllData} /></TabsContent>
          <TabsContent value="zones"><AdminZones data={data} onRefresh={fetchAllData} /></TabsContent>
          <TabsContent value="bulk"><AdminBulkActions data={data} onRefresh={fetchAllData} /></TabsContent>
          <TabsContent value="sla"><AdminSLA data={data} onRefresh={fetchAllData} /></TabsContent>
          <TabsContent value="refunds"><AdminRefunds data={data} onRefresh={fetchAllData} /></TabsContent>
          <TabsContent value="notifications"><AdminNotifications data={data} onRefresh={fetchAllData} /></TabsContent>
          <TabsContent value="support"><AdminSupport data={data} onRefresh={fetchAllData} /></TabsContent>
          <TabsContent value="promos"><AdminPromos data={data} onRefresh={fetchAllData} /></TabsContent>
          <TabsContent value="audit"><AdminAuditLogs data={data} onRefresh={fetchAllData} /></TabsContent>
          <TabsContent value="config"><AdminConfig data={data} onRefresh={fetchAllData} /></TabsContent>
          <TabsContent value="security"><AdminSecurity data={data} onRefresh={fetchAllData} /></TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
}
