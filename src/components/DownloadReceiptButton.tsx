import { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { PackageReceipt } from './PackageReceipt';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';

interface DownloadReceiptButtonProps {
  pkg: {
    trackingNumber: string;
    senderName: string;
    senderPhone: string;
    receiverName: string;
    receiverPhone: string;
    receiverAddress: string;
    deliveryType: string;
    pickupPoint?: string | null;
    packageDescription?: string | null;
    cost: number;
    createdAt: Date;
    paymentStatus?: string;
    mpesaReceiptNumber?: string | null;
  };
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function DownloadReceiptButton({ pkg, variant = 'outline', size = 'sm' }: DownloadReceiptButtonProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!receiptRef.current) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(receiptRef.current, { quality: 1, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `receipt-${pkg.trackingNumber}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Receipt downloaded!');
    } catch {
      toast.error('Failed to download receipt');
    } finally {
      setIsDownloading(false);
    }
  }, [pkg.trackingNumber]);

  return (
    <>
      <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
        <PackageReceipt ref={receiptRef} pkg={pkg} />
      </div>
      <Button variant={variant} size={size} className="gap-2" onClick={handleDownload} disabled={isDownloading}>
        {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        <span className="hidden sm:inline">Download</span>
      </Button>
    </>
  );
}
