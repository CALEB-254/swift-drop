import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Package, ArrowLeft, ShieldCheck } from 'lucide-react';

const RESEND_COOLDOWN_SECONDS = 60;

function friendlyError(message: string): string {
  const m = (message || '').toLowerCase();
  if (m.includes('expired')) return 'This code has expired. Please tap "Resend Code" to get a new one.';
  if (m.includes('invalid') || m.includes('token')) return 'That code doesn\'t match. Double-check the latest email and try again.';
  if (m.includes('rate') || m.includes('too many')) return 'Too many attempts. Please wait a moment before trying again.';
  if (m.includes('network') || m.includes('fetch')) return 'Network problem. Check your connection and retry.';
  return message || 'Something went wrong. Please try again.';
}

export default function VerifyOTP() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const type = searchParams.get('type') || 'signup'; // 'signup' or 'recovery'
  
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastSentAt, setLastSentAt] = useState<number>(Date.now());

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleVerify = async () => {
    setErrorMsg(null);
    if (otp.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit code.');
      return;
    }
    if (!email) {
      setErrorMsg('Missing email address. Please restart the sign-up flow.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp.trim(),
        type: type === 'recovery' ? 'recovery' : 'signup',
      });

      if (error) throw error;

      toast.success('Verification successful!');
      
      if (type === 'recovery') {
        navigate('/auth/reset-password');
      } else {
        // Re-validate with the Auth server to trust the newly-verified user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();
          const role = profile?.role ?? 'sender';
          if (role === 'admin') navigate('/admin');
          else if (role === 'agent') navigate('/agent');
          else navigate('/sender');
        } else {
          navigate('/auth/login');
        }
      }
    } catch (error: any) {
      const msg = friendlyError(error?.message);
      setErrorMsg(msg);
      toast.error(msg);
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    if (!email) {
      setErrorMsg('Missing email address. Please restart the sign-up flow.');
      return;
    }
    setResending(true);
    setErrorMsg(null);
    setOtp('');

    try {
      if (type === 'recovery') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email,
        });
        if (error) throw error;
      }

      setLastSentAt(Date.now());
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success('A new code was sent. Use the latest one from your inbox.');
    } catch (error: any) {
      const msg = friendlyError(error?.message);
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">Canyi Delivery</span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
            <CardDescription>
              Enter the 6-digit code sent to<br />
              <strong className="text-foreground">{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(v) => { setOtp(v); if (errorMsg) setErrorMsg(null); }}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {errorMsg && (
              <p role="alert" className="text-sm text-destructive text-center -mt-2">{errorMsg}</p>
            )}

            <Button 
              onClick={handleVerify}
              className="w-full h-12 text-base font-semibold"
              disabled={loading || otp.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </Button>

            <div className="text-center">
              <p className="text-muted-foreground text-sm mb-2">
                Didn't receive the code? Use the most recent one sent.
              </p>
              <Button
                variant="link"
                onClick={handleResend}
                disabled={resending || cooldown > 0}
                className="text-primary font-semibold"
              >
                {resending ? 'Sending...' : cooldown > 0 ? `Resend Code in ${cooldown}s` : 'Resend Code'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
