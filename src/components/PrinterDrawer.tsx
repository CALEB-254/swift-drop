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
import { Bluetooth, Printer, Loader2, Wifi, WifiOff, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';

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

function getActivePrinterId(): string | null {
  return localStorage.getItem('bt_printer_id');
}

function setActivePrinter(printer: SavedPrinter) {
  localStorage.setItem('bt_printer_id', printer.id);
  localStorage.setItem('bt_printer_name', printer.name);
}

export function PrinterDrawer({ open, onOpenChange, onPrinterSelected }: PrinterDrawerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [printers, setPrinters] = useState<SavedPrinter[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPrinters(getSavedPrinters());
      setActiveId(getActivePrinterId());
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

        // Auto-select the newly paired printer
        setActivePrinter(newPrinter);
        setActiveId(newPrinter.id);
        toast.success(`Paired with ${name}`);
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

  const selectPrinter = (printer: SavedPrinter) => {
    setActivePrinter(printer);
    setActiveId(printer.id);
    toast.success(`Selected ${printer.name}`);
    onPrinterSelected(printer);
  };

  const removePrinter = (id: string) => {
    const updated = printers.filter(p => p.id !== id);
    savePrinters(updated);
    setPrinters(updated);

    if (activeId === id) {
      localStorage.removeItem('bt_printer_id');
      localStorage.removeItem('bt_printer_name');
      setActiveId(null);
    }
    toast.success('Printer removed');
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Printer className="w-6 h-6 text-primary" />
          </div>
          <DrawerTitle className="font-display">Printer Settings</DrawerTitle>
          <DrawerDescription>Manage your Bluetooth thermal printers</DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-2 space-y-3 max-h-[50vh] overflow-y-auto">
          {printers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
              <WifiOff className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No printers paired yet</p>
              <p className="text-xs text-muted-foreground mt-1">Tap "Scan" to find nearby printers</p>
            </div>
          ) : (
            printers.map((printer) => {
              const isActive = printer.id === activeId;
              return (
                <div
                  key={printer.id}
                  className={`rounded-xl border p-3 flex items-center gap-3 transition-colors cursor-pointer ${
                    isActive
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:bg-muted/50'
                  }`}
                  onClick={() => selectPrinter(printer)}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-primary/10' : 'bg-muted'
                  }`}>
                    {isActive ? (
                      <Wifi className="w-5 h-5 text-primary" />
                    ) : (
                      <Bluetooth className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{printer.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {isActive ? 'Active printer' : 'Tap to select'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isActive && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-primary-foreground" />
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePrinter(printer.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}

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
            {isScanning ? 'Scanning...' : 'Scan for Printers'}
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
