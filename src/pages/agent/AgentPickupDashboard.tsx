import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Package, QrCode, User, Loader2, MapPin, Search,
  ArrowDownToLine, ArrowUpFromLine, Truck, PackageOpen, Clock, PackageCheck,
} from 'lucide-react';
import { PackageCard } from '@/components/PackageCard';
import { QRScanner } from '@/components/QRScanner';
import { BottomNav } from '@/components/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';
import { DeliveryType } from '@/types/delivery';

type PackageRow = Database['public']['Tables']['packages']['Row'];
type PackageStatus = Database['public']['Enums']['package_status'];

interface AgentPackage {
  id: string;
  trackingNumber: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string | null;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  deliveryType: DeliveryType;
  pickupPoint: string | null;
  packageDescription: string | null;
  packageValue: number | null;
  weight: number;
  cost: number;
  status: PackageStatus;
  createdAt: Date;
  pickupAgentId: string | null;
}

const mapRow = (row: PackageRow): AgentPackage => ({
  id: row.id,
  trackingNumber: row.tracking_number,
  senderName: row.sender_name,
  senderPhone: row.sender_phone,
  senderAddress: row.sender_address,
  receiverName: row.receiver_name,
  receiverPhone: row.receiver_phone,
  receiverAddress: row.receiver_address,
  deliveryType: row.delivery_type as DeliveryType,
  pickupPoint: row.pickup_point,
  packageDescription: row.package_description,
  packageValue: row.package_value ? Number(row.package_value) : null,
  weight: row.weight ? Number(row.weight) : 0,
  cost: Number(row.cost),
  status: row.status,
  createdAt: new Date(row.created_at),
  pickupAgentId: row.pickup_agent_id,
});

interface ActionCardProps {
  icon: React.ReactNode;
  label: string;
  count?: number;
  onClick?: () => void;
}

function ActionCard({ icon, label, count, onClick }: ActionCardProps) {
  return (
    <Card
      className="border border-border shadow-card cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center">
          {icon}
        </div>
        <p className="font-display text-sm font-semibold text-center leading-tight">{label}</p>
        {count !== undefined && (
          <span className="text-xs text-muted-foreground">{count} packages</span>
        )}
      </CardContent>
    </Card>
  );
}

