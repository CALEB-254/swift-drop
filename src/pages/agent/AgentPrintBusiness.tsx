import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, Search, ScanLine, Printer, Loader2, Package, Bike, ShoppingBag, ChevronRight } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ReceiptPreviewDrawer } from '@/components/ReceiptPreviewDrawer';
import { QRScanner } from '@/components/QRScanner';
import { toPng } from 'html-to-image';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

const SCAN_OPTIONS = [
  { key: 'pickup_point', label: 'Mtaani', icon: Package },
  { key: 'doorstep', label: 'Doorstep', icon: Bike },
  { key: 'errand', label: 'Errand', icon: ShoppingBag },
] as const;

export default function AgentPrintBusiness() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showScanOptions, setShowScanOptions] = useState(false);
  const [selectedScanType, setSelectedScanType] = useState<string | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const searchBusiness = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setPackages([]);

    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .or(`sender_name.ilike.%${searchQuery}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) {
        setPackages(data);
      } else {
        toast.error('No packages found for this business/sender');
      }
    } catch (err) {
      console.error(err);
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectScanType = (type: string) => {
    setSelectedScanType(type);
    setShowScanOptions(false);
    setShowScanner(true);
  };

  const handleScan = async (result: string) => {
    setShowScanner(false);

    if (!selectedScanType) {
      searchByTracking(result);
      return;
    }

    // Validate scanned package matches selected delivery type first
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .ilike('tracking_number', `%${result}%`)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error('No package found for this QR code');
      } else if (data.delivery_type !== selectedScanType) {
        toast.error('Action not allowed — package delivery type does not match');
      } else {
        setQuery(data.sender_name);
        const { data: allPkgs, error: allError } = await supabase
          .from('packages')
          .select('*')
          .ilike('sender_name', data.sender_name)
          .eq('delivery_type', selectedScanType)
          .order('created_at', { ascending: false });

        if (allError) throw allError;
        setPackages(allPkgs || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Search failed');
    } finally {
      setSearching(false);
      setSelectedScanType(null);
    }
  };

  const searchByTracking = async (trackingNumber: string) => {
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .ilike('tracking_number', `%${trackingNumber}%`)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setQuery(data.sender_name);
        // Now fetch all packages from this sender
        const { data: allPkgs, error: allError } = await supabase
          .from('packages')
          .select('*')
          .ilike('sender_name', data.sender_name)
          .order('created_at', { ascending: false });

        if (allError) throw allError;
        setPackages(allPkgs || []);
      } else {
        toast.error('No package found for this QR code');
      }
    } catch (err) {
      console.error(err);
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handlePrintPkg = (pkg: any) => {
    setSelectedPkg(pkg);
    setShowReceipt(true);
  };

  const handlePrint = async () => {
    if (!receiptRef.current) return;
    setIsPrinting(true);
    try {
      const dataUrl = await toPng(receiptRef.current, { quality: 1, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `receipt-${selectedPkg.tracking_number}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Receipt downloaded');
      setShowReceipt(false);
    } catch {
      toast.error('Print failed');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-4 pt-4 pb-3 border-b border-border flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-lg font-bold">Print Business</h1>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Business name or sender name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchBusiness(query)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => searchBusiness(query)} disabled={searching} size="icon">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        {/* Scan QR */}
        <Button variant="outline" className="w-full gap-2" onClick={() => setShowScanOptions(true)}>
          <ScanLine className="w-4 h-4" />
          Scan Package QR Code
        </Button>

        {/* Results */}
        {packages.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">
              {packages.length} package{packages.length !== 1 ? 's' : ''} found
            </p>
            {packages.map((pkg) => (
              <Card key={pkg.id} className="border border-border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-sm">{pkg.tracking_number}</p>
                      <p className="text-xs text-muted-foreground">To: {pkg.receiver_name}</p>
                      <p className="text-xs text-muted-foreground">{pkg.receiver_address}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-muted font-medium capitalize">
                      {pkg.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => handlePrintPkg(pkg)}>
                    <Printer className="w-3.5 h-3.5" />
                    Print Receipt
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Scan Options Drawer */}
      <Drawer open={showScanOptions} onOpenChange={setShowScanOptions}>
        <DrawerContent>
          <DrawerHeader className="flex items-center gap-2">
            <div className="w-1 h-6 bg-primary rounded-full" />
            <DrawerTitle>Scan QR Code</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-2">
            {SCAN_OPTIONS.map((opt) => (
              <Card
                key={opt.key}
                className="border border-border cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSelectScanType(opt.key)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <opt.icon className="w-5 h-5 text-foreground" />
                  </div>
                  <span className="flex-1 font-medium">{opt.label}</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        </DrawerContent>
      </Drawer>

      {/* QR Scanner */}
      <QRScanner
        open={showScanner}
        onScan={handleScan}
        onClose={() => { setShowScanner(false); setSelectedScanType(null); }}
      />

      {/* Receipt Drawer */}
      {selectedPkg && (
        <ReceiptPreviewDrawer
          open={showReceipt}
          onOpenChange={setShowReceipt}
          pkg={{
            trackingNumber: selectedPkg.tracking_number,
            senderName: selectedPkg.sender_name,
            senderPhone: selectedPkg.sender_phone,
            senderAddress: selectedPkg.sender_address,
            receiverName: selectedPkg.receiver_name,
            receiverPhone: selectedPkg.receiver_phone,
            receiverAddress: selectedPkg.receiver_address,
            deliveryType: selectedPkg.delivery_type,
            pickupPoint: selectedPkg.pickup_point,
            packageDescription: selectedPkg.package_description,
            packageValue: selectedPkg.package_value ? Number(selectedPkg.package_value) : null,
            weight: selectedPkg.weight ? Number(selectedPkg.weight) : null,
            cost: Number(selectedPkg.cost),
            createdAt: new Date(selectedPkg.created_at),
            paymentStatus: selectedPkg.payment_status,
            mpesaReceiptNumber: selectedPkg.mpesa_receipt_number,
          }}
          onPrint={handlePrint}
          isPrinting={isPrinting}
          receiptRef={receiptRef}
        />
      )}

      <BottomNav />
    </div>
  );
}
