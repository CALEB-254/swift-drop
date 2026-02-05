 import { useState } from 'react';
 import { Link, useNavigate } from 'react-router-dom';
 import { useAuthContext } from '@/contexts/AuthContext';
 import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
 } from '@/components/ui/dropdown-menu';
 import {
   User,
   LogOut,
   MessageSquare,
   Users,
   MapPin,
   FileText,
   Settings,
   ChevronDown,
 } from 'lucide-react';
 import { toast } from 'sonner';
 
 export function ProfileDropdown() {
   const navigate = useNavigate();
   const { profile, signOut } = useAuthContext();
   const [open, setOpen] = useState(false);
 
   const getInitials = (name: string) => {
     return name
       .split(' ')
       .map((n) => n[0])
       .join('')
       .toUpperCase()
       .slice(0, 2);
   };
 
   const handleLogout = async () => {
     try {
       await signOut();
       toast.success('Logged out successfully');
       navigate('/');
     } catch (error) {
       toast.error('Failed to log out');
     }
   };
 
   return (
     <DropdownMenu open={open} onOpenChange={setOpen}>
       <DropdownMenuTrigger asChild>
         <button className="flex items-center gap-1 p-1 rounded-full hover:bg-primary-foreground/10 transition-colors">
           <Avatar className="w-8 h-8 border-2 border-primary-foreground/30">
             <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name} />
             <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-xs">
               {profile?.full_name ? getInitials(profile.full_name) : <User className="w-4 h-4" />}
             </AvatarFallback>
           </Avatar>
           <ChevronDown className="w-4 h-4 text-primary-foreground" />
         </button>
       </DropdownMenuTrigger>
       <DropdownMenuContent align="end" className="w-56 z-50 bg-popover">
         <DropdownMenuLabel>
           <div className="flex flex-col">
             <span className="font-medium">{profile?.full_name}</span>
             <span className="text-xs text-muted-foreground capitalize">{profile?.role}</span>
           </div>
         </DropdownMenuLabel>
         <DropdownMenuSeparator />
         
         <DropdownMenuItem asChild>
           <Link to="/profile/edit" className="cursor-pointer">
             <User className="w-4 h-4 mr-2" />
             Edit Profile
           </Link>
         </DropdownMenuItem>
         
         <DropdownMenuItem asChild>
           <Link to="/customers" className="cursor-pointer">
             <Users className="w-4 h-4 mr-2" />
             My Customers
           </Link>
         </DropdownMenuItem>
         
         <DropdownMenuItem asChild>
           <Link to="/agents" className="cursor-pointer">
             <MapPin className="w-4 h-4 mr-2" />
             Agent Locations
           </Link>
         </DropdownMenuItem>
         
         <DropdownMenuSeparator />
         
         <DropdownMenuItem asChild>
           <Link to="/preferences" className="cursor-pointer">
             <Settings className="w-4 h-4 mr-2" />
             Preferences
           </Link>
         </DropdownMenuItem>
         
         <DropdownMenuItem asChild>
           <Link to="/feedback" className="cursor-pointer">
             <MessageSquare className="w-4 h-4 mr-2" />
             Feedback
           </Link>
         </DropdownMenuItem>
         
         <DropdownMenuItem asChild>
           <Link to="/terms" className="cursor-pointer">
             <FileText className="w-4 h-4 mr-2" />
             Terms & Conditions
           </Link>
         </DropdownMenuItem>
         
         <DropdownMenuSeparator />
         
         <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
           <LogOut className="w-4 h-4 mr-2" />
           Logout
         </DropdownMenuItem>
       </DropdownMenuContent>
     </DropdownMenu>
   );
 }