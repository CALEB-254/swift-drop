import { useState, useEffect, forwardRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Search, Package, User, Phone, MapPin, Clock, Copy, Check, Loader2, QrCode } from 'lucide-react';
import { usePackages, Package as PackageType } from '@/hooks/usePackages';
import { TrackingTimeline } from '@/components/TrackingTimeline';
import { StatusBadge } from '@/components/StatusBadge';
import { QRScanner } from '@/components/QRScanner';
import { format } from 'date-fns';
import { toast } from 'sonner';

const TrackPackage = forwardRef<HTMLDivElement>(function TrackPackage(_, ref) {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [copied, setCopied] = useState(false);
  const [pkg, setPkg] = useState<PackageType | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const { getPackageByTracking } = usePackages();

  const handleQRScan = (trackingNumber: string) => {
    setSearchQuery(trackingNumber);
    searchPackage(trackingNumber);
  };

  const searchPackage = async (query: string) => {
    if (!query.trim()) return;
    
    setLoading(true);
    setSearched(true);
    try {
      const result = await getPackageByTracking(query);
      setPkg(result);
    } catch (error) {
      console.error('Error searching package:', error);
      setPkg(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      searchPackage(initialQuery);
    }
  }, [initialQuery]);

  const handleSearch = () => {
    searchPackage(searchQuery);
  };

  const copyTrackingNumber = () => {
    if (pkg) {
      navigator.clipboard.writeText(pkg.trackingNumber);
      setCopied(true);
      toast.success('Tracking number copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div ref={ref} className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-primary text-primary-foreground p-4">
        <div className="container">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/sender">
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="font-display text-xl font-bold">Track Package</h1>
          </div>

          {/* Search */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter tracking number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50"
            />
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowScanner(true)}
              className="text-primary-foreground hover:bg-primary-foreground/10 shrink-0"
            >
              <QrCode className="w-5 h-5" />
            </Button>
            <Button variant="accent" onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* QR Scanner Dialog */}
        <QRScanner 
          open={showScanner} 
          onClose={() => setShowScanner(false)} 
          onScan={handleQRScan} 
        />
      </div>

      <div className="container py-6 px-4">
        {loading ? (
          <Card className="border-0 shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Searching for package...</p>
            </CardContent>
          </Card>
        ) : pkg ? (
          <div className="space-y-6 animate-fade-in">
            {/* Tracking Number Card */}
            <Card className="border-0 shadow-card overflow-hidden">
              <div className="gradient-primary p-4 text-primary-foreground">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Package className="w-6 h-6" />
                    <div>
                      <p className="text-xs opacity-80">Tracking Number</p>
                      <p className="font-display font-bold text-lg">{pkg.trackingNumber}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-primary-foreground hover:bg-primary-foreground/10"
                    onClick={copyTrackingNumber}
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </Button>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <StatusBadge status={pkg.status} className="mt-1" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Delivery Cost</p>
                    <p className="font-display font-bold text-xl text-primary">
                      KES {pkg.cost.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tracking Timeline */}
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="font-display text-lg">Delivery Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <TrackingTimeline currentStatus={pkg.status} />
              </CardContent>
            </Card>

            {/* Delivery Details */}
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="font-display text-lg">Delivery Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Sender */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sender</p>
                  <div className="p-4 bg-secondary rounded-lg space-y-2">
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-primary" />
                      <span className="font-medium">{pkg.senderName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{pkg.senderPhone}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{pkg.senderAddress || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Receiver */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Receiver</p>
                  <div className="p-4 bg-secondary rounded-lg space-y-2">
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-accent" />
                      <span className="font-medium">{pkg.receiverName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{pkg.receiverPhone}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {pkg.deliveryType === 'pickup_point' ? pkg.pickupPoint : pkg.receiverAddress}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Package Info */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Package</p>
                  <div className="p-4 bg-secondary rounded-lg space-y-2">
                    <div className="flex items-center gap-3">
                      <Package className="w-4 h-4 text-primary" />
                      <span className="font-medium">{pkg.packageDescription || 'No description'}</span>
                    </div>
                    {pkg.weight > 0 && (
                      <p className="text-sm text-muted-foreground ml-7">{pkg.weight} kg</p>
                    )}
                  </div>
                </div>

                {/* Timestamps */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-4 border-t">
                  <Clock className="w-4 h-4" />
                  <span>Created: {format(pkg.createdAt, 'MMM d, yyyy • h:mm a')}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : searched ? (
          <Card className="border-0 shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="font-display font-semibold text-lg mb-2">Package Not Found</h3>
              <p className="text-muted-foreground text-center mb-4">
                No package found with tracking number:<br />
                <span className="font-mono font-medium">{searchQuery}</span>
              </p>
              <Button variant="outline" onClick={() => { setSearchQuery(''); setSearched(false); }}>
                Try Another Number
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="font-display font-semibold text-lg mb-2">Track Your Package</h3>
              <p className="text-muted-foreground text-center">
                Enter your tracking number above to see delivery status
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
});

export default TrackPackage;
