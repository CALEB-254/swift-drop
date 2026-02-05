 import { useState, useEffect } from 'react';
 import { Link } from 'react-router-dom';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { BottomNav } from '@/components/BottomNav';
 import { 
   Package, 
   Users, 
   MapPin, 
   DollarSign, 
   TrendingUp,
   Loader2,
   Eye,
   CheckCircle,
   XCircle
 } from 'lucide-react';
 import { supabase } from '@/integrations/supabase/client';
 import { format } from 'date-fns';
 import { StatusBadge } from '@/components/StatusBadge';
 
 interface Stats {
   totalPackages: number;
   totalUsers: number;
   totalAgents: number;
   totalRevenue: number;
   pendingPackages: number;
   deliveredPackages: number;
 }
 
 interface PackageRow {
   id: string;
   tracking_number: string;
   sender_name: string;
   receiver_name: string;
   status: string;
   cost: number;
   payment_status: string;
   created_at: string;
 }
 
 interface ProfileRow {
   id: string;
   full_name: string;
   phone: string;
   role: string;
   created_at: string;
 }
 
 export default function AdminDashboard() {
   const [loading, setLoading] = useState(true);
   const [stats, setStats] = useState<Stats>({
     totalPackages: 0,
     totalUsers: 0,
     totalAgents: 0,
     totalRevenue: 0,
     pendingPackages: 0,
     deliveredPackages: 0,
   });
   const [packages, setPackages] = useState<PackageRow[]>([]);
   const [users, setUsers] = useState<ProfileRow[]>([]);
 
   useEffect(() => {
     fetchData();
   }, []);
 
   const fetchData = async () => {
     setLoading(true);
     
     // Fetch all packages
     const { data: packagesData } = await supabase
       .from('packages')
       .select('*')
       .order('created_at', { ascending: false })
       .limit(50);
     
     // Fetch all profiles
     const { data: profilesData } = await supabase
       .from('profiles')
       .select('*')
       .order('created_at', { ascending: false });
     
     if (packagesData) {
       setPackages(packagesData);
       
       const paidPackages = packagesData.filter(p => p.payment_status === 'paid');
       const totalRevenue = paidPackages.reduce((sum, p) => sum + (p.cost || 0), 0);
       
       setStats(prev => ({
         ...prev,
         totalPackages: packagesData.length,
         totalRevenue,
         pendingPackages: packagesData.filter(p => p.status === 'pending').length,
         deliveredPackages: packagesData.filter(p => p.status === 'delivered').length,
       }));
     }
     
     if (profilesData) {
       setUsers(profilesData);
       setStats(prev => ({
         ...prev,
         totalUsers: profilesData.filter(p => p.role === 'sender').length,
         totalAgents: profilesData.filter(p => p.role === 'agent').length,
       }));
     }
     
     setLoading(false);
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
       <div className="gradient-hero px-4 py-6">
         <h1 className="font-display text-2xl font-bold text-primary-foreground">
           Admin Dashboard
         </h1>
         <p className="text-primary-foreground/80 text-sm">
           Manage your delivery platform
         </p>
       </div>
 
       <div className="px-4 py-6 space-y-6">
         {/* Stats Grid */}
         <div className="grid grid-cols-2 gap-3">
           <Card className="border-0 shadow-card">
             <CardContent className="p-4">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                   <Package className="w-5 h-5 text-primary" />
                 </div>
                 <div>
                   <p className="text-2xl font-bold">{stats.totalPackages}</p>
                   <p className="text-xs text-muted-foreground">Total Packages</p>
                 </div>
               </div>
             </CardContent>
           </Card>
           
           <Card className="border-0 shadow-card">
             <CardContent className="p-4">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                   <DollarSign className="w-5 h-5 text-accent" />
                 </div>
                 <div>
                   <p className="text-2xl font-bold">KES {stats.totalRevenue.toLocaleString()}</p>
                   <p className="text-xs text-muted-foreground">Total Revenue</p>
                 </div>
               </div>
             </CardContent>
           </Card>
           
           <Card className="border-0 shadow-card">
             <CardContent className="p-4">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                   <Users className="w-5 h-5 text-blue-500" />
                 </div>
                 <div>
                   <p className="text-2xl font-bold">{stats.totalUsers}</p>
                   <p className="text-xs text-muted-foreground">Senders</p>
                 </div>
               </div>
             </CardContent>
           </Card>
           
           <Card className="border-0 shadow-card">
             <CardContent className="p-4">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                   <MapPin className="w-5 h-5 text-purple-500" />
                 </div>
                 <div>
                   <p className="text-2xl font-bold">{stats.totalAgents}</p>
                   <p className="text-xs text-muted-foreground">Agents</p>
                 </div>
               </div>
             </CardContent>
           </Card>
         </div>
 
         {/* Tabs */}
         <Tabs defaultValue="packages" className="w-full">
           <TabsList className="grid w-full grid-cols-2">
             <TabsTrigger value="packages">Packages</TabsTrigger>
             <TabsTrigger value="users">Users</TabsTrigger>
           </TabsList>
           
           <TabsContent value="packages" className="mt-4 space-y-3">
             {packages.map((pkg) => (
               <Card key={pkg.id} className="border-0 shadow-card">
                 <CardContent className="p-4">
                   <div className="flex items-start justify-between">
                     <div>
                       <p className="font-mono text-sm font-medium">{pkg.tracking_number}</p>
                       <p className="text-sm text-muted-foreground">
                         {pkg.sender_name} → {pkg.receiver_name}
                       </p>
                       <p className="text-xs text-muted-foreground mt-1">
                         {format(new Date(pkg.created_at), 'MMM d, yyyy')}
                       </p>
                     </div>
                     <div className="text-right space-y-1">
                       <StatusBadge status={pkg.status as any} />
                       <p className="text-sm font-medium">KES {pkg.cost}</p>
                       <span className={`text-xs ${pkg.payment_status === 'paid' ? 'text-primary' : 'text-muted-foreground'}`}>
                         {pkg.payment_status}
                       </span>
                     </div>
                   </div>
                 </CardContent>
               </Card>
             ))}
           </TabsContent>
           
           <TabsContent value="users" className="mt-4 space-y-3">
             {users.map((user) => (
               <Card key={user.id} className="border-0 shadow-card">
                 <CardContent className="p-4">
                   <div className="flex items-center justify-between">
                     <div>
                       <p className="font-medium">{user.full_name}</p>
                       <p className="text-sm text-muted-foreground">{user.phone}</p>
                       <p className="text-xs text-muted-foreground">
                         Joined {format(new Date(user.created_at), 'MMM d, yyyy')}
                       </p>
                     </div>
                     <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                       user.role === 'agent' 
                         ? 'bg-purple-500/10 text-purple-500' 
                         : user.role === 'admin'
                         ? 'bg-primary/10 text-primary'
                         : 'bg-blue-500/10 text-blue-500'
                     }`}>
                       {user.role}
                     </span>
                   </div>
                 </CardContent>
               </Card>
             ))}
           </TabsContent>
         </Tabs>
       </div>
       <BottomNav />
     </div>
   );
 }