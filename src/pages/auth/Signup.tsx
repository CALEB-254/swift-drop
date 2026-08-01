import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SocialLoginButtons } from '@/components/SocialLoginButtons';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Package, ArrowLeft, Eye, EyeOff, User, Truck } from 'lucide-react';

const NAME_RE = /^[a-zA-Z][a-zA-Z'’.\- ]{1,}$/;

/** Normalises Kenyan numbers to +2547XXXXXXXX / +2541XXXXXXXX. Returns null if invalid. */
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, '');
  let local = digits;
  if (local.startsWith('+254')) local = '0' + local.slice(4);
  else if (local.startsWith('254')) local = '0' + local.slice(3);
  if (!/^0[17]\d{8}$/.test(local)) return null;
  return '+254' + local.slice(1);
}

function friendlySignupError(error: any): string {
  const msg = String(error?.message || '').toLowerCase();
  if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('user already exists')) {
    return 'An account with this email already exists. Try signing in instead, or use "Forgot password".';
  }
  if (msg.includes('invalid email') || msg.includes('email address') && msg.includes('invalid')) {
    return 'That email address looks invalid. Please check it and try again.';
  }
  if (msg.includes('password')) {
    return 'That password was rejected: it must be at least 6 characters and not a commonly-breached password. Please choose a stronger one and try again.';
  }
  if (msg.includes('rate limit') || msg.includes('too many')) {
    return 'Too many attempts. Please wait about a minute, then try creating your account again.';
  }
  if (msg.includes('row-level security') || msg.includes('permission') || msg.includes('policy')) {
    return "We couldn't finish setting up your profile. Your login was not created — please try again in a moment.";
  }
  if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
    return 'Some of these details are already in use (email or phone). Please check them and try again.';
  }
  if (msg.includes('failed to fetch') || msg.includes('network')) {
    return 'Network problem — we could not reach the server. Check your connection and tap "Create Account" again.';
  }
  return `${error?.message || 'Something went wrong while creating your account.'} Please try again — if it keeps happening, contact support.`;
}

export default function Signup() {
  const navigate = useNavigate();
  const { signUp, user, profile, loading: authLoading } = useAuthContext();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: '',
    role: 'sender' as 'sender' | 'agent',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user && profile) {
      navigate(profile.role === 'agent' ? '/agent' : '/sender');
    }
  }, [user, profile, authLoading, navigate]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => (prev[field] ? { ...prev, [field]: '' } : prev));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    const fullName = formData.fullName.trim().replace(/\s+/g, ' ');

    if (!fullName) next.fullName = 'Full name is required.';
    else if (fullName.length < 3) next.fullName = 'Full name must be at least 3 characters.';
    else if (!NAME_RE.test(fullName)) next.fullName = 'Use letters only (spaces, hyphens and apostrophes allowed).';
    else if (!fullName.includes(' ')) next.fullName = 'Please enter both your first and last name.';

    if (!formData.email.trim()) next.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(formData.email.trim())) next.email = 'Enter a valid email address, e.g. you@example.com.';

    if (!formData.phone.trim()) next.phone = 'Phone number is required.';
    else if (!normalizePhone(formData.phone)) next.phone = 'Enter a valid Kenyan number, e.g. 0712 345 678 or +254712345678.';

    if (!formData.password) next.password = 'Password is required.';
    else if (formData.password.length < 6) next.password = 'Password must be at least 6 characters.';

    if (!formData.confirmPassword) next.confirmPassword = 'Please confirm your password.';
    else if (formData.password !== formData.confirmPassword) next.confirmPassword = 'Passwords do not match.';

    return { next, fullName };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const { next, fullName } = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) {
      toast.error('Please fix the highlighted fields before continuing');
      return;
    }
    const phone = normalizePhone(formData.phone)!;
    setLoading(true);
    try {
      await signUp(formData.email.trim(), formData.password, fullName, phone, formData.role, formData.address.trim() || undefined);
      toast.success('Account created successfully!');
      if (formData.role === 'agent') { navigate('/agent'); } else { navigate('/sender'); }
    } catch (error: any) {
      const message = friendlySignupError(error);
      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">SwiftDrop</span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4 pb-8">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
            <CardDescription>Join SwiftDrop to start sending or delivering packages</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  <p className="font-semibold">Couldn't create your account</p>
                  <p className="mt-1">{formError}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label>I want to</Label>
                <RadioGroup value={formData.role} onValueChange={(value) => handleChange('role', value)} className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <RadioGroupItem value="sender" id="sender" className="peer sr-only" />
                    <Label htmlFor="sender" className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5">
                      <User className="h-6 w-6" />
                      <span className="font-medium">Send Packages</span>
                    </Label>
                  </div>
                  <div className="relative">
                    <RadioGroupItem value="agent" id="agent" className="peer sr-only" />
                    <Label htmlFor="agent" className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5">
                      <Truck className="h-6 w-6" />
                      <span className="font-medium">Deliver Packages</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" type="text" autoComplete="name" placeholder="e.g. Jane Wanjiku" value={formData.fullName} onChange={(e) => handleChange('fullName', e.target.value)} aria-invalid={!!errors.fullName} className="h-12" />
                {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} aria-invalid={!!errors.email} className="h-12" />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0712 345 678" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} aria-invalid={!!errors.phone} className="h-12" />
                {errors.phone
                  ? <p className="text-sm text-destructive">{errors.phone}</p>
                  : <p className="text-xs text-muted-foreground">Kenyan number — saved as +254…</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address (Optional)</Label>
                <Input id="address" type="text" placeholder="Enter your address" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="At least 6 characters" value={formData.password} onChange={(e) => handleChange('password', e.target.value)} aria-invalid={!!errors.password} className="h-12 pr-12" />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input id="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Re-enter your password" value={formData.confirmPassword} onChange={(e) => handleChange('confirmPassword', e.target.value)} aria-invalid={!!errors.confirmPassword} className="h-12" />
                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
              </div>
              <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
            <div className="mt-6">
              <SocialLoginButtons mode="signup" />
            </div>
            <div className="mt-6 text-center">
              <p className="text-foreground">
                Already have an account?{' '}
                <Link to="/auth/login" className="text-primary font-semibold hover:underline">Sign In</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
