import { useState, useEffect } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Bluetooth, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

interface SavedPrinter {
  id: string;
  name: string;
}

interface PrinterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrinterSelected: (device: SavedPrinter) => void;
}

function getSavedPrinters(): SavedPrinter[] {
  try {
    const raw = localStorage.getItem('bt_printers');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePrinters(printers: SavedPrinter[]) {
  localStorage.setItem('bt_printers', JSON.stringify(printers));
}

function setActivePrinter(printer: SavedPrinter) {
  localStorage.setItem('bt_printer_id', printer.id);
  localStorage.setItem('bt_printer_name', printer.name);
}

export function PrinterDrawer({ open, onOpenChange, onPrinterSelected }: PrinterDrawerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [printers, setPrinters] = useState<SavedPrinter[]>([]);

  useEffect(() => {
    if (open) {
      setPrinters(getSavedPrinters());
      // Auto-scan on open
      scanForPrinters();
    }
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
        const newPrinter: SavedPrinter = { id: device.id, name };

        const existing = getSavedPrinters();
        const alreadyExists = existing.some(p => p.id === device.id);
        if (!alreadyExists) {
          const updated = [...existing, newPrinter];
          savePrinters(updated);
          setPrinters(updated);
        }

        setActivePrinter(newPrinter);
        toast.success(`Connected to ${name}`);
        onPrinterSelected(newPrinter);
      }
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        toast.error('Failed to connect to printer');
      }
    } finally {
      setIsScanning(false);
    }
  };

  const connectPrinter = (printer: SavedPrinter) => {
    setActivePrinter(printer);
    toast.success(`Connected to ${printer.name}`);
    onPrinterSelected(printer);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-primary rounded-full" />
            <DrawerTitle className="text-base font-bold tracking-tight">Bluetooth Devices</DrawerTitle>
          </div>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 bg-muted/60">
              <X className="w-4 h-4" />
            </Button>
          </DrawerClose>
        </div>

        <div className="px-4 pb-4 min-h-[180px]">
          {isScanning && printers.length === 0 && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Scanning...</span>
            </div>
          )}

          {printers.map((printer, index) => (
            <div key={printer.id}>
              <div className="flex items-center justify-between py-3.5">
                <div className="min-w-0 flex-1 mr-3">
                  <p className="text-sm font-medium truncate">{printer.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{printer.id}</p>
                </div>
                <Button
                  size="sm"
                  className="rounded-full px-6 h-9 bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shrink-0"
                  onClick={() => connectPrinter(printer)}
                >
                  Connect
                </Button>
              </div>
              {index < printers.length - 1 && <Separator className="bg-primary/20" />}
            </div>
          ))}

          {!isScanning && printers.length === 0 && (
            <div className="text-center py-10">
              <Bluetooth className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No devices found</p>
              <p className="text-xs text-muted-foreground mt-1">Make sure Bluetooth is enabled</p>
            </div>
          )}
        </div>

        <DrawerFooter className="pt-0">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={scanForPrinters}
            disabled={isScanning}
          >
            {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bluetooth className="w-4 h-4" />}
            {isScanning ? 'Scanning...' : 'Scan Again'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
