import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, X, SwitchCamera, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface QRScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (trackingNumber: string) => void;
}

export function QRScanner({ open, onClose, onScan }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef(false);
  const scannerContainerId = 'qr-scanner-container';

  const stopScanning = useCallback(async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch (err) {
      console.error('Error stopping scanner:', err);
    }
  }, []);

  const handleScanSuccess = useCallback((decodedText: string) => {
    if (hasScannedRef.current) return;
    hasScannedRef.current = true;

    let trackingNumber = decodedText;
    try {
      const url = new URL(decodedText);
      const trackingParam = url.searchParams.get('q') || url.searchParams.get('id') || url.searchParams.get('tracking');
      if (trackingParam) trackingNumber = trackingParam;
    } catch {
      // Not a URL
    }

    if (trackingNumber.toUpperCase().startsWith('MTN') || trackingNumber.length >= 8) {
      stopScanning();
      toast.success('QR Code scanned!');
      onScan(trackingNumber);
      onClose();
    } else {
      hasScannedRef.current = false;
      toast.error('Invalid QR code - not a valid tracking number');
    }
  }, [onScan, onClose, stopScanning]);

  const initScanner = useCallback(async (cameraId: string) => {
    try {
      await stopScanning();

      const scanner = new Html5Qrcode(scannerContainerId);
      scannerRef.current = scanner;

      await scanner.start(
        cameraId,
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText: string) => handleScanSuccess(decodedText),
        () => {} // Ignore scan failures
      );
    } catch (err) {
      console.error('Scanner init error:', err);
      setError('Failed to start camera scanner');
    }
  }, [stopScanning, handleScanSuccess]);

  const startScanning = useCallback(async () => {
    setError(null);
    hasScannedRef.current = false;
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
        const backIdx = devices.findIndex(d =>
          d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear')
        );
        const startIndex = backIdx >= 0 ? backIdx : 0;
        setCurrentCameraIndex(startIndex);
        await initScanner(devices[startIndex].id);
      } else {
        setError('No cameras found on this device');
      }
    } catch {
      setError('Unable to access camera. Please grant camera permissions.');
    }
  }, [initScanner]);

  useEffect(() => {
    if (open) {
      hasScannedRef.current = false;
      startScanning();
    } else {
      stopScanning();
    }
    return () => { stopScanning(); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchCamera = async () => {
    if (cameras.length <= 1) return;
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);
    await initScanner(cameras[nextIndex].id);
  };

  const handleClose = () => {
    stopScanning();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Scan QR Code
          </DialogTitle>
        </DialogHeader>
        <div className="relative">
          {error ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={startScanning} className="mt-4">Try Again</Button>
            </div>
          ) : (
            <>
              <div id={scannerContainerId} className="w-full aspect-square bg-black" />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-64 border-2 border-primary rounded-lg relative">
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />
                </div>
              </div>
              {cameras.length > 1 && (
                <Button variant="secondary" size="icon" className="absolute top-2 right-2" onClick={switchCamera}>
                  <SwitchCamera className="w-5 h-5" />
                </Button>
              )}
            </>
          )}
        </div>
        <div className="p-4 pt-2 text-center">
          <p className="text-sm text-muted-foreground mb-3">Position the QR code within the frame to scan</p>
          <Button variant="outline" onClick={handleClose} className="w-full">
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
