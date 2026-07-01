import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MailWarning, RefreshCw, LogOut } from 'lucide-react';

const COOLDOWN_SECONDS = 60;

interface Props {
  email: string;
}

export function EmailVerificationBlock({ email }: Props) {
  const navigate = useNavigate();
  const { signOut, refresh } = useAuthContext();
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      setCooldown(COOLDOWN_SECONDS);
      toast.success('A new verification code has been sent. Please use the latest one.');
    } catch (err: any) {
      const msg = /rate|too many/i.test(err?.message || '')
        ? 'Too many attempts. Please wait a moment before trying again.'
        : err?.message || 'Failed to resend the code.';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const handleEnterCode = () => {
    navigate(`/auth/verify?email=${encodeURIComponent(email)}&type=signup`);
  };

  const handleAlreadyVerified = async () => {
    setChecking(true);
    try {
      await refresh();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <MailWarning className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Verify your email to continue</CardTitle>
          <CardDescription className="pt-2">
            We need to confirm <strong className="text-foreground">{email}</strong> before you can
            access your dashboard. Check your inbox (and spam folder) for the 6-digit code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <Button
            onClick={handleEnterCode}
            className="w-full h-12 text-base font-semibold"
          >
            Enter verification code
          </Button>

          <Button
            variant="outline"
            onClick={handleResend}
            disabled={sending || cooldown > 0}
            className="w-full h-12"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {sending
              ? 'Sending...'
              : cooldown > 0
                ? `Resend code in ${cooldown}s`
                : 'Resend verification code'}
          </Button>

          <Button
            variant="ghost"
            onClick={handleAlreadyVerified}
            disabled={checking}
            className="w-full"
          >
            {checking ? 'Checking...' : 'I already verified — refresh'}
          </Button>

          <Button
            variant="link"
            onClick={async () => { await signOut(); navigate('/auth/login'); }}
            className="w-full text-muted-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}