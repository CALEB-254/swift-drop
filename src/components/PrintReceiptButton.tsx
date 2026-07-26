import { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';
import { PackageReceipt } from './PackageReceipt';
import { PrinterDrawer } from './PrinterDrawer';
import { ReceiptPreviewDrawer } from './ReceiptPreviewDrawer';
import { toast } from 'sonner';
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

interface PrintReceiptButtonProps {
  pkg: ReceiptPkg;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function PrintReceiptButton({ pkg, variant = 'outline', size = 'sm' }: PrintReceiptButtonProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const executePrint = useCallback(async () => {
    setIsPrinting(true);

    if ('bluetooth' in navigator) {
      try {
        await printViaBluetooth(pkg);
        setIsPrinting(false);
        setShowPreview(false);
        return;
      } catch {
        // Fall through to browser print
      }
    }

    printViaBrowser(receiptRef, pkg);
    setIsPrinting(false);
    setShowPreview(false);
  }, [pkg]);

  const handlePrintClick = useCallback(() => {
    setShowPreview(true);
  }, []);

  const handleConfirmPrint = useCallback(async () => {
    const savedPrinterId = localStorage.getItem('bt_printer_id');
    
    if (!savedPrinterId) {
      setShowPreview(false);
      setShowDrawer(true);
      return;
    }

    await executePrint();
  }, [executePrint]);

  return (
    <>
      <Button variant={variant} size={size} className="gap-2" onClick={handlePrintClick} disabled={isPrinting}>
        {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
        <span className="hidden sm:inline">Print</span>
      </Button>
      <ReceiptPreviewDrawer
        open={showPreview}
        onOpenChange={setShowPreview}
        pkg={pkg}
        onPrint={handleConfirmPrint}
        isPrinting={isPrinting}
        receiptRef={receiptRef}
      />
      <PrinterDrawer
        open={showDrawer}
        onOpenChange={setShowDrawer}
        onPrinterSelected={() => {
          setShowDrawer(false);
          setTimeout(() => executePrint(), 500);
        }}
      />
    </>
  );
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function printViaBrowser(receiptRef: React.RefObject<HTMLDivElement | null>, pkg: ReceiptPkg) {
  const receiptHtml = receiptRef.current?.innerHTML || generateReceiptHTML(pkg);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Receipt - ${escapeHtml(pkg.trackingNumber)}</title>
      <style>body{margin:0;padding:20px;font-family:monospace;display:flex;justify-content:center}@media print{body{padding:0}}</style>
      </head><body>${receiptHtml}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  }
}

// ── ESC/POS helpers ──
const ESC = 0x1B;
const GS = 0x1D;

function escposInit(): number[] {
  return [ESC, 0x40]; // ESC @  – initialise printer
}

function escposAlignCenter(): number[] {
  return [ESC, 0x61, 0x01];
}

function escposAlignLeft(): number[] {
  return [ESC, 0x61, 0x00];
}

function escposAlignRight(): number[] {
  return [ESC, 0x61, 0x02];
}

function escposBoldOn(): number[] {
  return [ESC, 0x45, 0x01];
}

function escposBoldOff(): number[] {
  return [ESC, 0x45, 0x00];
}

function escposDoubleHeight(): number[] {
  return [ESC, 0x21, 0x10]; // double height
}

function escposNormal(): number[] {
  return [ESC, 0x21, 0x00]; // normal
}

function escposCut(): number[] {
  return [GS, 0x56, 0x00]; // full cut
}

function escposFeedLines(n: number): number[] {
  return [ESC, 0x64, n];
}

function escposQRCode(data: string): number[] {
  const encoder = new TextEncoder();
  const d = encoder.encode(data);
  const bytes: number[] = [];

  // Model 2
  bytes.push(GS, 0x28, 0x6B, 4, 0, 0x31, 0x41, 0x32, 0x00);
  // Size – 8 dots (larger for 576-dot width)
  bytes.push(GS, 0x28, 0x6B, 3, 0, 0x31, 0x43, 0x08);
  // Error correction – Level H
  bytes.push(GS, 0x28, 0x6B, 3, 0, 0x31, 0x45, 0x33);
  // Store data
  const storeLen = d.length + 3;
  bytes.push(GS, 0x28, 0x6B, storeLen & 0xFF, (storeLen >> 8) & 0xFF, 0x31, 0x50, 0x30, ...d);
  // Print QR
  bytes.push(GS, 0x28, 0x6B, 3, 0, 0x31, 0x51, 0x30);

  return bytes;
}

function textToBytes(text: string): number[] {
  return Array.from(new TextEncoder().encode(text));
}

function line(char = '-', width = 48): number[] {
  return textToBytes(char.repeat(width) + '\n');
}

function padRow(left: string, right: string, width = 48): string {
  const gap = width - left.length - right.length;
  return left + ' '.repeat(Math.max(1, gap)) + right + '\n';
}

function generateReceiptBytes(pkg: ReceiptPkg): Uint8Array {
  const TAX_RATE = 0.16;
  const taxable = (pkg.cost / (1 + TAX_RATE)).toFixed(2);
  const tax = (pkg.cost - Number(taxable)).toFixed(2);
  const deliveryLabel = pkg.deliveryType === 'pickup_point' ? 'AGENT PICKUP POINT'
    : pkg.deliveryType === 'doorstep' ? 'DOORSTEP DELIVERY'
    : pkg.deliveryType === 'xpress' ? 'XPRESS DELIVERY'
    : pkg.deliveryType === 'errand' ? 'ERRAND SERVICE'
    : pkg.deliveryType.toUpperCase();

  const dateStr = new Date(pkg.createdAt).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  const bytes: number[] = [];

  // Init & set 80mm line spacing
  bytes.push(...escposInit());
  // Set print area width to 576 dots
  bytes.push(GS, 0x57, 0x40, 0x02); // GS W nL nH = 576

  // ── Header ──
  bytes.push(...escposAlignCenter());
  bytes.push(...escposDoubleHeight());
  bytes.push(...escposBoldOn());
  bytes.push(...textToBytes('SWIFTDROP\n'));
  bytes.push(...escposBoldOff());
  bytes.push(...escposNormal());
  bytes.push(...textToBytes('Fast & Reliable Delivery\n'));
  bytes.push(...textToBytes('TEL: +254114606020\n'));
  bytes.push(...line('='));

  // ── Parcel info ──
  bytes.push(...textToBytes(`PARCEL NO: ${pkg.trackingNumber}\n`));
  bytes.push(...textToBytes('TOTAL ITEMS: 1\n'));
  bytes.push(...line('-'));

  // ── Sender details ──
  bytes.push(...escposAlignLeft());
  bytes.push(...escposBoldOn());
  bytes.push(...textToBytes('SENDER DETAILS\n'));
  bytes.push(...escposBoldOff());
  bytes.push(...textToBytes(`${pkg.senderName}\n`));
  if (pkg.senderAddress) bytes.push(...textToBytes(`${pkg.senderAddress}\n`));
  bytes.push(...textToBytes('\n'));
  bytes.push(...escposAlignRight());
  bytes.push(...escposBoldOn());
  bytes.push(...textToBytes('PRIORITY: A\n'));
  bytes.push(...escposBoldOff());
  bytes.push(...line('-'));

  // ── QR Code for tracking ──
  bytes.push(...escposAlignCenter());
  bytes.push(...escposQRCode(pkg.trackingNumber));
  bytes.push(...escposFeedLines(1));

  // ── Receiver details ──
  bytes.push(...escposAlignLeft());
  bytes.push(...escposBoldOn());
  bytes.push(...textToBytes('RECEIVER DETAILS\n'));
  bytes.push(...escposBoldOff());
  bytes.push(...textToBytes(`${pkg.receiverName}\n`));
  bytes.push(...textToBytes(`${pkg.receiverAddress}\n`));
  if (pkg.pickupPoint) bytes.push(...textToBytes(`${pkg.pickupPoint}\n`));
  bytes.push(...line('-'));

  // ── Tracking & type ──
  bytes.push(...escposBoldOn());
  bytes.push(...textToBytes(padRow(pkg.trackingNumber, deliveryLabel)));
  bytes.push(...escposBoldOff());
  bytes.push(...textToBytes('\n'));

  // ── Package details ──
  bytes.push(...textToBytes('Quantity: 1\n'));
  if (pkg.packageValue != null) {
    bytes.push(...textToBytes(`Value: ${pkg.packageValue.toLocaleString()} KES\n`));
  }
  if (pkg.packageDescription) {
    bytes.push(...textToBytes(`Desc: ${pkg.packageDescription}\n`));
  }
  bytes.push(...escposAlignRight());
  bytes.push(...escposBoldOn());
  bytes.push(...textToBytes(`${pkg.weight ?? 0} KG\n`));
  bytes.push(...escposBoldOff());
  bytes.push(...escposAlignLeft());
  bytes.push(...line('-'));

  // ── Cost breakdown ──
  const payMethod = pkg.paymentStatus === 'paid' ? 'PAID' : 'CASH';
  bytes.push(...escposBoldOn());
  bytes.push(...textToBytes(payMethod + '\n'));
  bytes.push(...escposBoldOff());
  bytes.push(...textToBytes(padRow('  TAXABLE', taxable)));
  bytes.push(...textToBytes(padRow('  TAX (16%)', tax)));
  bytes.push(...escposBoldOn());
  bytes.push(...textToBytes(padRow('  TOTAL', String(pkg.cost))));
  bytes.push(...escposBoldOff());

  // ── M-Pesa ref ──
  if (pkg.mpesaReceiptNumber) {
    bytes.push(...escposAlignCenter());
    bytes.push(...textToBytes(`M-Pesa Ref: ${pkg.mpesaReceiptNumber}\n`));
  }
  bytes.push(...line('-'));

  // ── Terms ──
  bytes.push(...escposAlignCenter());
  bytes.push(...escposBoldOn());
  bytes.push(...textToBytes('TERMS & CONDITIONS\n'));
  bytes.push(...escposBoldOff());
  bytes.push(...escposAlignLeft());
  bytes.push(...textToBytes('You MUST declare parcel VALUE. Above\n'));
  bytes.push(...textToBytes('Ksh.5000 to be insured by SENDER.\n'));
  bytes.push(...textToBytes('Compensation is up to Ksh.5000.\n'));
  bytes.push(...textToBytes('Perishable & Fragile not compensated.\n'));
  bytes.push(...textToBytes('FRAGILE ITEMS SENT AT OWNERS RISK\n'));
  bytes.push(...line('-'));

  // ── Printed on ──
  bytes.push(...escposAlignCenter());
  bytes.push(...textToBytes(`Printed on: ${dateStr}\n`));
  bytes.push(...line('-'));

  // ── Invoice QR ──
  bytes.push(...escposBoldOn());
  bytes.push(...textToBytes('INVOICE NO.\n'));
  bytes.push(...escposBoldOff());
  bytes.push(...escposQRCode(pkg.trackingNumber));
  bytes.push(...escposFeedLines(1));
  bytes.push(...textToBytes('POWERED BY SWIFTDROP\n'));

  // Feed & cut
  bytes.push(...escposFeedLines(4));
  bytes.push(...escposCut());

  return new Uint8Array(bytes);
}

const PRINTER_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
];

async function printViaBluetooth(pkg: ReceiptPkg) {
  const device = await (navigator as any).bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: PRINTER_SERVICE_UUIDS,
  });

  const server = await device.gatt?.connect();
  if (!server) throw new Error('Could not connect');

  const data = generateReceiptBytes(pkg);

  for (const serviceUUID of PRINTER_SERVICE_UUIDS) {
    try {
      const service = await server.getPrimaryService(serviceUUID);
      const characteristics = await service.getCharacteristics();
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          const chunkSize = 200;
          for (let i = 0; i < data.length; i += chunkSize) {
            const chunk = data.slice(i, i + chunkSize);
            if (char.properties.writeWithoutResponse) {
              await char.writeValueWithoutResponse(chunk);
            } else {
              await char.writeValue(chunk);
            }
            await new Promise(r => setTimeout(r, 30));
          }
          toast.success('Receipt printed!');
          return;
        }
      }
    } catch { /* try next */ }
  }
  throw new Error('No compatible printer service');
}

