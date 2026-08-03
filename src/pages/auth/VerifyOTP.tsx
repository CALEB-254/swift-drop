import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Package, ArrowLeft, ShieldCheck, AlertCircle, Mail, Smartphone, RefreshCw } from 'lucide-react';

const RESEND_COOLDOWN_SECONDS = 60;

export function friendlyError(message: string): string {
  const m = (message || '').toLowerCase();
  if (m.includes('expired')) return 'This code has expired. Please tap "Resend Code" to get a new one.';
  if (m.includes('invalid') || m.includes('token')) return 'That code doesn\'t match. Double-check the latest message and try again.';
  if (m.includes('rate') || m.includes('too many')) return 'Too many attempts. Please wait a moment before trying again.';
  if (m.includes('sms') || m.includes('phone')) return 'We couldn\'t send the SMS. Check the phone number and try again.';
  if (m.includes('network') || m.includes('fetch')) return 'Network problem. Check your connection and retry.';
  return message || 'Something went wrong. Please try again.';
}

export function normalizeKenyanPhone(raw: string): string | null {
  const digits = (raw || '').replace(/[^\d+]/g, '');
  let n = digits.replace(/^\+/, '');
  if (n.startsWith('0')) n = '254' + n.slice(1);
  if (n.startsWith('7') || n.startsWith('1')) n = '254' + n;
  if (!/^254[17]\d{8}$/.test(n)) return null;
  return '+' + n;
}

export default function VerifyOTP() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const type = searchParams.get('type') || 'signup'; // 'signup' or 'recovery'
  const reason = searchParams.get('reason'); // 'unverified' when redirected from login

  const [channel, setChannel] = useState<'email' | 'phone'>('email');
  const [phone, setPhone] = useState('');
  const [phoneSent, setPhoneSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const routeAfterVerify = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return navigate('/auth/login');
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    const role = profile?.role ?? 'sender';
    if (role === 'admin') navigate('/admin');
    else if (role === 'agent') navigate('/agent');
    else navigate('/sender');
  };

  const handleVerify = async () => {
    setErrorMsg(null);
    if (otp.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit code.');
      return;
    }
    if (channel === 'email' && !email) {
      setErrorMsg('Missing email address. Please restart the sign-up flow.');
      return;
    }
    const normalized = channel === 'phone' ? normalizeKenyanPhone(phone) : null;
    if (channel === 'phone' && !normalized) {
      setErrorMsg('Enter a valid Kenyan phone number (e.g. 0712345678).');
      return;
    }

    setLoading(true);
    try {
      const { error } = channel === 'phone'
        ? await supabase.auth.verifyOtp({ phone: normalized!, token: otp.trim(), type: 'sms' })
        : await supabase.auth.verifyOtp({
            email,
            token: otp.trim(),
            type: type === 'recovery' ? 'recovery' : 'signup',
          });

      if (error) throw error;

      toast.success('Verification successful!');

      if (channel === 'email' && type === 'recovery') {
        navigate('/auth/reset-password');
      } else {
        await routeAfterVerify();
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

  const sendPhoneCode = async () => {
    setErrorMsg(null);
    const normalized = normalizeKenyanPhone(phone);
    if (!normalized) {
      setErrorMsg('Enter a valid Kenyan phone number (e.g. 0712345678).');
      return;
    }
    setResending(true);
    setOtp('');
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: normalized });
      if (error) throw error;
      setPhoneSent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success(`We sent a 6-digit code to ${normalized}.`);
    } catch (error: any) {
      const msg = friendlyError(error?.message);
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    if (channel === 'phone') return sendPhoneCode();
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
        const { error } = await supabase.auth.resend({ type: 'signup', email });
        if (error) throw error;
      }

      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success('A new code was sent. Use the latest one you received.');
    } catch (error: any) {
      const msg = friendlyError(error?.message);
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  const otpField = (
    <div className="flex justify-center">
      <InputOTP maxLength={6} value={otp} onChange={(v) => { setOtp(v); if (errorMsg) setErrorMsg(null); }}>
        <InputOTPGroup>
          {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
        </InputOTPGroup>
      </InputOTP>
    </div>
  );

  const resendButton = (
    <Button
      variant="link"
      onClick={handleResend}
      disabled={resending || cooldown > 0}
      className="text-primary font-semibold"
    >
      <RefreshCw className="h-4 w-4 mr-2" />
      {resending ? 'Sending...' : cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
    </Button>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0" aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">Canyi Delivery</span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Verify your account</CardTitle>
            <CardDescription>
              Confirm it's you with a 6-digit code{email ? <> sent to <strong className="text-foreground">{email}</strong></> : null}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {reason === 'unverified' && (
              <div
                role="status"
                className="flex gap-3 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm"
              >
                <AlertCircle className="h-5 w-5 shrink-0 text-primary" />
                <p className="text-foreground/90">
                  Your account isn't verified yet, so we couldn't sign you in. Enter the code we
                  emailed you — or switch to SMS below — then you'll be taken straight to your
                  dashboard. Didn't get it? Tap resend.
                </p>
              </div>
            )}

            <Tabs value={channel} onValueChange={(v) => { setChannel(v as 'email' | 'phone'); setOtp(''); setErrorMsg(null); }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email"><Mail className="h-4 w-4 mr-2" />Email</TabsTrigger>
                <TabsTrigger value="phone"><Smartphone className="h-4 w-4 mr-2" />Phone (SMS)</TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="space-y-5 pt-5">
                {otpField}
                {errorMsg && <p role="alert" className="text-sm text-destructive text-center">{errorMsg}</p>}
                <Button onClick={handleVerify} className="w-full h-12 text-base font-semibold" disabled={loading || otp.length !== 6}>
                  {loading ? 'Verifying...' : 'Verify code'}
                </Button>
                <div className="text-center">
                  <p className="text-muted-foreground text-sm">Didn't receive the code? Use the most recent one sent.</p>
                  {resendButton}
                </div>
              </TabsContent>

              <TabsContent value="phone" className="space-y-5 pt-5">
                <div className="space-y-2">
                  <Label htmlFor="verify-phone">Phone number</Label>
                  <Input
                    id="verify-phone"
                    type="tel"
                    inputMode="tel"
                    placeholder="0712345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={phoneSent}
                  />
                </div>

                {!phoneSent ? (
                  <Button onClick={sendPhoneCode} className="w-full h-12 text-base font-semibold" disabled={resending}>
                    {resending ? 'Sending...' : 'Send SMS code'}
                  </Button>
                ) : (
                  <>
                    {otpField}
                    <Button onClick={handleVerify} className="w-full h-12 text-base font-semibold" disabled={loading || otp.length !== 6}>
                      {loading ? 'Verifying...' : 'Verify code'}
                    </Button>
                    <div className="text-center">{resendButton}</div>
                  </>
                )}
                {errorMsg && <p role="alert" className="text-sm text-destructive text-center">{errorMsg}</p>}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