export default function AgentPickupDashboard() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [agentRecord, setAgentRecord] = useState<{ id: string; business_name: string } | null>(null);
  const [packages, setPackages] = useState<AgentPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('packages');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<string | null>(null);

  // Fetch agent record
  useEffect(() => {
    if (!user) return;
    const fetchAgent = async () => {
      const { data } = await supabase
        .from('agents')
        .select('id, business_name')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      setAgentRecord(data);
      if (!data) setLoading(false);
    };
    fetchAgent();
  }, [user]);

  const fetchPackages = useCallback(async () => {
    if (!agentRecord) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('pickup_agent_id', agentRecord.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPackages((data || []).map(mapRow));
    } catch (err) {
      console.error('Error fetching packages:', err);
    } finally {
      setLoading(false);
    }
  }, [agentRecord]);

  useEffect(() => {
    if (!agentRecord) return;
    fetchPackages();
    const channel = supabase
      .channel('agent-pickup-packages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'packages' }, () => {
        fetchPackages();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [agentRecord, fetchPackages]);

  // Categorized packages
  const pendingPackages = useMemo(() => packages.filter(p => p.status === 'pending'), [packages]);
  const droppedPackages = useMemo(() => packages.filter(p => p.status === 'dropped_at_agent'), [packages]);
  const collectedPackages = useMemo(
    () => packages.filter(p => !['pending', 'dropped_at_agent', 'cancelled'].includes(p.status)),
    [packages]
  );
  const doorstepPackages = useMemo(
    () => packages.filter(p => p.deliveryType === 'doorstep' && (p.status === 'pending' || p.status === 'dropped_at_agent')),
    [packages]
  );

  // Search filter
  const filterBySearch = useCallback((pkgs: AgentPackage[]) => {
    if (!searchQuery.trim()) return pkgs;
    const q = searchQuery.toLowerCase();
    return pkgs.filter(p =>
      p.trackingNumber.toLowerCase().includes(q) ||
      p.senderName.toLowerCase().includes(q) ||
      p.receiverName.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // QR scan handler
  const handleScan = async (trackingNumber: string) => {
    setScannerOpen(false);
    const pkg = packages.find(p => p.trackingNumber.toLowerCase() === trackingNumber.toLowerCase());
    if (!pkg) {
      toast.error('Package not found', { description: 'This package is not assigned to your pickup point.' });
      return;
    }
    if (pkg.pickupAgentId !== agentRecord?.id) {
      toast.error('Not authorized', { description: 'This package belongs to a different agent.' });
      return;
    }
    if (pkg.status !== 'pending') {
      toast.info('Already processed', { description: `This package is already "${pkg.status.replace(/_/g, ' ')}".` });
      return;
    }
    try {
      const { error } = await supabase
        .from('packages')
        .update({ status: 'dropped_at_agent' as PackageStatus })
        .eq('id', pkg.id);
      if (error) throw error;
      toast.success('Package received!', { description: `${pkg.trackingNumber} marked as dropped at your point.` });
    } catch {
      toast.error('Failed to update package status');
    }
  };

  if (!authLoading && !user) return <Navigate to="/auth/login" replace />;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!agentRecord) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="border-0 shadow-card max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12">
            <MapPin className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="font-display text-xl font-bold mb-2">No Agent Point Found</h2>
            <p className="text-muted-foreground text-center">
              Your account is not linked to an agent pickup point. Contact an administrator.
            </p>
            <Link to="/"><Button variant="outline" className="mt-6">Go Home</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render a list view for a category
  if (activeView) {
    const viewMap: Record<string, { title: string; pkgs: AgentPackage[] }> = {
      pickup: { title: 'Pickup from Sender', pkgs: filterBySearch(pendingPackages) },
      give: { title: 'Give to Customer', pkgs: filterBySearch(droppedPackages) },
      doorstep: { title: 'Doorstep Packages', pkgs: filterBySearch(doorstepPackages) },
      collected: { title: 'Collected Packages', pkgs: filterBySearch(collectedPackages) },
      uncollected: { title: 'Uncollected Packages', pkgs: filterBySearch(droppedPackages) },
    };
    const view = viewMap[activeView] || { title: 'Packages', pkgs: [] };

    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="gradient-hero px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => setActiveView(null)}>
              <ArrowDownToLine className="w-5 h-5 rotate-90" />
            </Button>
            <h1 className="font-display text-lg font-bold text-primary-foreground">{view.title}</h1>
          </div>
        </div>
        <div className="px-4 py-4 space-y-3">
          {view.pkgs.length > 0 ? (
            view.pkgs.map(pkg => <PackageCard key={pkg.id} pkg={pkg} showPrint />)
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-12">
                <Package className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No packages found</p>
              </CardContent>
            </Card>
          )}
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Search Bar */}
      <div className="px-4 pt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Find package"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 h-12 rounded-xl bg-card border shadow-card"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >✕</button>
          )}
        </div>
      </div>

      {/* Welcome Section */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-end justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Welcome,</p>
              <h1 className="font-display text-xl font-bold">{profile?.full_name || 'Agent'}</h1>
            </div>
          </div>
          <button
            onClick={() => setScannerOpen(true)}
            className="w-14 h-14 rounded-xl border-2 border-border flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <QrCode className="w-7 h-7 text-foreground" />
          </button>
        </div>
        <p className="text-muted-foreground mt-3">Here are your packages today.</p>
      </div>

      {/* Tabs */}
      <div className="px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="packages">Packages</TabsTrigger>
            <TabsTrigger value="shelf">Shelf packages</TabsTrigger>
          </TabsList>

          {/* Packages Tab - Action Cards Grid */}
          <TabsContent value="packages">
            <div className="grid grid-cols-2 gap-4">
              <ActionCard
                icon={<ArrowDownToLine className="w-8 h-8 text-primary" />}
                label="Pickup from sender"
                count={pendingPackages.length}
                onClick={() => setActiveView('pickup')}
              />
              <ActionCard
                icon={<ArrowUpFromLine className="w-8 h-8 text-primary" />}
                label="Give to customer"
                count={droppedPackages.length}
                onClick={() => setActiveView('give')}
              />
              <ActionCard
                icon={<Truck className="w-8 h-8 text-primary" />}
                label="Doorstep packages"
                count={doorstepPackages.length}
                onClick={() => setActiveView('doorstep')}
              />
              <ActionCard
                icon={<PackageOpen className="w-8 h-8 text-primary" />}
                label="Collected packages"
                count={collectedPackages.length}
                onClick={() => setActiveView('collected')}
              />
              <ActionCard
                icon={<Clock className="w-8 h-8 text-warning" />}
                label="Uncollected packages"
                count={droppedPackages.length}
                onClick={() => setActiveView('uncollected')}
              />
            </div>
          </TabsContent>

          {/* Shelf Tab - Dropped packages ready for pickup */}
          <TabsContent value="shelf" className="space-y-3">
            {droppedPackages.length > 0 ? (
              droppedPackages.map(pkg => (
                <PackageCard key={pkg.id} pkg={pkg} showPrint>
                  <p className="text-xs text-primary font-medium">✓ On shelf — awaiting collection</p>
                </PackageCard>
              ))
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center py-12">
                  <Package className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No packages on shelf</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <QRScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleScan} />
      <BottomNav />
    </div>
  );
}
