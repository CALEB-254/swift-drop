import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Truck, DollarSign, CheckCircle, TrendingUp, User, Loader2 } from 'lucide-react';
import { PackageCard } from '@/components/PackageCard';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { useAgentPackages } from '@/hooks/useAgentPackages';
import { toast } from 'sonner';

export default function AgentDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const {
    availablePackages,
    activePackages,
    completedPackages,
    stats,
    loading,
    acceptPackage,
    updatePackageStatus,
    getNextStatus,
  } = useAgentPackages();
  
  const [activeTab, setActiveTab] = useState('available');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Redirect if not logged in or not an agent
  if (!authLoading && !user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!authLoading && profile?.role !== 'agent') {
    return <Navigate to="/sender" replace />;
  }

  const handleAcceptPackage = async (packageId: string) => {
    try {
      setProcessingId(packageId);
      await acceptPackage(packageId);
      toast.success('Package accepted successfully!');
      setActiveTab('active');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to accept package');
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateStatus = async (packageId: string, status: string) => {
    try {
      setProcessingId(packageId);
      await updatePackageStatus(packageId, status as any);
      toast.success(`Status updated to ${status.replace(/_/g, ' ')}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setProcessingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-hero text-primary-foreground">
        <div className="container py-6 px-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm opacity-80">Welcome back,</p>
                <h1 className="font-display font-bold text-lg">{profile?.full_name || 'Agent'}</h1>
              </div>
            </div>
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
                Switch App
              </Button>
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-primary-foreground/10 border-0 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-foreground/20 rounded-lg">
                    <Truck className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold text-primary-foreground">
                      {stats.activeDeliveries}
                    </p>
                    <p className="text-xs text-primary-foreground/70">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-primary-foreground/10 border-0 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-foreground/20 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold text-primary-foreground">
                      {stats.completedDeliveries}
                    </p>
                    <p className="text-xs text-primary-foreground/70">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Commission Card */}
      <div className="container px-4 -mt-4">
        <Card className="border-0 shadow-xl bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 gradient-accent rounded-xl">
                  <DollarSign className="w-6 h-6 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Commission</p>
                  <p className="font-display text-2xl font-bold text-foreground">
                    KES {stats.totalCommission.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="font-display font-bold text-success">
                  KES {stats.pendingCommission.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4 text-success" />
              <span>15% commission on each delivery</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="container py-6 px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="available" className="relative">
              Available
              {availablePackages.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs rounded-full flex items-center justify-center">
                  {availablePackages.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          {/* Available Packages */}
          <TabsContent value="available" className="space-y-4">
            {availablePackages.length > 0 ? (
              availablePackages.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg}>
                  <Button
                    variant="hero"
                    className="w-full"
                    onClick={() => handleAcceptPackage(pkg.id)}
                    disabled={processingId === pkg.id}
                  >
                    {processingId === pkg.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Accept Delivery
                  </Button>
                </PackageCard>
              ))
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No packages available</p>
                  <p className="text-sm text-muted-foreground">Check back later for new deliveries</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Active Packages */}
          <TabsContent value="active" className="space-y-4">
            {activePackages.length > 0 ? (
              activePackages.map((pkg) => {
                const nextStatus = getNextStatus(pkg.status);
                return (
                  <PackageCard key={pkg.id} pkg={pkg}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Current Status</span>
                        <StatusBadge status={pkg.status} />
                      </div>
                      {nextStatus && (
                        <Button
                          variant="hero"
                          className="w-full"
                          onClick={() => handleUpdateStatus(pkg.id, nextStatus)}
                          disabled={processingId === pkg.id}
                        >
                          {processingId === pkg.id ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : null}
                          Mark as {nextStatus.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => handleUpdateStatus(pkg.id, 'cancelled')}
                        disabled={processingId === pkg.id}
                      >
                        Cancel Delivery
                      </Button>
                    </div>
                  </PackageCard>
                );
              })
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Truck className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No active deliveries</p>
                  <p className="text-sm text-muted-foreground">Accept packages from the Available tab</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Completed Packages */}
          <TabsContent value="completed" className="space-y-4">
            {completedPackages.length > 0 ? (
              completedPackages.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Commission Earned</span>
                    <span className="font-display font-bold text-success">
                      KES {(pkg.commission || 0).toLocaleString()}
                    </span>
                  </div>
                </PackageCard>
              ))
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No completed deliveries yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
