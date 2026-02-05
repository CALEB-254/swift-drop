 import { Link } from 'react-router-dom';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { BottomNav } from '@/components/BottomNav';
 import { ArrowLeft } from 'lucide-react';
 
 export default function Terms() {
   return (
     <div className="min-h-screen bg-background pb-20">
       <div className="gradient-hero px-4 py-6">
         <div className="flex items-center gap-3">
           <Link to="/sender" className="p-2 -ml-2">
             <ArrowLeft className="w-6 h-6 text-primary-foreground" />
           </Link>
           <h1 className="font-display text-xl font-bold text-primary-foreground">
             Terms & Conditions
           </h1>
         </div>
       </div>
 
       <div className="px-4 py-6 space-y-4">
         <Card className="border-0 shadow-card">
           <CardHeader>
             <CardTitle className="text-lg">1. Acceptance of Terms</CardTitle>
           </CardHeader>
           <CardContent className="text-sm text-muted-foreground space-y-2">
             <p>
               By using Canyi Delivery services, you agree to be bound by these terms and conditions.
               If you do not agree to these terms, please do not use our services.
             </p>
           </CardContent>
         </Card>
 
         <Card className="border-0 shadow-card">
           <CardHeader>
             <CardTitle className="text-lg">2. Service Description</CardTitle>
           </CardHeader>
           <CardContent className="text-sm text-muted-foreground space-y-2">
             <p>
               Canyi Delivery provides package pickup and delivery services through a network of agents.
               We offer various delivery options including express delivery, pickup points, doorstep delivery, and errand services.
             </p>
           </CardContent>
         </Card>
 
         <Card className="border-0 shadow-card">
           <CardHeader>
             <CardTitle className="text-lg">3. User Responsibilities</CardTitle>
           </CardHeader>
           <CardContent className="text-sm text-muted-foreground space-y-2">
             <p>Users must provide accurate information when creating deliveries.</p>
             <p>Users are responsible for ensuring packages comply with our prohibited items policy.</p>
             <p>Users must ensure recipients are available to receive packages.</p>
           </CardContent>
         </Card>
 
         <Card className="border-0 shadow-card">
           <CardHeader>
             <CardTitle className="text-lg">4. Payment Terms</CardTitle>
           </CardHeader>
           <CardContent className="text-sm text-muted-foreground space-y-2">
             <p>
               Payment is required before package dispatch. We accept M-Pesa payments.
               All prices are in Kenyan Shillings (KES).
             </p>
           </CardContent>
         </Card>
 
         <Card className="border-0 shadow-card">
           <CardHeader>
             <CardTitle className="text-lg">5. Liability</CardTitle>
           </CardHeader>
           <CardContent className="text-sm text-muted-foreground space-y-2">
             <p>
               Canyi Delivery is not liable for delays caused by factors beyond our control.
               Maximum liability for lost or damaged items is limited to the declared value or KES 5,000, whichever is lower.
             </p>
           </CardContent>
         </Card>
 
         <Card className="border-0 shadow-card">
           <CardHeader>
             <CardTitle className="text-lg">6. Privacy</CardTitle>
           </CardHeader>
           <CardContent className="text-sm text-muted-foreground space-y-2">
             <p>
               We collect and process personal data in accordance with our Privacy Policy.
               Your information is used solely for providing delivery services and improving user experience.
             </p>
           </CardContent>
         </Card>
 
         <Card className="border-0 shadow-card">
           <CardHeader>
             <CardTitle className="text-lg">7. Contact</CardTitle>
           </CardHeader>
           <CardContent className="text-sm text-muted-foreground space-y-2">
             <p>
               For questions about these terms, contact us at support@canyi.delivery
             </p>
           </CardContent>
         </Card>
 
         <p className="text-xs text-muted-foreground text-center pt-4">
           Last updated: February 2026
         </p>
       </div>
       <BottomNav />
     </div>
   );
 }