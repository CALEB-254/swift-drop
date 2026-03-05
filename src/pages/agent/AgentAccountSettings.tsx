import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Printer, Settings, LogOut, User } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function AgentAccountSettings() {
  const { profile, signOut } = useAuthContext();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/auth/login');
    } catch {
      toast.error('Failed to log out');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-lg font-bold">Account Settings</h1>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Profile Card */}
        <Card className="border border-border shadow-sm">
          <CardContent className="p-4">
            <Link to="/profile/edit" className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <User className="w-7 h-7 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-display font-semibold">{profile?.full_name || 'Agent'}</p>
                <p className="text-sm text-muted-foreground">Edit profile</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>

        {/* Menu Card */}
        <Card className="border border-border shadow-sm">
          <CardContent className="p-0 divide-y divide-border">
            <Link to="/preferences" className="flex items-center gap-4 px-4 py-4">
              <Printer className="w-5 h-5 text-muted-foreground" />
              <span className="flex-1 font-medium">Print</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Link>
            <Link to="/preferences" className="flex items-center gap-4 px-4 py-4">
              <Settings className="w-5 h-5 text-muted-foreground" />
              <span className="flex-1 font-medium">Settings</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>

        {/* Logout Card */}
        <Card className="border border-border shadow-sm">
          <CardContent className="p-0">
            <button onClick={handleLogout} className="flex items-center gap-4 px-4 py-4 w-full text-left">
              <LogOut className="w-5 h-5 text-destructive" />
              <span className="font-medium text-destructive">Log Out</span>
            </button>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}
