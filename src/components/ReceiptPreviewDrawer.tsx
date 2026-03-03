import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Printer, Loader2 } from 'lucide-react';
import { PackageReceipt } from './PackageReceipt';
import { useRef } from 'react';

interface ReceiptPkg {
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
}

interface ReceiptPreviewDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pkg: ReceiptPkg;
  onPrint: () => void;
  isPrinting: boolean;
  receiptRef: React.RefObject<HTMLDivElement | null>;
}

export function ReceiptPreviewDrawer({ open, onOpenChange, pkg, onPrint, isPrinting, receiptRef }: ReceiptPreviewDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle className="text-center">Receipt Preview</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-2 flex justify-center">
          <div className="border border-border rounded-lg shadow-sm overflow-hidden">
            <PackageReceipt ref={receiptRef} pkg={pkg} />
          </div>
        </div>
        <DrawerFooter className="flex-row gap-3">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="flex-1 gap-2" onClick={onPrint} disabled={isPrinting}>
            {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            Print Now
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
