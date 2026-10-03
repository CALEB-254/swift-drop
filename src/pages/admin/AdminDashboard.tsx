import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard, Users, Package, DollarSign, Settings, HeadphonesIcon,
  Megaphone, Shield, Loader2, RefreshCw, Truck, Store, Bell, Search,
  MapPin, FileText, RotateCcw, Activity, Layers, Menu, LogOut,
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
import { AdminCouriers } from '@/components/admin/AdminCouriers';
import { AdminCashCollections } from '@/components/admin/AdminCashCollections';
import { ThemeToggle } from '@/components/ThemeToggle';

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
  { value: 'couriers', label: 'Couriers', icon: Truck, roles: ['super_admin', 'operations_admin'] },
  { value: 'bulk', label: 'Bulk', icon: Layers, roles: ['super_admin', 'operations_admin'] },
  { value: 'sla', label: 'SLA', icon: Activity, roles: ['super_admin', 'operations_admin', 'finance_admin'] },
  { value: 'cash', label: 'Cash', icon: DollarSign, roles: ['super_admin', 'finance_admin', 'operations_admin'] },
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
  const [menuOpen, setMenuOpen] = useState(false);
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
    <div className="min-h-screen bg-background lg:flex">
      <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value); setMenuOpen(false); }} className="contents">
        {menuOpen && <div className="fixed inset-0 z-40 bg-background/80 lg:hidden" onClick={() => setMenuOpen(false)} />}
        <aside className={`${menuOpen ? 'flex' : 'hidden'} fixed inset-y-0 left-0 z-50 w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:flex lg:h-screen lg:shrink-0`}>
          <div className="flex h-20 items-center gap-3 border-b border-sidebar-border px-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary"><Package className="h-6 w-6" /></div>
            <div><p className="text-lg font-bold leading-tight">Swift<span className="text-primary">Drop</span></p><p className="text-[10px] text-muted-foreground">fast &amp; reliable delivery</p></div>
          </div>
          <TabsList className="h-auto w-full flex-1 flex-col items-stretch justify-start gap-0.5 overflow-y-auto rounded-none bg-transparent p-3 text-sidebar-foreground">
            {visibleTabs.map((tab, index) => (
              <div key={tab.value}>
                {(index === 0 || index === 1 || index === 5 || index === 15) && <p className="px-3 pb-2 pt-4 text-[10px] font-semibold uppercase text-muted-foreground">{index === 0 ? 'Home' : index === 1 ? 'Operations' : index === 5 ? 'Finance & delivery' : 'Management'}</p>}
                <TabsTrigger value={tab.value} className="w-full justify-start gap-3 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground/80 data-[state=active]:bg-primary/25 data-[state=active]:text-foreground data-[state=active]:shadow-none">
                  <tab.icon className="h-4 w-4" />{tab.label === 'Overview' ? 'Dashboard' : tab.label === 'Notify' ? 'Notifications' : tab.label}
                </TabsTrigger>
              </div>
            ))}
          </TabsList>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur-sm md:px-6">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu /></Button>
            <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex"><Search className="h-4 w-4" /><span>SwiftDrop operations</span></div>
            <div className="ml-auto flex items-center gap-1">
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={fetchAllData} aria-label="Refresh dashboard"><RefreshCw /></Button>
              <span className="mx-2 hidden text-sm font-medium capitalize sm:inline">{data.adminLevel?.replace('_', ' ') || 'Administrator'}</span>
              <Button variant="ghost" size="icon" onClick={signOut} aria-label="Log out"><LogOut /></Button>
            </div>
          </header>
          <main className="mx-auto max-w-[1600px] space-y-5 px-4 py-5 md:px-6">
            <div className="gradient-hero rounded-lg border border-primary/20 px-5 py-5 md:px-7">
              <h1 className="text-xl font-semibold">{activeTab === 'overview' ? 'Good day, Admin 👋' : visibleTabs.find(t => t.value === activeTab)?.label || 'Admin Dashboard'}</h1>
              {activeTab === 'overview' && <p className="mt-1 text-sm text-muted-foreground">Here’s what’s happening with your SwiftDrop delivery operations today.</p>}
            </div>

          <TabsContent value="overview"><AdminOverview data={data} onRefresh={fetchAllData} /></TabsContent>
          <TabsContent value="search"><AdminGlobalSearch data={data} /></TabsContent>
          <TabsContent value="users"><AdminUsers data={data} onRefresh={fetchAllData} adminLevel={data.adminLevel} /></TabsContent>
          <TabsContent value="orders"><AdminOrders data={data} onRefresh={fetchAllData} /></TabsContent>
          <TabsContent value="finance"><AdminFinance data={data} onRefresh={fetchAllData} /></TabsContent>
          <TabsContent value="riders"><AdminRiders data={data} onRefresh={fetchAllData} /></TabsContent>
          <TabsContent value="vendors"><AdminVendors data={data} onRefresh={fetchAllData} /></TabsContent>
          <TabsContent value="zones"><AdminZones data={data} onRefresh={fetchAllData} /></TabsContent>
          <TabsContent value="couriers"><AdminCouriers /></TabsContent>
          <TabsContent value="bulk"><AdminBulkActions data={data} onRefresh={fetchAllData} /></TabsContent>
          <TabsContent value="sla"><AdminSLA data={data} onRefresh={fetchAllData} /></TabsContent>
          <TabsContent value="cash"><AdminCashCollections /></TabsContent>
          <TabsContent value="refunds"><AdminRefunds data={data} onRefresh={fetchAllData} /></TabsContent>
          <TabsContent value="notifications"><AdminNotifications data={data} onRefresh={fetchAllData} /></TabsContent>
          <TabsContent value="support"><AdminSupport data={data} onRefresh={fetchAllData} /></TabsContent>
          <TabsContent value="promos"><AdminPromos data={data} onRefresh={fetchAllData} /></TabsContent>
          <TabsContent value="audit"><AdminAuditLogs data={data} onRefresh={fetchAllData} /></TabsContent>
          <TabsContent value="config"><AdminConfig data={data} onRefresh={fetchAllData} /></TabsContent>
          <TabsContent value="security"><AdminSecurity data={data} onRefresh={fetchAllData} /></TabsContent>
          </main>
        </div>
      </Tabs>
    </div>
  );
}
