import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePackages, Package } from '@/hooks/usePackages';
import { TopHeader } from '@/components/TopHeader';
import { useAuthContext } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BottomNav } from '@/components/BottomNav';
import { HelpButton } from '@/components/HelpButton';
import { StatusBadge } from '@/components/StatusBadge';
import { PrintReceiptButton } from '@/components/PrintReceiptButton';
import { DownloadReceiptButton } from '@/components/DownloadReceiptButton';
import { ShareWhatsAppButton } from '@/components/ShareWhatsAppButton';
import { PackageQRCode } from '@/components/PackageQRCode';
import { PrinterDrawer } from '@/components/PrinterDrawer';
import {
  Search,
  Package as PackageIcon,
  Plus,
  TrendingUp,
  Clock,
  CheckCircle2,
  Truck,
  RefreshCw,
  Download,
  FileText,
  FileSpreadsheet,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  QrCode,
    Printer,
    MessageCircle,
  } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { STATUS_LABELS, DELIVERY_TYPES, PackageStatus } from '@/types/delivery';
import { toast } from 'sonner';
import { DateRange } from 'react-day-picker';

const STATUS_FILTERS: { value: PackageStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'picked_up', label: 'Picked Up' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const ITEMS_PER_PAGE = 10;

export default function SenderDashboard() {
  const { packages, loading, refetch } = usePackages();
  const { profile, signOut } = useAuthContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PackageStatus | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedQR, setExpandedQR] = useState<string | null>(null);
  const [showPrinterDrawer, setShowPrinterDrawer] = useState(false);

  // Filter packages based on search, status, and date range
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const matchesSearch =
        searchQuery === '' ||
        pkg.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.receiverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.receiverPhone.includes(searchQuery);

      const matchesStatus = statusFilter === 'all' || pkg.status === statusFilter;

      const matchesDateRange =
        !dateRange?.from ||
        isWithinInterval(pkg.createdAt, {
          start: startOfDay(dateRange.from),
          end: endOfDay(dateRange.to || dateRange.from),
        });

      return matchesSearch && matchesStatus && matchesDateRange;
    });
  }, [packages, searchQuery, statusFilter, dateRange]);

  // Pagination
  const totalPages = Math.ceil(filteredPackages.length / ITEMS_PER_PAGE);
  const paginatedPackages = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPackages.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredPackages, currentPage]);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, dateRange]);

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

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Tracking Number',
      'Status',
      'Receiver Name',
      'Receiver Phone',
      'Receiver Address',
      'Delivery Type',
      'Cost (KES)',
      'Created Date',
    ];

    const rows = filteredPackages.map((pkg) => [
      pkg.trackingNumber,
      STATUS_LABELS[pkg.status] || pkg.status,
      pkg.receiverName,
      pkg.receiverPhone,
      pkg.receiverAddress,
      getDeliveryTypeName(pkg.deliveryType),
      pkg.cost.toString(),
      format(pkg.createdAt, 'yyyy-MM-dd HH:mm'),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `packages_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  // Export to PDF (using browser print)
  const exportToPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Package History</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f5f5f5; font-weight: bold; }
          tr:nth-child(even) { background-color: #fafafa; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
          .summary-card { background: #f5f5f5; padding: 10px; border-radius: 4px; }
          .summary-card h3 { margin: 0; font-size: 24px; }
          .summary-card p { margin: 5px 0 0; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Package History</h1>
          <p>Generated: ${format(new Date(), 'PPpp')}</p>
        </div>
        <div class="summary">
          <div class="summary-card">
            <h3>${analytics.total}</h3>
            <p>Total Packages</p>
          </div>
          <div class="summary-card">
            <h3>${analytics.delivered}</h3>
            <p>Delivered</p>
          </div>
          <div class="summary-card">
            <h3>${analytics.successRate}%</h3>
            <p>Success Rate</p>
          </div>
          <div class="summary-card">
            <h3>KES ${analytics.totalSpent.toLocaleString()}</h3>
            <p>Total Spent</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Tracking #</th>
              <th>Status</th>
              <th>Receiver</th>
              <th>Phone</th>
              <th>Type</th>
              <th>Cost</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${filteredPackages
              .map(
                (pkg) => `
              <tr>
                <td>${pkg.trackingNumber}</td>
                <td>${STATUS_LABELS[pkg.status] || pkg.status}</td>
                <td>${pkg.receiverName}</td>
                <td>${pkg.receiverPhone}</td>
                <td>${getDeliveryTypeName(pkg.deliveryType)}</td>
                <td>KES ${pkg.cost}</td>
                <td>${format(pkg.createdAt, 'MMM dd, yyyy')}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
      toast.success('PDF ready for download');
    }
  };

  const clearDateRange = () => {
    setDateRange(undefined);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-hero px-4 py-6">
        <div className="mb-4">
          <TopHeader />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-primary-foreground">
              My Dashboard
            </h1>
            <p className="text-primary-foreground/80">
              Welcome back, {profile?.full_name || 'Sender'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            Logout
          </Button>
        </div>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToCSV}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by tracking number, receiver..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={dateRange?.from ? 'default' : 'outline'}
                  size="icon"
                  className="shrink-0"
                >
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={1}
                  initialFocus
                />
                {dateRange?.from && (
                  <div className="p-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={clearDateRange}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear dates
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {dateRange?.from && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              <span>
                {format(dateRange.from, 'MMM dd, yyyy')}
                {dateRange.to && ` - ${format(dateRange.to, 'MMM dd, yyyy')}`}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={clearDateRange}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

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

        {/* Results count */}
        {!loading && filteredPackages.length > 0 && (
          <p className="text-sm text-muted-foreground mb-3">
            Showing {paginatedPackages.length} of {filteredPackages.length} packages
          </p>
        )}

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
          <>
            <div className="space-y-3">
              {paginatedPackages.map((pkg) => (
                <Card key={pkg.id} className="shadow-card hover:shadow-md transition-shadow">
                  <Link to={`/sender/track?tracking=${pkg.trackingNumber}`}>
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
                  </Link>
                  {/* QR, Download and Print Actions */}
                  <div className="px-4 pb-4 pt-2 border-t border-border">
                    <div className="flex items-center justify-between gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-xs"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setExpandedQR(expandedQR === pkg.id ? null : pkg.id);
                        }}
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span className="font-mono">{pkg.trackingNumber}</span>
                      </Button>
                      <div className="flex gap-2">
                        <ShareWhatsAppButton pkg={pkg} />
                        <DownloadReceiptButton pkg={pkg} />
                        <PrintReceiptButton pkg={pkg} />
                      </div>
                    </div>
                    {expandedQR === pkg.id && (
                      <div className="flex justify-center mt-3 pb-1">
                        <PackageQRCode trackingNumber={pkg.trackingNumber} size={140} />
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      // Show first, last, current, and adjacent pages
                      return (
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 1
                      );
                    })
                    .map((page, index, arr) => {
                      // Add ellipsis where needed
                      const prevPage = arr[index - 1];
                      const showEllipsis = prevPage && page - prevPage > 1;

                      return (
                        <div key={page} className="flex items-center gap-1">
                          {showEllipsis && (
                            <span className="px-2 text-muted-foreground">...</span>
                          )}
                          <Button
                            variant={currentPage === page ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="w-8"
                          >
                            {page}
                          </Button>
                        </div>
                      );
                    })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
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
      <PrinterDrawer open={showPrinterDrawer} onOpenChange={setShowPrinterDrawer} onPrinterSelected={() => setShowPrinterDrawer(false)} />
      <BottomNav />
    </div>
  );
}
