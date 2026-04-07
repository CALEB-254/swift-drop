import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Timer, CheckCircle2, XCircle, TrendingUp, Package, Truck } from 'lucide-react';
import type { AdminData } from '@/pages/admin/AdminDashboard';

interface Props { data: AdminData; onRefresh: () => void; }

export function AdminSLA({ data }: Props) {
  const { stats, packages } = data;

  const totalOrders = stats.totalPackages || 1;
  const successRate = ((stats.deliveredPackages / totalOrders) * 100).toFixed(1);
  const cancelRate = ((stats.cancelledPackages / totalOrders) * 100).toFixed(1);
  const pendingRate = ((stats.pendingPackages / totalOrders) * 100).toFixed(1);
  const inTransitRate = ((stats.inTransitPackages / totalOrders) * 100).toFixed(1);

  // Estimate avg delivery time from delivered packages
  const deliveredPkgs = packages.filter(p => p.status === 'delivered' && p.paid_at);
  const avgDeliveryHours = deliveredPkgs.length > 0
    ? deliveredPkgs.reduce((sum, p) => {
        const created = new Date(p.created_at).getTime();
        const updated = new Date(p.updated_at).getTime();
        return sum + (updated - created) / (1000 * 60 * 60);
      }, 0) / deliveredPkgs.length
    : 0;

  const kpis = [
    {
      label: 'Order Success Rate',
      value: `${successRate}%`,
      target: '95%',
      progress: parseFloat(successRate),
      icon: CheckCircle2,
      color: 'text-primary',
    },
    {
      label: 'Cancellation Rate',
      value: `${cancelRate}%`,
      target: '<5%',
      progress: 100 - parseFloat(cancelRate),
      icon: XCircle,
      color: 'text-destructive',
    },
    {
      label: 'Avg Delivery Time',
      value: avgDeliveryHours > 0 ? `${avgDeliveryHours.toFixed(1)}h` : 'N/A',
      target: '<24h',
      progress: avgDeliveryHours > 0 ? Math.min(100, (24 / avgDeliveryHours) * 100) : 0,
      icon: Timer,
      color: 'text-info',
    },
    {
      label: 'In-Transit Rate',
      value: `${inTransitRate}%`,
      target: 'Monitor',
      progress: parseFloat(inTransitRate),
      icon: Truck,
      color: 'text-warning',
    },
  ];

  return (
    <div className="space-y-4 mt-4">
      <h2 className="font-display font-bold">SLA & Performance</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        {kpis.map(kpi => (
          <Card key={kpi.label} className="border-0 shadow-card">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
              </div>
              <p className="text-lg font-bold">{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground mb-1">Target: {kpi.target}</p>
              <Progress value={kpi.progress} className="h-1.5" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Order Breakdown */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-3">Order Status Breakdown</p>
          <div className="space-y-3">
            {[
              { label: 'Delivered', count: stats.deliveredPackages, color: 'bg-primary', pct: (stats.deliveredPackages / totalOrders) * 100 },
              { label: 'Pending', count: stats.pendingPackages, color: 'bg-warning', pct: (stats.pendingPackages / totalOrders) * 100 },
              { label: 'In Transit', count: stats.inTransitPackages, color: 'bg-info', pct: (stats.inTransitPackages / totalOrders) * 100 },
              { label: 'Cancelled', count: stats.cancelledPackages, color: 'bg-destructive', pct: (stats.cancelledPackages / totalOrders) * 100 },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span>{item.label}</span>
                  <span className="font-medium">{item.count} ({item.pct.toFixed(1)}%)</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Performance */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-3">Payment Performance</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{stats.paidOrders}</p>
              <p className="text-[10px] text-muted-foreground">Paid Orders</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-warning">{stats.unpaidOrders}</p>
              <p className="text-[10px] text-muted-foreground">Unpaid Orders</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">KES {stats.totalRevenue.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Total Revenue</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">KES {stats.totalCommissions.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Commissions</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
