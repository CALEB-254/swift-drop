 import { useState, useEffect } from 'react';
 import { Link } from 'react-router-dom';
 import { Card, CardContent } from '@/components/ui/card';
 import { Input } from '@/components/ui/input';
 import { BottomNav } from '@/components/BottomNav';
 import { ArrowLeft, Search, User, Phone, Package, Loader2 } from 'lucide-react';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuthContext } from '@/contexts/AuthContext';
 
 interface Customer {
   receiver_name: string;
   receiver_phone: string;
   receiver_address: string;
   package_count: number;
 }
 
 export default function Customers() {
   const { user } = useAuthContext();
   const [customers, setCustomers] = useState<Customer[]>([]);
   const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
   const [loading, setLoading] = useState(true);
   const [searchQuery, setSearchQuery] = useState('');
 
   useEffect(() => {
     if (!user) return;
     
     const fetchCustomers = async () => {
       // Get unique receivers from user's packages
       const { data, error } = await supabase
         .from('packages')
         .select('receiver_name, receiver_phone, receiver_address')
         .eq('user_id', user.id);
       
       if (data) {
         // Group by receiver phone to get unique customers with package count
         const customerMap = new Map<string, Customer>();
         data.forEach(pkg => {
           const key = pkg.receiver_phone;
           if (customerMap.has(key)) {
             const existing = customerMap.get(key)!;
             existing.package_count++;
           } else {
             customerMap.set(key, {
               receiver_name: pkg.receiver_name,
               receiver_phone: pkg.receiver_phone,
               receiver_address: pkg.receiver_address,
               package_count: 1,
             });
           }
         });
         
         const customerList = Array.from(customerMap.values())
           .sort((a, b) => b.package_count - a.package_count);
         setCustomers(customerList);
         setFilteredCustomers(customerList);
       }
       setLoading(false);
     };
     
     fetchCustomers();
   }, [user]);
 
   useEffect(() => {
     if (!searchQuery.trim()) {
       setFilteredCustomers(customers);
       return;
     }
     
     const query = searchQuery.toLowerCase();
     const filtered = customers.filter(customer => 
       customer.receiver_name.toLowerCase().includes(query) ||
       customer.receiver_phone.includes(query) ||
       customer.receiver_address.toLowerCase().includes(query)
     );
     setFilteredCustomers(filtered);
   }, [searchQuery, customers]);
 
   return (
     <div className="min-h-screen bg-background pb-20">
       <div className="gradient-hero px-4 py-6">
         <div className="flex items-center gap-3 mb-4">
           <Link to="/sender" className="p-2 -ml-2">
             <ArrowLeft className="w-6 h-6 text-primary-foreground" />
           </Link>
           <h1 className="font-display text-xl font-bold text-primary-foreground">
             My Customers
           </h1>
         </div>
         
         <div className="relative">
           <div className="bg-card rounded-lg flex items-center overflow-hidden">
             <div className="px-4">
               <Search className="w-5 h-5 text-muted-foreground" />
             </div>
             <Input
               placeholder="Search customers..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="border-0 focus-visible:ring-0 bg-transparent"
             />
           </div>
         </div>
       </div>
 
       <div className="px-4 py-6">
         {loading ? (
           <div className="flex items-center justify-center py-12">
             <Loader2 className="w-8 h-8 animate-spin text-primary" />
           </div>
         ) : filteredCustomers.length === 0 ? (
           <Card className="border-0 shadow-card">
             <CardContent className="flex flex-col items-center justify-center py-12">
               <User className="w-16 h-16 text-muted-foreground mb-4" />
               <h3 className="font-display font-semibold text-lg mb-2">
                 {searchQuery ? 'No customers found' : 'No customers yet'}
               </h3>
               <p className="text-muted-foreground text-center">
                 {searchQuery 
                   ? 'Try a different search term' 
                   : 'Your delivery recipients will appear here'}
               </p>
             </CardContent>
           </Card>
         ) : (
           <div className="space-y-3">
             {filteredCustomers.map((customer, index) => (
               <Card key={index} className="border-0 shadow-card">
                 <CardContent className="p-4">
                   <div className="flex items-start justify-between">
                     <div className="flex-1">
                       <div className="flex items-center gap-2">
                         <User className="w-4 h-4 text-primary" />
                         <h3 className="font-semibold">{customer.receiver_name}</h3>
                       </div>
                       <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                         <Phone className="w-4 h-4" />
                         <a href={`tel:${customer.receiver_phone}`} className="text-primary">
                           {customer.receiver_phone}
                         </a>
                       </div>
                       <p className="text-sm text-muted-foreground mt-1 ml-6">
                         {customer.receiver_address}
                       </p>
                     </div>
                     <div className="flex items-center gap-1 text-muted-foreground">
                       <Package className="w-4 h-4" />
                       <span className="text-sm">{customer.package_count}</span>
                     </div>
                   </div>
                 </CardContent>
               </Card>
             ))}
           </div>
         )}
       </div>
       <BottomNav />
     </div>
   );
 }