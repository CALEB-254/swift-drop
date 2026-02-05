import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Bluetooth, Loader2 } from 'lucide-react';
import { PackageReceipt } from './PackageReceipt';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

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
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedPrinter, setConnectedPrinter] = useState<any>(null);

  const scanForPrinters = async () => {
    if (!('bluetooth' in navigator)) {
      toast.error('Bluetooth is not supported on this device');
      return;
    }

    setIsConnecting(true);
    try {
      // Request Bluetooth device with broader filters for thermal printers
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Generic thermal printer
          '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Nordic UART
          '0000ff00-0000-1000-8000-00805f9b34fb', // Common printer service
          '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 BLE
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // RN4870/RN4871
        ]
      });

      if (device) {
        setConnectedPrinter(device);
        toast.success(`Connected to ${device.name || 'Bluetooth Printer'}`);
      }
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        console.error('Bluetooth error:', err);
        toast.error('Failed to connect to printer');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const printViaBluetooth = async () => {
    if (!connectedPrinter) {
      toast.error('No printer connected');
      return;
    }

    setIsConnecting(true);
    try {
      const server = await connectedPrinter.gatt?.connect();
      if (!server) {
        throw new Error('Could not connect to printer');
      }

      // Try different service UUIDs
      const serviceUUIDs = [
        '000018f0-0000-1000-8000-00805f9b34fb',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455',
        '0000ff00-0000-1000-8000-00805f9b34fb',
        '0000ffe0-0000-1000-8000-00805f9b34fb',
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
      ];

      let printed = false;
      for (const serviceUUID of serviceUUIDs) {
        try {
          const service = await server.getPrimaryService(serviceUUID);
          const characteristics = await service.getCharacteristics();
          
          for (const characteristic of characteristics) {
            if (characteristic.properties.write || characteristic.properties.writeWithoutResponse) {
              const receiptText = formatReceiptForPrinter(pkg);
              const encoder = new TextEncoder();
              const data = encoder.encode(receiptText);
              
              // Split data into chunks for BLE transfer
              const chunkSize = 20;
              for (let i = 0; i < data.length; i += chunkSize) {
                const chunk = data.slice(i, i + chunkSize);
                if (characteristic.properties.writeWithoutResponse) {
                  await characteristic.writeValueWithoutResponse(chunk);
                } else {
                  await characteristic.writeValue(chunk);
                }
                await new Promise(resolve => setTimeout(resolve, 50));
              }
              
              printed = true;
              toast.success('Receipt printed successfully!');
              break;
            }
          }
          if (printed) break;
        } catch {
          // Try next service
        }
      }

      if (!printed) {
        toast.error('Could not print - incompatible printer');
      }
    } catch (err: any) {
      console.error('Print error:', err);
      toast.error('Failed to print receipt');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleBrowserPrint = () => {
    if (!receiptRef.current) return;
    
    // Fallback to browser print
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

  const formatReceiptForPrinter = (pkg: PrintReceiptButtonProps['pkg']) => {
    const line = '================================\n';
    return `
${line}
      CANYI DELIVERY
${line}
Tracking: ${pkg.trackingNumber}
Date: ${pkg.createdAt.toLocaleDateString()}
${line}
SENDER
${pkg.senderName}
${pkg.senderPhone}
${line}
RECEIVER
${pkg.receiverName}
${pkg.receiverPhone}
${pkg.receiverAddress}
${line}
Type: ${pkg.deliveryType}
${pkg.pickupPoint ? `Pickup: ${pkg.pickupPoint}\n` : ''}
${line}
TOTAL: KES ${pkg.cost}
${pkg.paymentStatus === 'paid' ? 'PAID' : 'UNPAID'}
${pkg.mpesaReceiptNumber ? `M-Pesa: ${pkg.mpesaReceiptNumber}` : ''}
${line}
    Thank you!
${line}
`;
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
          <Button onClick={handleBrowserPrint} className="flex-1 gap-2">
            <Printer className="w-4 h-4" />
            Browser Print
          </Button>
          {connectedPrinter ? (
            <Button 
              onClick={printViaBluetooth} 
              variant="secondary"
              className="flex-1 gap-2"
              disabled={isConnecting}
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Bluetooth className="w-4 h-4" />
              )}
              {connectedPrinter.name || 'Printer'}
            </Button>
          ) : (
            <Button 
              onClick={scanForPrinters} 
              variant="outline"
              className="flex-1 gap-2"
              disabled={isConnecting}
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Bluetooth className="w-4 h-4" />
              )}
              Connect Printer
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
