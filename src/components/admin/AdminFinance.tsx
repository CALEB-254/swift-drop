import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, Receipt, Percent } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns';
import type { AdminData } from '@/pages/admin/AdminDashboard';

interface Props { data: AdminData; onRefresh: () => void; }

export function AdminFinance({ data }: Props) {
  const { stats, packages } = data;
  const paidPkgs = packages.filter(p => p.payment_status === 'paid');

  // Daily revenue last 7 days
  const dailyRevenue = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayStr = format(date, 'yyyy-MM-dd');
    const dayPkgs = paidPkgs.filter(p => format(new Date(p.paid_at || p.created_at), 'yyyy-MM-dd') === dayStr);
    return {
      day: format(date, 'EEE'),
      revenue: dayPkgs.reduce((sum, p) => sum + (p.cost || 0), 0),
      commission: dayPkgs.reduce((sum, p) => sum + (p.commission || 0), 0),
    };
  });

  // Payment method breakdown
  const mpesaPaid = paidPkgs.filter(p => p.mpesa_receipt_number).length;
  const otherPaid = paidPkgs.length - mpesaPaid;
  const failedPayments = packages.filter(p => p.payment_status === 'failed').length;
  const pendingPayments = packages.filter(p => p.payment_status === 'pending').length;

  // This week/month revenue
  const weekStart = startOfWeek(new Date());
  const monthStart = startOfMonth(new Date());
  const weekRevenue = paidPkgs.filter(p => new Date(p.paid_at || p.created_at) >= weekStart).reduce((s, p) => s + (p.cost || 0), 0);
  const monthRevenue = paidPkgs.filter(p => new Date(p.paid_at || p.created_at) >= monthStart).reduce((s, p) => s + (p.cost || 0), 0);

  return (
    <div className="space-y-4 mt-4">
      {/* Revenue Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-0 shadow-card">
          <CardContent className="p-3 text-center">
            <DollarSign className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold">KES {stats.totalRevenue.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Total Revenue</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card">
          <CardContent className="p-3 text-center">
            <Percent className="w-5 h-5 text-warning mx-auto mb-1" />
            <p className="text-lg font-bold">KES {stats.totalCommissions.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Total Commissions</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card">
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-5 h-5 text-info mx-auto mb-1" />
            <p className="text-lg font-bold">KES {weekRevenue.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">This Week</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card">
          <CardContent className="p-3 text-center">
            <Receipt className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold">KES {monthRevenue.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">This Month</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Revenue Chart */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-3">Daily Revenue (Last 7 Days)</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 10%, 18%)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(150, 5%, 55%)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(150, 5%, 55%)' }} />
              <Tooltip contentStyle={{ background: 'hsl(150, 15%, 10%)', border: '1px solid hsl(150, 10%, 18%)', borderRadius: 8 }} />
              <Bar dataKey="revenue" fill="hsl(145, 63%, 42%)" radius={[4, 4, 0, 0]} name="Revenue" />
              <Bar dataKey="commission" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} name="Commission" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-3">Transactions Overview</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">M-Pesa Payments</span>
              <span className="font-medium text-primary">{mpesaPaid}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Other Payments</span>
              <span className="font-medium">{otherPaid}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pending Payments</span>
              <span className="font-medium text-warning">{pendingPayments}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Failed Payments</span>
              <span className="font-medium text-destructive">{failedPayments}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
