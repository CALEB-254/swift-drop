import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
import { Search, Package, Users, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import type { AdminData } from '@/pages/admin/AdminDashboard';

interface Props { data: AdminData; }

export function AdminGlobalSearch({ data }: Props) {
  const [query, setQuery] = useState('');

  if (!query.trim()) return (
    <div className="mt-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search packages, M-Pesa codes, users..." value={query} onChange={e => setQuery(e.target.value)} className="pl-10" />
      </div>
      <p className="text-xs text-muted-foreground text-center mt-8">Type to search across packages, transactions, and users</p>
    </div>
  );

  const q = query.toLowerCase();

  const matchedPackages = data.packages.filter(p =>
    p.tracking_number.toLowerCase().includes(q) ||
    p.sender_name.toLowerCase().includes(q) ||
    p.receiver_name.toLowerCase().includes(q) ||
    p.receiver_phone.includes(q) ||
    p.sender_phone.includes(q)
  ).slice(0, 10);

  const matchedTransactions = data.packages.filter(p =>
    p.payment_status === 'paid' && (
      (p.mpesa_receipt_number && p.mpesa_receipt_number.toLowerCase().includes(q)) ||
      p.tracking_number.toLowerCase().includes(q)
    )
  ).slice(0, 10);

  const matchedUsers = data.users.filter(u =>
    u.full_name.toLowerCase().includes(q) || u.phone.includes(q)
  ).slice(0, 10);

  const hasResults = matchedPackages.length + matchedTransactions.length + matchedUsers.length > 0;

  return (
    <div className="space-y-4 mt-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search packages, M-Pesa codes, users..." value={query} onChange={e => setQuery(e.target.value)} className="pl-10" />
      </div>

      {!hasResults && <p className="text-sm text-muted-foreground text-center mt-8">No results found for "{query}"</p>}

      {matchedPackages.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-primary" />
            <p className="text-sm font-medium">Packages ({matchedPackages.length})</p>
          </div>
          {matchedPackages.map(pkg => (
            <Card key={pkg.id} className="border-0 shadow-card mb-2">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm font-medium">{pkg.tracking_number}</p>
                    <p className="text-xs text-muted-foreground">{pkg.sender_name} → {pkg.receiver_name}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(pkg.created_at), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={pkg.status} />
                    <p className="text-sm font-medium mt-1">KES {pkg.cost}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {matchedTransactions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 text-primary" />
            <p className="text-sm font-medium">Paid Transactions ({matchedTransactions.length})</p>
          </div>
          {matchedTransactions.map(pkg => (
            <Card key={pkg.id} className="border-0 shadow-card mb-2">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-xs text-primary">{pkg.mpesa_receipt_number || 'N/A'}</p>
                    <p className="font-mono text-xs">{pkg.tracking_number}</p>
                    <p className="text-xs text-muted-foreground">{pkg.sender_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">KES {pkg.cost}</p>
                    <p className="text-xs text-primary">Paid</p>
                    {pkg.paid_at && <p className="text-xs text-muted-foreground">{format(new Date(pkg.paid_at), 'MMM d')}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {matchedUsers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-primary" />
            <p className="text-sm font-medium">Users ({matchedUsers.length})</p>
          </div>
          {matchedUsers.map(user => (
            <Card key={user.id} className="border-0 shadow-card mb-2">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{user.full_name}</p>
                    <p className="text-xs text-muted-foreground">{user.phone}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                    user.role === 'agent' ? 'bg-warning/10 text-warning'
                    : user.role === 'admin' ? 'bg-primary/10 text-primary'
                    : 'bg-info/10 text-info'
                  }`}>{user.role}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
