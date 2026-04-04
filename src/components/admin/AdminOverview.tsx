import { Card, CardContent } from '@/components/ui/card';
import { Package, Users, MapPin, DollarSign, Clock, CheckCircle, XCircle, Truck } from 'lucide-react';
import type { AdminData } from '@/pages/admin/AdminDashboard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subDays } from 'date-fns';

interface Props { data: AdminData; onRefresh: () => void; }

export function AdminOverview({ data }: Props) {
  const { stats } = data;
  
  const statCards = [
    { icon: Package, label: 'Total Packages', value: stats.totalPackages, color: 'text-primary' },
    { icon: DollarSign, label: 'Revenue', value: `KES ${stats.totalRevenue.toLocaleString()}`, color: 'text-primary' },
    { icon: Users, label: 'Senders', value: stats.totalUsers, color: 'text-info' },
    { icon: MapPin, label: 'Agents', value: stats.totalAgents, color: 'text-warning' },
    { icon: Clock, label: 'Pending', value: stats.pendingPackages, color: 'text-warning' },
    { icon: Truck, label: 'In Transit', value: stats.inTransitPackages, color: 'text-info' },
    { icon: CheckCircle, label: 'Delivered', value: stats.deliveredPackages, color: 'text-primary' },
    { icon: XCircle, label: 'Cancelled', value: stats.cancelledPackages, color: 'text-destructive' },
  ];

  // Orders by day (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayStr = format(date, 'yyyy-MM-dd');
    const count = data.packages.filter(p => format(new Date(p.created_at), 'yyyy-MM-dd') === dayStr).length;
    return { day: format(date, 'EEE'), orders: count };
  });

  // Status distribution
  const statusData = [
    { name: 'Pending', value: stats.pendingPackages, color: 'hsl(38, 92%, 50%)' },
    { name: 'In Transit', value: stats.inTransitPackages, color: 'hsl(199, 89%, 48%)' },
    { name: 'Delivered', value: stats.deliveredPackages, color: 'hsl(145, 63%, 42%)' },
    { name: 'Cancelled', value: stats.cancelledPackages, color: 'hsl(0, 84%, 60%)' },
  ].filter(s => s.value > 0);

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((s, i) => (
          <Card key={i} className="border-0 shadow-card">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div>
                  <p className="text-lg font-bold">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Weekly Orders Chart */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-3">Orders (Last 7 Days)</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={last7Days}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 10%, 18%)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(150, 5%, 55%)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(150, 5%, 55%)' }} />
              <Tooltip contentStyle={{ background: 'hsl(150, 15%, 10%)', border: '1px solid hsl(150, 10%, 18%)', borderRadius: 8 }} />
              <Bar dataKey="orders" fill="hsl(145, 63%, 42%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Status Distribution */}
      {statusData.length > 0 && (
        <Card className="border-0 shadow-card">
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-3">Order Status Distribution</p>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" paddingAngle={2}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1">
                {statusData.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      <span className="text-muted-foreground">{s.name}</span>
                    </div>
                    <span className="font-medium">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Summary */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-3">Payment Summary</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-lg font-bold text-primary">{stats.paidOrders}</p>
              <p className="text-[10px] text-muted-foreground">Paid</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-warning">{stats.unpaidOrders}</p>
              <p className="text-[10px] text-muted-foreground">Unpaid</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">KES {stats.totalCommissions.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Commissions</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Open Support Tickets */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-2">Support Tickets</p>
          <div className="flex gap-4 text-sm">
            <span className="text-warning">{data.tickets.filter(t => t.status === 'open').length} Open</span>
            <span className="text-info">{data.tickets.filter(t => t.status === 'in_progress').length} In Progress</span>
            <span className="text-primary">{data.tickets.filter(t => t.status === 'resolved').length} Resolved</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
