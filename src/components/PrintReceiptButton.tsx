import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { PackageReceipt } from './PackageReceipt';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface PrintReceiptButtonProps {
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

export function PrintReceiptButton({ pkg, variant = 'outline', size = 'sm' }: PrintReceiptButtonProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!receiptRef.current) return;

    const printContent = receiptRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt - ${pkg.trackingNumber}</title>
          <style>
            body { 
              margin: 0; 
              padding: 20px;
              font-family: monospace;
              display: flex;
              justify-content: center;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className="gap-2">
          <Printer className="w-4 h-4" />
          <span className="hidden sm:inline">Print</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receipt Preview</DialogTitle>
        </DialogHeader>
        <div className="border rounded-lg overflow-hidden">
          <PackageReceipt ref={receiptRef} pkg={pkg} />
        </div>
        <div className="flex gap-2 mt-4">
          <Button onClick={handlePrint} className="flex-1 gap-2">
            <Printer className="w-4 h-4" />
            Print Receipt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
