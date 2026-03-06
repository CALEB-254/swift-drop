import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, Search, ScanLine, Printer, Loader2 } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PackageReceipt } from '@/components/PackageReceipt';
import { ReceiptPreviewDrawer } from '@/components/ReceiptPreviewDrawer';
import { QRScanner } from '@/components/QRScanner';
import { toPng } from 'html-to-image';

export default function AgentPrintPackage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [pkg, setPkg] = useState<any>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const searchPackage = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setPkg(null);

    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .or(`tracking_number.ilike.%${searchQuery}%,receiver_phone.ilike.%${searchQuery}%`)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setPkg(data);
      } else {
        toast.error('No package found');
      }
    } catch (err) {
      console.error(err);
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleScan = (result: string) => {
    setShowScanner(false);
    setQuery(result);
    searchPackage(result);
  };

  const handlePrint = async () => {
    if (!receiptRef.current) return;
    setIsPrinting(true);
    try {
      const dataUrl = await toPng(receiptRef.current, { quality: 1, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `receipt-${pkg.tracking_number}.png`;
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
        <h1 className="font-display text-lg font-bold">Print Package</h1>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tracking code or receiver phone"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchPackage(query)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => searchPackage(query)} disabled={searching} size="icon">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        {/* Scan QR */}
        <Button variant="outline" className="w-full gap-2" onClick={() => setShowScanner(true)}>
          <ScanLine className="w-4 h-4" />
          Scan Package QR Code
        </Button>

        {/* Result */}
        {pkg && (
          <Card className="border border-border shadow-sm">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{pkg.tracking_number}</p>
                  <p className="text-sm text-muted-foreground">{pkg.receiver_name}</p>
                  <p className="text-sm text-muted-foreground">{pkg.receiver_phone}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-muted font-medium capitalize">
                  {pkg.status?.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {pkg.package_description || 'No description'}
              </p>
              <Button className="w-full gap-2" onClick={() => setShowReceipt(true)}>
                <Printer className="w-4 h-4" />
                Print Receipt
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* QR Scanner */}
      <QRScanner
        open={showScanner}
        onScan={handleScan}
        onClose={() => setShowScanner(false)}
      />

      {/* Receipt Drawer */}
      {pkg && (
        <ReceiptPreviewDrawer
          open={showReceipt}
          onOpenChange={setShowReceipt}
          pkg={{
            trackingNumber: pkg.tracking_number,
            senderName: pkg.sender_name,
            senderPhone: pkg.sender_phone,
            senderAddress: pkg.sender_address,
            receiverName: pkg.receiver_name,
            receiverPhone: pkg.receiver_phone,
            receiverAddress: pkg.receiver_address,
            deliveryType: pkg.delivery_type,
            pickupPoint: pkg.pickup_point,
            packageDescription: pkg.package_description,
            packageValue: pkg.package_value ? Number(pkg.package_value) : null,
            weight: pkg.weight ? Number(pkg.weight) : null,
            cost: Number(pkg.cost),
            createdAt: new Date(pkg.created_at),
            paymentStatus: pkg.payment_status,
            mpesaReceiptNumber: pkg.mpesa_receipt_number,
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
