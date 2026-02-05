 import { useState } from 'react';
 import { Link } from 'react-router-dom';
 import { Button } from '@/components/ui/button';
 import { Textarea } from '@/components/ui/textarea';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { BottomNav } from '@/components/BottomNav';
 import { ArrowLeft, Star, Send, Loader2 } from 'lucide-react';
 import { toast } from 'sonner';
 
 export default function Feedback() {
   const [rating, setRating] = useState(0);
   const [feedback, setFeedback] = useState('');
   const [loading, setLoading] = useState(false);
 
   const handleSubmit = async () => {
     if (rating === 0) {
       toast.error('Please select a rating');
       return;
     }
     
     setLoading(true);
     // Simulate API call
     await new Promise(resolve => setTimeout(resolve, 1000));
     toast.success('Thank you for your feedback!');
     setRating(0);
     setFeedback('');
     setLoading(false);
   };
 
   return (
     <div className="min-h-screen bg-background pb-20">
       <div className="gradient-hero px-4 py-6">
         <div className="flex items-center gap-3">
           <Link to="/sender" className="p-2 -ml-2">
             <ArrowLeft className="w-6 h-6 text-primary-foreground" />
           </Link>
           <h1 className="font-display text-xl font-bold text-primary-foreground">
             Feedback
           </h1>
         </div>
       </div>
 
       <div className="px-4 py-6 space-y-4">
         <Card className="border-0 shadow-card">
           <CardHeader>
             <CardTitle className="text-lg text-center">
               How would you rate our service?
             </CardTitle>
           </CardHeader>
           <CardContent>
             <div className="flex justify-center gap-2">
               {[1, 2, 3, 4, 5].map((star) => (
                 <button
                   key={star}
                   onClick={() => setRating(star)}
                   className="p-2 transition-transform hover:scale-110"
                 >
                   <Star
                     className={`w-10 h-10 ${
                       star <= rating
                         ? 'fill-primary text-primary'
                         : 'text-muted-foreground'
                     }`}
                   />
                 </button>
               ))}
             </div>
             <p className="text-center text-sm text-muted-foreground mt-2">
               {rating === 0 && 'Tap a star to rate'}
               {rating === 1 && 'Poor'}
               {rating === 2 && 'Fair'}
               {rating === 3 && 'Good'}
               {rating === 4 && 'Very Good'}
               {rating === 5 && 'Excellent'}
             </p>
           </CardContent>
         </Card>
 
         <Card className="border-0 shadow-card">
           <CardHeader>
             <CardTitle className="text-lg">Tell us more</CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
             <Textarea
               placeholder="Share your experience, suggestions, or concerns..."
               value={feedback}
               onChange={(e) => setFeedback(e.target.value)}
               className="min-h-[150px] resize-none"
             />
             <Button 
               onClick={handleSubmit}
               className="w-full gap-2"
               disabled={loading}
             >
               {loading ? (
                 <Loader2 className="w-4 h-4 animate-spin" />
               ) : (
                 <Send className="w-4 h-4" />
               )}
               Submit Feedback
             </Button>
           </CardContent>
         </Card>
 
         <Card className="border-0 shadow-card">
           <CardHeader>
             <CardTitle className="text-lg">Contact Support</CardTitle>
           </CardHeader>
           <CardContent className="text-sm text-muted-foreground space-y-2">
             <p>Email: support@canyi.delivery</p>
             <p>Phone: +254 700 000 000</p>
             <p>Available: Mon-Sat, 8AM - 8PM</p>
           </CardContent>
         </Card>
       </div>
       <BottomNav />
     </div>
   );
 }