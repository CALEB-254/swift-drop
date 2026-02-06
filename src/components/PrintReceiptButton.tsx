import { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';
import { PackageReceipt } from './PackageReceipt';
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
  const [isPrinting, setIsPrinting] = useState(false);

  const printDirect = useCallback(async () => {
    setIsPrinting(true);
    
    // Check if a Bluetooth printer is saved in localStorage
    const savedPrinterId = localStorage.getItem('bt_printer_id');
    
    if (savedPrinterId && 'bluetooth' in navigator) {
      try {
        await printViaBluetooth(pkg);
        setIsPrinting(false);
        return;
      } catch {
        // Fall through to browser print
      }
    }
    
    // Browser print with full receipt including QR code
    printViaBrowser();
    setIsPrinting(false);
  }, [pkg]);

  const printViaBrowser = () => {
    // Create a hidden container, render the receipt, then print
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    document.body.appendChild(container);

    // Use receiptRef if available, otherwise create inline
    const receiptHtml = receiptRef.current?.innerHTML || generateReceiptHTML(pkg);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt - ${pkg.trackingNumber}</title>
          <style>
            body { margin: 0; padding: 20px; font-family: monospace; display: flex; justify-content: center; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>${receiptHtml}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    }
    
    document.body.removeChild(container);
  };

  return (
    <>
      {/* Hidden receipt for generating print content */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
        <PackageReceipt ref={receiptRef} pkg={pkg} />
      </div>
      <Button variant={variant} size={size} className="gap-2" onClick={printDirect} disabled={isPrinting}>
        {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
        <span className="hidden sm:inline">Print</span>
      </Button>
    </>
  );
}

async function printViaBluetooth(pkg: PrintReceiptButtonProps['pkg']) {
  const device = await (navigator as any).bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [
      '000018f0-0000-1000-8000-00805f9b34fb',
      '49535343-fe7d-4ae5-8fa9-9fafd205e455',
      '0000ff00-0000-1000-8000-00805f9b34fb',
      '0000ffe0-0000-1000-8000-00805f9b34fb',
      'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
    ]
  });

  const server = await device.gatt?.connect();
  if (!server) throw new Error('Could not connect');

  const serviceUUIDs = [
    '000018f0-0000-1000-8000-00805f9b34fb',
    '49535343-fe7d-4ae5-8fa9-9fafd205e455',
    '0000ff00-0000-1000-8000-00805f9b34fb',
    '0000ffe0-0000-1000-8000-00805f9b34fb',
    'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  ];

  const line = '================================\n';
  const receiptText = `
${line}
        SWIFTDROP
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
${pkg.pickupPoint ? `Pickup: ${pkg.pickupPoint}\n` : ''}${pkg.packageDescription ? `Package: ${pkg.packageDescription}\n` : ''}${line}
TOTAL: KES ${pkg.cost}
${pkg.paymentStatus === 'paid' ? 'PAID' : 'UNPAID'}
${pkg.mpesaReceiptNumber ? `M-Pesa: ${pkg.mpesaReceiptNumber}` : ''}
${line}
    Thank you!
${line}
`;

  const encoder = new TextEncoder();
  const data = encoder.encode(receiptText);

  for (const serviceUUID of serviceUUIDs) {
    try {
      const service = await server.getPrimaryService(serviceUUID);
      const characteristics = await service.getCharacteristics();
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          const chunkSize = 20;
          for (let i = 0; i < data.length; i += chunkSize) {
            const chunk = data.slice(i, i + chunkSize);
            if (char.properties.writeWithoutResponse) {
              await char.writeValueWithoutResponse(chunk);
            } else {
              await char.writeValue(chunk);
            }
            await new Promise(r => setTimeout(r, 50));
          }
          toast.success('Receipt printed!');
          return;
        }
      }
    } catch { /* try next */ }
  }
  throw new Error('No compatible printer service');
}

function generateReceiptHTML(pkg: PrintReceiptButtonProps['pkg']) {
  return `<div style="font-family:monospace;max-width:320px;margin:auto;padding:24px;color:#000">
    <div style="text-align:center;border-bottom:2px dashed #ccc;padding-bottom:16px;margin-bottom:16px">
      <h1 style="font-size:20px;font-weight:bold">SWIFTDROP</h1>
      <p style="font-size:12px;color:#666">Delivery Receipt</p>
    </div>
    <div style="text-align:center;margin-bottom:16px">
      <p style="font-size:12px;color:#666">Tracking Number</p>
      <p style="font-weight:bold;font-size:18px">${pkg.trackingNumber}</p>
    </div>
    <div style="border-top:1px dashed #ccc;border-bottom:1px dashed #ccc;padding:16px 0;font-size:14px">
      <p><strong>From:</strong> ${pkg.senderName} (${pkg.senderPhone})</p>
      <p><strong>To:</strong> ${pkg.receiverName} (${pkg.receiverPhone})</p>
      <p><strong>Address:</strong> ${pkg.receiverAddress}</p>
      ${pkg.packageDescription ? `<p><strong>Package:</strong> ${pkg.packageDescription}</p>` : ''}
    </div>
    <div style="padding:16px 0;text-align:center">
      <p style="font-size:20px;font-weight:bold">TOTAL: KES ${pkg.cost.toLocaleString()}</p>
    </div>
    <div style="text-align:center;font-size:12px;color:#666">
      <p>Thank you for choosing SwiftDrop!</p>
    </div>
  </div>`;
}
