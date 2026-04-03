import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { BottomNav } from '@/components/BottomNav';
import { ChevronLeft, Bluetooth, Printer, Info, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function Preferences() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(true);
  const [connectedPrinter, setConnectedPrinter] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchPreferences = async () => {
      const { data } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setBluetoothEnabled(data.bluetooth_enabled ?? true);
      }
      const savedPrinter = localStorage.getItem('bt_printer_name');
      if (savedPrinter) setConnectedPrinter(savedPrinter);
      setLoading(false);
    };
    fetchPreferences();
  }, [user]);

  const toggleBluetooth = async (enabled: boolean) => {
    setBluetoothEnabled(enabled);
    if (!user) return;
    await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        bluetooth_enabled: enabled,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
  };

  const connectPrinter = async () => {
    if (!('bluetooth' in navigator)) {
      toast.error('Bluetooth is not supported on this device');
      return;
    }
    setIsConnecting(true);
    try {
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
      if (device) {
        const name = device.name || 'Bluetooth Printer';
        localStorage.setItem('bt_printer_id', device.id);
        localStorage.setItem('bt_printer_name', name);
        setConnectedPrinter(name);
        toast.success(`Connected to ${name}`);
      }
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        toast.error('Failed to connect to printer');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const troubleshoot = () => {
    localStorage.removeItem('bt_printer_id');
    localStorage.removeItem('bt_printer_name');
    setConnectedPrinter(null);
    toast.success('Cache cleared. Try reconnecting your printer.');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-lg font-bold">Settings</h1>
      </div>

      <div className="px-4 pt-6 space-y-6">
        {/* Printer Section */}
        <div>
          <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">Printer</h2>
          
          <div className="space-y-4">
            {/* Bluetooth Status */}
            <div className="flex items-center gap-4">
              <Bluetooth className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">Bluetooth Status</p>
                <p className="text-sm text-muted-foreground">Handle bluetooth connection</p>
              </div>
              <Switch checked={bluetoothEnabled} onCheckedChange={toggleBluetooth} />
            </div>

            {/* Printer Connection */}
            <div className="flex items-center gap-4">
              <Printer className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">Printer Connection</p>
                <p className="text-sm text-muted-foreground">
                  {connectedPrinter
                    ? `Connected to ${connectedPrinter}`
                    : 'You are currently not connected to any printer'}
                </p>
              </div>
              <Button
                variant="default"
                size="sm"
                className="rounded-full px-5"
                onClick={connectPrinter}
                disabled={isConnecting || !bluetoothEnabled}
              >
                {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect'}
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-border" />

        {/* About Agent App */}
        <div>
          <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">About Agent App</h2>
          
          <div className="space-y-4">
            {/* App Version */}
            <div className="flex items-center gap-4">
              <Info className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">App version</p>
                <p className="text-sm text-muted-foreground">Current app Version is 1.0.0</p>
              </div>
            </div>

            {/* Troubleshooting */}
            <div className="flex items-center gap-4">
              <RefreshCw className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">Trouble Shooting</p>
                <p className="text-sm text-muted-foreground">Trouble shoot the app</p>
              </div>
              <Button
                variant="default"
                size="sm"
                className="rounded-full px-5"
                onClick={troubleshoot}
              >
                Troubleshoot
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-border" />
      </div>

      <BottomNav />
    </div>
  );
}
