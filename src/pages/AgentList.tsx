 import { useState, useEffect } from 'react';
 import { Link } from 'react-router-dom';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Card, CardContent } from '@/components/ui/card';
 import { BottomNav } from '@/components/BottomNav';
 import { ArrowLeft, Search, MapPin, Phone, Clock, Loader2 } from 'lucide-react';
 import { supabase } from '@/integrations/supabase/client';
 
 interface Agent {
   id: string;
   business_name: string;
   location: string;
   phone: string;
   address: string | null;
   services: string[];
   operating_hours: string | null;
   is_active: boolean;
 }
 
 export default function AgentList() {
   const [agents, setAgents] = useState<Agent[]>([]);
   const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
   const [loading, setLoading] = useState(true);
   const [searchQuery, setSearchQuery] = useState('');
 
    useEffect(() => {
      const fetchAgents = async () => {
        const { data, error } = await supabase
          .from('agents')
          .select('*')
          .eq('is_active', true)
          .order('business_name');
        
        if (data) {
          // Only show agents created by admin (those with tracking_prefix in services)
          const adminAgents = data.filter(agent => 
            agent.services?.some((s: string) => s.startsWith('tracking_prefix:'))
          );
          setAgents(adminAgents);
          setFilteredAgents(adminAgents);
        }
        setLoading(false);
      };
      
      fetchAgents();
    }, []);
 
   useEffect(() => {
     if (!searchQuery.trim()) {
       setFilteredAgents(agents);
       return;
     }
     
     const query = searchQuery.toLowerCase();
     const filtered = agents.filter(agent => 
       agent.business_name.toLowerCase().includes(query) ||
       agent.location.toLowerCase().includes(query) ||
       (agent.address && agent.address.toLowerCase().includes(query))
     );
     setFilteredAgents(filtered);
   }, [searchQuery, agents]);
 
   return (
     <div className="min-h-screen bg-background pb-20">
       <div className="gradient-hero px-4 py-6">
         <div className="flex items-center gap-3 mb-4">
           <Link to="/sender" className="p-2 -ml-2">
             <ArrowLeft className="w-6 h-6 text-primary-foreground" />
           </Link>
           <h1 className="font-display text-xl font-bold text-primary-foreground">
             Agent Locations
           </h1>
         </div>
         
         <div className="relative">
           <div className="bg-card rounded-lg flex items-center overflow-hidden">
             <div className="px-4">
               <Search className="w-5 h-5 text-muted-foreground" />
             </div>
             <Input
               placeholder="Search by name or location..."
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
         ) : filteredAgents.length === 0 ? (
           <Card className="border-0 shadow-card">
             <CardContent className="flex flex-col items-center justify-center py-12">
               <MapPin className="w-16 h-16 text-muted-foreground mb-4" />
               <h3 className="font-display font-semibold text-lg mb-2">
                 {searchQuery ? 'No agents found' : 'No agents available'}
               </h3>
               <p className="text-muted-foreground text-center">
                 {searchQuery 
                   ? 'Try a different search term' 
                   : 'Agents will appear here once registered'}
               </p>
             </CardContent>
           </Card>
         ) : (
           <div className="space-y-3">
             {filteredAgents.map((agent) => (
               <Card key={agent.id} className="border-0 shadow-card">
                 <CardContent className="p-4">
                   <div className="flex items-start justify-between">
                     <div className="flex-1">
                       <h3 className="font-semibold">{agent.business_name}</h3>
                       <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                         <MapPin className="w-4 h-4" />
                         <span>{agent.location}</span>
                       </div>
                       {agent.address && (
                         <p className="text-sm text-muted-foreground mt-1 ml-6">
                           {agent.address}
                         </p>
                       )}
                       <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                         <Phone className="w-4 h-4" />
                         <a href={`tel:${agent.phone}`} className="text-primary">
                           {agent.phone}
                         </a>
                       </div>
                       {agent.operating_hours && (
                         <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                           <Clock className="w-4 h-4" />
                           <span>{agent.operating_hours}</span>
                         </div>
                       )}
                     </div>
                     <div className="flex flex-wrap gap-1">
                       {agent.services.map((service) => (
                         <span 
                           key={service}
                           className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full capitalize"
                         >
                           {service}
                         </span>
                       ))}
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