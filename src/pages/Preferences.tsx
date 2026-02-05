 import { useState, useEffect } from 'react';
 import { Link } from 'react-router-dom';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Switch } from '@/components/ui/switch';
 import { Label } from '@/components/ui/label';
 import { BottomNav } from '@/components/BottomNav';
 import { TopHeader } from '@/components/TopHeader';
 import { ArrowLeft, Bluetooth, Bell, HelpCircle, Info, Loader2 } from 'lucide-react';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuthContext } from '@/contexts/AuthContext';
 import { toast } from 'sonner';
 
 export default function Preferences() {
   const { user } = useAuthContext();
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [bluetoothEnabled, setBluetoothEnabled] = useState(true);
   const [notificationsEnabled, setNotificationsEnabled] = useState(true);
 
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
       setLoading(false);
     };
     
     fetchPreferences();
   }, [user]);
 
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
     } catch (error) {
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
           <h1 className="font-display text-xl font-bold text-primary-foreground">
             Preferences
           </h1>
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
                     <p className="text-sm text-muted-foreground">
                       Allow connecting to Bluetooth printers
                     </p>
                   </Label>
                   <Switch
                     id="bluetooth"
                     checked={bluetoothEnabled}
                     onCheckedChange={setBluetoothEnabled}
                   />
                 </div>
               </CardContent>
             </Card>
 
             <Card className="border-0 shadow-card">
               <CardHeader>
                 <CardTitle className="text-lg flex items-center gap-2">
                   <Bell className="w-5 h-5" />
                   Notifications
                 </CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="flex items-center justify-between">
                   <Label htmlFor="notifications" className="flex-1">
                     <span className="font-medium">Push Notifications</span>
                     <p className="text-sm text-muted-foreground">
                       Receive updates about your deliveries
                     </p>
                   </Label>
                   <Switch
                     id="notifications"
                     checked={notificationsEnabled}
                     onCheckedChange={setNotificationsEnabled}
                   />
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
                   <p className="font-semibold">Canyi Delivery</p>
                   <p className="text-sm text-muted-foreground">Version 1.0.0</p>
                   <p className="text-xs text-muted-foreground">
                     Fast and reliable package delivery across Kenya
                   </p>
                 </div>
               </CardContent>
             </Card>
 
             <Button 
               onClick={savePreferences} 
               className="w-full h-12"
               disabled={saving}
             >
               {saving ? (
                 <>
                   <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                   Saving...
                 </>
               ) : (
                 'Save Preferences'
               )}
             </Button>
           </>
         )}
       </div>
       <BottomNav />
     </div>
   );
 }