import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, QrCode, User, Loader2, Printer, CheckCircle, MapPin } from 'lucide-react';
import { PackageCard } from '@/components/PackageCard';
import { QRScanner } from '@/components/QRScanner';
import { PrinterDrawer } from '@/components/PrinterDrawer';
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

export default function AgentPickupDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const [agentRecord, setAgentRecord] = useState<{ id: string; business_name: string } | null>(null);
  const [packages, setPackages] = useState<AgentPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [printerOpen, setPrinterOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('expected');

  // Fetch agent record for this user
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

  // Fetch packages assigned to this agent's pickup point
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

  // Group packages by sender name
  const groupedBySender = useMemo(() => {
    const groups: Record<string, AgentPackage[]> = {};
    packages
      .filter(p => p.status === 'pending' || p.status === 'dropped_at_agent')
      .forEach(pkg => {
        const key = pkg.senderName;
        if (!groups[key]) groups[key] = [];
        groups[key].push(pkg);
      });
    return groups;
  }, [packages]);

  const droppedPackages = useMemo(
    () => packages.filter(p => p.status === 'dropped_at_agent'),
    [packages]
  );

  const collectedPackages = useMemo(
    () => packages.filter(p => !['pending', 'dropped_at_agent', 'cancelled'].includes(p.status)),
    [packages]
  );

  // Handle QR scan - change status to dropped_at_agent
  const handleScan = async (trackingNumber: string) => {
    setScannerOpen(false);
    
    const pkg = packages.find(
      p => p.trackingNumber.toLowerCase() === trackingNumber.toLowerCase()
    );

    if (!pkg) {
      toast.error('Package not found', {
        description: 'This package is not assigned to your pickup point.',
      });
      return;
    }

    if (pkg.pickupAgentId !== agentRecord?.id) {
      toast.error('Not authorized', {
        description: 'This package belongs to a different agent.',
      });
      return;
    }

    if (pkg.status !== 'pending') {
      toast.info('Already processed', {
        description: `This package is already "${pkg.status.replace(/_/g, ' ')}".`,
      });
      return;
    }

    try {
      setProcessingId(pkg.id);
      const { error } = await supabase
        .from('packages')
        .update({ status: 'dropped_at_agent' as PackageStatus })
        .eq('id', pkg.id);

      if (error) throw error;

      toast.success('Package received!', {
        description: `${pkg.trackingNumber} marked as dropped at your point. Receiver will be notified.`,
      });
    } catch (err) {
      toast.error('Failed to update package status');
    } finally {
      setProcessingId(null);
    }
  };

  // Redirect if not logged in
  if (!authLoading && !user) {
    return <Navigate to="/auth/login" replace />;
  }

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
              Your account is not linked to an agent pickup point. Contact an administrator to set up your location.
            </p>
            <Link to="/">
              <Button variant="outline" className="mt-6">Go Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const expectedCount = Object.values(groupedBySender).flat().length;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-hero text-primary-foreground">
        <div className="container py-6 px-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm opacity-80">Agent Point</p>
                <h1 className="font-display font-bold text-lg">{agentRecord.business_name}</h1>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => setPrinterOpen(true)}
              >
                <Printer className="w-5 h-5" />
              </Button>
              <Link to="/">
                <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
                  Home
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-primary-foreground/10 border-0 backdrop-blur-sm">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-display font-bold text-primary-foreground">{expectedCount}</p>
                <p className="text-xs text-primary-foreground/70">Expected</p>
              </CardContent>
            </Card>
            <Card className="bg-primary-foreground/10 border-0 backdrop-blur-sm">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-display font-bold text-primary-foreground">{droppedPackages.length}</p>
                <p className="text-xs text-primary-foreground/70">Dropped</p>
              </CardContent>
            </Card>
            <Card className="bg-primary-foreground/10 border-0 backdrop-blur-sm">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-display font-bold text-primary-foreground">{collectedPackages.length}</p>
                <p className="text-xs text-primary-foreground/70">Collected</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Scan Button */}
      <div className="container px-4 -mt-4">
        <Button
          variant="hero"
          className="w-full h-14 text-lg gap-3 shadow-xl"
          onClick={() => setScannerOpen(true)}
        >
          <QrCode className="w-6 h-6" />
          Scan Package QR Code
        </Button>
      </div>

      {/* Tabs */}
      <div className="container py-6 px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="expected" className="relative">
              Expected
              {expectedCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs rounded-full flex items-center justify-center">
                  {expectedCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="dropped">Dropped</TabsTrigger>
            <TabsTrigger value="collected">Collected</TabsTrigger>
          </TabsList>

          {/* Expected - grouped by sender */}
          <TabsContent value="expected" className="space-y-6">
            {Object.keys(groupedBySender).length > 0 ? (
              Object.entries(groupedBySender).map(([senderName, pkgs]) => (
                <div key={senderName}>
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-4 h-4 text-primary" />
                    <h3 className="font-display font-semibold text-sm">
                      {senderName} ({pkgs.length})
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {pkgs.map(pkg => (
                      <PackageCard key={pkg.id} pkg={pkg} showPrint>
                        {pkg.status === 'pending' && (
                          <p className="text-xs text-warning font-medium">⏳ Awaiting drop-off</p>
                        )}
                        {pkg.status === 'dropped_at_agent' && (
                          <p className="text-xs text-success font-medium">✓ Dropped at your point</p>
                        )}
                      </PackageCard>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No packages expected</p>
                  <p className="text-sm text-muted-foreground">Packages assigned to your point will appear here</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Dropped packages */}
          <TabsContent value="dropped" className="space-y-4">
            {droppedPackages.length > 0 ? (
              droppedPackages.map(pkg => (
                <PackageCard key={pkg.id} pkg={pkg} showPrint>
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Ready for collection by receiver</span>
                  </div>
                </PackageCard>
              ))
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No dropped packages</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Collected packages */}
          <TabsContent value="collected" className="space-y-4">
            {collectedPackages.length > 0 ? (
              collectedPackages.map(pkg => (
                <PackageCard key={pkg.id} pkg={pkg} showPrint />
              ))
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No collected packages yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* QR Scanner */}
      <QRScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
      />

      {/* Printer Drawer */}
      <PrinterDrawer
        open={printerOpen}
        onOpenChange={setPrinterOpen}
        onPrinterSelected={() => {
          setPrinterOpen(false);
          toast.success('Printer connected!');
        }}
      />

      <BottomNav />
    </div>
  );
}