function generateReceiptHTML(pkg: ReceiptPkg) {
      return (
      <div 
        ref={ref}
        className="bg-white p-4 max-w-[380px] mx-auto text-black"
        style={{ fontFamily: 'monospace', fontSize: '11px', width: '380px' }}
      >
        {/* Header */}
        <div className="text-center border-b border-black pb-3 mb-3">
          <h1 className="text-xl font-bold tracking-wider">SWIFTDROP</h1>
          <p className="text-[10px] mt-1">Fast & Reliable Delivery</p>
          <p className="text-[10px]">TEL: +254114606020</p>
        </div>

        {/* Parcel Info */}
        <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
          <p className="text-[10px]">PARCEL NO: <span className="font-bold">{pkg.trackingNumber}</span></p>
          <p className="text-[10px]">TOTAL ITEMS: 1</p>
        </div>

        {/* Sender Details */}
        <div className="border border-black mb-3">
          <div className="flex">
            <div className="flex-1 p-2 border-r border-black">
              <p className="font-bold text-[11px] mb-1">SENDER DETAILS</p>
              <p>{pkg.senderName}</p>
              {pkg.senderAddress && <p className="text-[10px]">{pkg.senderAddress}</p>}
            </div>
            <div className="p-2 flex flex-col items-center justify-center w-20">
              <p className="text-[10px] font-bold">PRIORITY</p>
              <p className="text-2xl font-bold">A</p>
            </div>
          </div>
        </div>

        {/* Receiver Details with QR */}
        <div className="border border-black mb-3">
          <div className="flex">
            <div className="p-2 flex items-center justify-center border-r border-black">
              <QRCodeSVG 
                value={pkg.trackingNumber}
                size={64}
                level="H"
              />
            </div>
            <div className="flex-1 p-2">
              <p className="font-bold text-[11px] mb-1">RECEIVER DETAILS</p>
              <p>{pkg.receiverName}</p>
              <p className="text-[10px]">{pkg.receiverAddress}</p>
              {pkg.pickupPoint && (
                <p className="text-[10px]">{pkg.pickupPoint}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tracking & Type */}
        <div className="flex justify-between items-center mb-3">
          <p className="font-bold text-sm">{pkg.trackingNumber}</p>
          <span className="text-[10px] uppercase">{getDeliveryTypeName(pkg.deliveryType)}</span>
        </div>

        {/* Quantity & Weight */}
        <div className="flex justify-between items-center border-b border-dashed border-gray-400 pb-3 mb-3">
          <div>
            <p className="text-[10px]">Quantity: 1</p>
            {pkg.packageValue != null && <p className="text-[10px]">Value: {pkg.packageValue.toLocaleString()} KES</p>}
            {pkg.packageDescription && <p className="text-[10px]">Desc: {pkg.packageDescription}</p>}
          </div>
          <div className="border border-black px-3 py-1 text-center">
            <p className="font-bold">{pkg.weight ?? 0} KG</p>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="border border-black mb-3">
          <table className="w-full text-[11px]">
            <tbody>
              <tr className="border-b border-black">
                <td className="p-1 border-r border-black" rowSpan={2}>
                  <span className="font-bold">{pkg.paymentStatus === 'paid' ? 'PAID' : 'CASH'}</span>
                </td>
                <td className="p-1 border-r border-black text-right font-bold">TAXABLE</td>
                <td className="p-1 text-right">{taxable.toFixed(2)}</td>
              </tr>
              <tr className="border-b border-black">
                <td className="p-1 border-r border-black text-right font-bold">TAX (16%)</td>
                <td className="p-1 text-right">{tax.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="p-1 border-r border-black"></td>
                <td className="p-1 border-r border-black text-right font-bold">TOTAL</td>
                <td className="p-1 text-right font-bold">{pkg.cost.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* M-Pesa receipt if available */}
        {pkg.mpesaReceiptNumber && (
          <div className="text-center text-[10px] mb-3">
            <p>M-Pesa Ref: <span className="font-bold">{pkg.mpesaReceiptNumber}</span></p>
          </div>
        )}

        {/* Terms */}
        <div className="border border-black p-2 mb-3 text-[9px]">
          <p className="font-bold text-center text-[10px] mb-1">TERMS & CONDITIONS</p>
          <p>You MUST declare parcel VALUE. Above Ksh.5000 to be insured by SENDER. Compensation is up to Ksh.5000. Perishable & Fragile not compensated. FRAGILE ITEMS SENT AT OWNERS RISK</p>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] mb-3">
          <p>Printed on: {format(new Date(), 'dd MMM yyyy hh:mm a')}</p>
        </div>

        {/* Invoice QR */}
        <div className="text-center border-t border-dashed border-gray-400 pt-3">
          <p className="text-[10px] font-bold mb-2">INVOICE NO.</p>
          <div className="flex justify-center">
            <QRCodeSVG 
              value={pkg.trackingNumber}
              size={80}
              level="H"
            />
          </div>
          <p className="text-[9px] mt-2">POWERED BY SWIFTDROP</p>
        </div>
      </div>
    );
  }
);
