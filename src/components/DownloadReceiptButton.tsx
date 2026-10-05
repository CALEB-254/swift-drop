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
    senderAddress?: string | null;
    receiverName: string;
    receiverPhone: string;
    receiverAddress: string;
    deliveryType: string;
    pickupPoint?: string | null;
    packageDescription?: string | null;
    packageValue?: number | null;
    weight?: number | null;
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
      const node = receiptRef.current;
      const dataUrl = await toPng(node, { quality: 1, pixelRatio: 2, backgroundColor: '#ffffff' });
      const { jsPDF } = await import('jspdf');
      const w = node.offsetWidth || 380;
      const h = node.offsetHeight || 800;
      const pdf = new jsPDF({ unit: 'px', format: [w, h], orientation: h >= w ? 'portrait' : 'landscape', hotfixes: ['px_scaling'] });
      pdf.addImage(dataUrl, 'PNG', 0, 0, w, h);
      pdf.save(`receipt-${pkg.trackingNumber}.pdf`);
      toast.success('Receipt downloaded as PDF');
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
