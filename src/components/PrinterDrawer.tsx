import { useState, useEffect } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Bluetooth, Printer, Loader2, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';

interface PrinterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrinterSelected: (device: { id: string; name: string }) => void;
}

export function PrinterDrawer({ open, onOpenChange, onPrinterSelected }: PrinterDrawerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [connectedPrinter, setConnectedPrinter] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('bt_printer_name');
    setConnectedPrinter(saved);
  }, [open]);

  const scanForPrinters = async () => {
    if (!('bluetooth' in navigator)) {
      toast.error('Bluetooth is not supported on this device');
      return;
    }

    setIsScanning(true);
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          '49535343-fe7d-4ae5-8fa9-9fafd205e455',
          '0000ff00-0000-1000-8000-00805f9b34fb',
          '0000ffe0-0000-1000-8000-00805f9b34fb',
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        ],
      });

      if (device) {
        const name = device.name || 'Bluetooth Printer';
        localStorage.setItem('bt_printer_id', device.id);
        localStorage.setItem('bt_printer_name', name);
        setConnectedPrinter(name);
        toast.success(`Connected to ${name}`);
        onPrinterSelected({ id: device.id, name });
      }
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        toast.error('Failed to connect to printer');
      }
    } finally {
      setIsScanning(false);
    }
  };

  const disconnectPrinter = () => {
    localStorage.removeItem('bt_printer_id');
    localStorage.removeItem('bt_printer_name');
    setConnectedPrinter(null);
    toast.success('Printer disconnected');
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Printer className="w-6 h-6 text-primary" />
          </div>
          <DrawerTitle className="font-display">Printer Settings</DrawerTitle>
          <DrawerDescription>Connect a Bluetooth thermal printer to print receipts</DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-2 space-y-4">
          {/* Current Printer Status */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              {connectedPrinter ? (
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                  <Wifi className="w-5 h-5 text-success" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <WifiOff className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {connectedPrinter || 'No printer connected'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {connectedPrinter ? 'Ready to print' : 'Tap scan to find a printer'}
                </p>
              </div>
              {connectedPrinter && (
                <Button variant="ghost" size="sm" onClick={disconnectPrinter} className="text-destructive text-xs">
                  Remove
                </Button>
              )}
            </div>
          </div>

          {/* Scan Button */}
          <Button
            className="w-full h-12 gap-2"
            onClick={scanForPrinters}
            disabled={isScanning}
          >
            {isScanning ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Bluetooth className="w-5 h-5" />
            )}
            {isScanning ? 'Scanning...' : connectedPrinter ? 'Change Printer' : 'Scan for Printers'}
          </Button>
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
