import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { BottomNav } from '@/components/BottomNav';
import { ArrowLeft, Bluetooth, Bell, HelpCircle, Info, Loader2, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function Preferences() {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
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
        setNotificationsEnabled(data.notifications_enabled ?? true);
      }
      
      // Check saved printer
      const savedPrinter = localStorage.getItem('bt_printer_name');
      if (savedPrinter) setConnectedPrinter(savedPrinter);
      
      setLoading(false);
    };
    
    fetchPreferences();
  }, [user]);

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

  const disconnectPrinter = () => {
    localStorage.removeItem('bt_printer_id');
    localStorage.removeItem('bt_printer_name');
    setConnectedPrinter(null);
    toast.success('Printer disconnected');
  };

  const savePreferences = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          bluetooth_enabled: bluetoothEnabled,
          notifications_enabled: notificationsEnabled,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      if (error) throw error;
      toast.success('Preferences saved');
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="gradient-hero px-4 py-6">
        <div className="flex items-center gap-3">
          <Link to="/sender" className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-primary-foreground" />
          </Link>
          <h1 className="font-display text-xl font-bold text-primary-foreground">Preferences</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bluetooth className="w-5 h-5" />
                  Bluetooth Printing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bluetooth" className="flex-1">
                    <span className="font-medium">Enable Bluetooth</span>
                    <p className="text-sm text-muted-foreground">Allow connecting to Bluetooth printers</p>
                  </Label>
                  <Switch id="bluetooth" checked={bluetoothEnabled} onCheckedChange={setBluetoothEnabled} />
                </div>
                
                {bluetoothEnabled && (
                  <div className="pt-2 border-t">
                    {connectedPrinter ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Printer className="w-4 h-4 text-primary" />
                          <div>
                            <p className="text-sm font-medium">{connectedPrinter}</p>
                            <p className="text-xs text-muted-foreground">Connected</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={disconnectPrinter}>
                          Disconnect
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="w-full gap-2" 
                        onClick={connectPrinter}
                        disabled={isConnecting}
                      >
                        {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bluetooth className="w-4 h-4" />}
                        Connect Printer
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Label htmlFor="notifications" className="flex-1">
                    <span className="font-medium">Push Notifications</span>
                    <p className="text-sm text-muted-foreground">Receive updates about your deliveries</p>
                  </Label>
                  <Switch id="notifications" checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  Support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link to="/feedback" className="flex items-center justify-between p-3 bg-secondary rounded-lg hover:bg-secondary/80">
                  <span>Contact Support</span>
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </Link>
                <Link to="/terms" className="flex items-center justify-between p-3 bg-secondary rounded-lg hover:bg-secondary/80">
                  <span>Help Center</span>
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </Link>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  About
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-2">
                  <p className="font-semibold">SwiftDrop</p>
                  <p className="text-sm text-muted-foreground">Version 1.0.0</p>
                  <p className="text-xs text-muted-foreground">Fast and reliable package delivery across Kenya</p>
                </div>
              </CardContent>
            </Card>

            <Button onClick={savePreferences} className="w-full h-12" disabled={saving}>
              {saving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>) : 'Save Preferences'}
            </Button>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
