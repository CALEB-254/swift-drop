import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePackages, Package } from '@/hooks/usePackages';
import { useAuthContext } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BottomNav } from '@/components/BottomNav';
import { HelpButton } from '@/components/HelpButton';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Search,
  Package as PackageIcon,
  Plus,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { STATUS_LABELS, DELIVERY_TYPES, PackageStatus } from '@/types/delivery';

const STATUS_FILTERS: { value: PackageStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'picked_up', label: 'Picked Up' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function SenderDashboard() {
  const { packages, loading, refetch } = usePackages();
  const { profile, signOut } = useAuthContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PackageStatus | 'all'>('all');

  // Filter packages based on search and status
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const matchesSearch =
        searchQuery === '' ||
        pkg.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.receiverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.receiverPhone.includes(searchQuery);

      const matchesStatus = statusFilter === 'all' || pkg.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [packages, searchQuery, statusFilter]);

  // Analytics calculations
  const analytics = useMemo(() => {
    const total = packages.length;
    const pending = packages.filter((p) => p.status === 'pending').length;
    const inProgress = packages.filter((p) =>
      ['picked_up', 'in_transit', 'out_for_delivery'].includes(p.status)
    ).length;
    const delivered = packages.filter((p) => p.status === 'delivered').length;
    const cancelled = packages.filter((p) => p.status === 'cancelled').length;
    const totalSpent = packages.reduce((sum, p) => sum + p.cost, 0);

    const deliveryTypeBreakdown = DELIVERY_TYPES.reduce((acc, type) => {
      acc[type.id] = packages.filter((p) => p.deliveryType === type.id).length;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      pending,
      inProgress,
      delivered,
      cancelled,
      totalSpent,
      deliveryTypeBreakdown,
      successRate: total > 0 ? Math.round((delivered / total) * 100) : 0,
    };
  }, [packages]);

  const getDeliveryTypeName = (type: string) => {
    return DELIVERY_TYPES.find((t) => t.id === type)?.name || type;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-hero px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <Link to="/sender" className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-primary-foreground" />
          </Link>
          <h1 className="font-display text-xl font-bold text-primary-foreground">
            My Dashboard
          </h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            Logout
          </Button>
        </div>
        <p className="text-primary-foreground/80">
          Welcome back, {profile?.full_name || 'Sender'}
        </p>
      </div>

      {/* Analytics Cards */}
      <div className="px-4 -mt-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <PackageIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.total}</p>
                  <p className="text-xs text-muted-foreground">Total Packages</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-info/10">
                  <Truck className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.inProgress}</p>
                  <p className="text-xs text-muted-foreground">In Transit</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.delivered}</p>
                  <p className="text-xs text-muted-foreground">Delivered</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Card */}
        <Card className="mt-3 shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <p className="text-xl font-bold">KES {analytics.totalSpent.toLocaleString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-xl font-bold text-success">{analytics.successRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Packages Section */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold">My Packages</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Link to="/sender/new">
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                New
              </Button>
            </Link>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by tracking number, receiver..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-2 min-w-max">
              {STATUS_FILTERS.map((filter) => (
                <Button
                  key={filter.value}
                  variant={statusFilter === filter.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(filter.value)}
                  className="whitespace-nowrap"
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Packages List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredPackages.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <PackageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {packages.length === 0
                  ? 'No packages yet. Create your first delivery!'
                  : 'No packages match your filters'}
              </p>
              {packages.length === 0 && (
                <Link to="/sender/new">
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Delivery
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredPackages.map((pkg) => (
              <Link key={pkg.id} to={`/sender/track?tracking=${pkg.trackingNumber}`}>
                <Card className="shadow-card hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-mono text-sm font-semibold text-primary">
                          {pkg.trackingNumber}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(pkg.createdAt, 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <StatusBadge status={pkg.status} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{pkg.receiverName}</p>
                        <p className="text-xs text-muted-foreground">
                          {getDeliveryTypeName(pkg.deliveryType)}
                        </p>
                      </div>
                      <p className="font-semibold">KES {pkg.cost}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Delivery Type Breakdown */}
        {packages.length > 0 && (
          <Card className="mt-6 shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Delivery Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {DELIVERY_TYPES.map((type) => {
                  const count = analytics.deliveryTypeBreakdown[type.id] || 0;
                  const percentage = analytics.total > 0 ? (count / analytics.total) * 100 : 0;
                  return (
                    <div key={type.id} className="flex items-center justify-between">
                      <span className="text-sm">{type.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <HelpButton />
      <BottomNav />
    </div>
  );
}
