import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Package, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function VerifyOTP() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const type = searchParams.get('type') || 'signup'; // 'signup' or 'recovery'
  
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: type === 'recovery' ? 'recovery' : 'signup',
      });

      if (error) throw error;

      toast.success('Verification successful!');
      
      if (type === 'recovery') {
        navigate('/auth/reset-password');
      } else {
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);

    try {
      if (type === 'recovery') {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email,
        });
        if (error) throw error;
      }

      toast.success('New code sent!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend code');
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
                onChange={setOtp}
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

            <Button 
              onClick={handleVerify}
              className="w-full h-12 text-base font-semibold"
              disabled={loading || otp.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </Button>

            <div className="text-center">
              <p className="text-muted-foreground text-sm mb-2">
                Didn't receive the code?
              </p>
              <Button
                variant="link"
                onClick={handleResend}
                disabled={resending}
                className="text-primary font-semibold"
              >
                {resending ? 'Sending...' : 'Resend Code'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
