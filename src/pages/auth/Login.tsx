import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SocialLoginButtons } from '@/components/SocialLoginButtons';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Package, Eye, EyeOff, User, Truck } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

function friendlyAuthError(message: string): string {
  const m = (message || '').toLowerCase();
  if (m.includes('invalid login')) return 'Wrong email or password. Please try again.';
  if (m.includes('email not confirmed')) return 'Please verify your email before signing in.';
  if (m.includes('user already registered')) return 'An account with this email already exists. Try signing in instead.';
  if (m.includes('password') && m.includes('short')) return 'Password is too short. Use at least 6 characters.';
  if (m.includes('pwned') || m.includes('breach')) return 'This password has been found in a data breach. Please choose a different one.';
  if (m.includes('rate') || m.includes('too many')) return 'Too many attempts. Please wait a moment and try again.';
  if (m.includes('network') || m.includes('fetch')) return 'Network problem. Check your connection and retry.';
  return message || 'Something went wrong. Please try again.';
}

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp, user, profile, loading } = useAuthContext();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Signup fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'sender' | 'agent'>('sender');

  useEffect(() => {
    if (!loading && user) {
      const emailVerified = !!user.email_confirmed_at;
      if (!emailVerified && user.email) {
        navigate(`/auth/verify?email=${encodeURIComponent(user.email)}&type=signup&reason=unverified`);
        return;
      }
      const redirectPath =
        profile?.role === 'admin' ? '/admin' :
        profile?.role === 'agent' ? '/agent' : '/sender';
      navigate(redirectPath);
    }
  }, [user, profile, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!email || !password) {
      setFormError('Please enter your email and password.');
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email, password);
      toast.success('Welcome back!');
    } catch (error: any) {
      const msg = friendlyAuthError(error?.message);
      setFormError(msg);
      toast.error(msg);
      if (/verify your email|not confirmed|unverified/i.test(msg) && email) {
        navigate(`/auth/verify?email=${encodeURIComponent(email)}&type=signup&reason=unverified`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const data = await signUp(email, password, fullName, phone, role, address || undefined);
      // If email confirmation is required, there's no session yet — go verify.
      if (!data?.session) {
        toast.success('Account created! Check your email for a verification code.');
        navigate(`/auth/verify?email=${encodeURIComponent(email)}&type=signup`);
      } else {
        // Even when a session exists, require email verification before dashboard.
        toast.success('Account created! Please verify your email.');
        navigate(`/auth/verify?email=${encodeURIComponent(email)}&type=signup`);
      }
    } catch (error: any) {
      const msg = friendlyAuthError(error?.message);
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(220,20%,8%)] flex items-center justify-center p-4 overflow-hidden">
      <h1 className="sr-only">{isLogin ? 'Sign in to SwiftDrop' : 'Create your SwiftDrop account'}</h1>
      {/* Container */}
      <div className="relative w-full max-w-md md:max-w-4xl min-h-[600px] md:min-h-[500px] rounded-2xl overflow-hidden shadow-2xl border border-primary/30"
        style={{ boxShadow: '0 0 40px hsl(var(--primary) / 0.15), 0 0 80px hsl(var(--primary) / 0.05)' }}>

        {/* Background */}
        <div className="absolute inset-0 bg-[hsl(220,20%,6%)]" />

        {/* Mobile Layout */}
        <div className="relative md:hidden flex flex-col min-h-[600px]">
          {/* Overlay panel - mobile (top) */}
          <div
            className="relative z-10 overflow-hidden transition-all duration-700 ease-in-out"
            style={{ height: isLogin ? '140px' : '140px' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/70" />
            <div className="relative h-full flex items-center justify-center px-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-primary-foreground animate-fade-in">
                  {isLogin ? 'WELCOME BACK!' : 'WELCOME!'}
                </h2>
                <p className="text-primary-foreground/70 text-sm mt-1">
                  {isLogin ? 'Sign in to continue' : 'Create your account'}
                </p>
              </div>
            </div>
          </div>

          {/* Forms container - mobile */}
          <div className="flex-1 relative overflow-hidden">
            {/* Login Form */}
            <div
              className={`absolute inset-0 transition-all duration-700 ease-in-out flex flex-col ${
                isLogin ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
              }`}
            >
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <h3 className="text-xl font-bold text-primary-foreground mb-5 text-center">Login</h3>
                <form onSubmit={handleLogin} className="space-y-4">{formError && (<p role="alert" className="text-sm text-destructive">{formError}</p>)}
                  <div className="space-y-2">
                    <Label className="text-primary-foreground/70">Email</Label>
                    <Input
                      type="email" placeholder="Enter your email" value={email}
                      onChange={(e) => setEmail(e.target.value)} required
                      className="h-12 bg-transparent border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/30 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-primary-foreground/70">Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={password}
                        onChange={(e) => setPassword(e.target.value)} required
                        className="h-12 pr-12 bg-transparent border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/30 focus:border-primary"
                      />
                      <Button type="button" variant="ghost" size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-primary-foreground/50"
                        onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-12 text-base font-semibold rounded-full" disabled={submitting}>
                    {submitting ? 'Signing in...' : 'Login'}
                  </Button>
                  <div className="text-right">
                    <Link to="/auth/forgot-password" className="text-sm text-primary hover:underline">Forgot Password?</Link>
                  </div>
                </form>
                <div className="mt-4">
                  <SocialLoginButtons mode="login" />
                </div>
                <div className="mt-4 text-center pb-4">
                  <p className="text-primary-foreground/60">
                    Don't have an account?{' '}
                    <button onClick={() => setIsLogin(false)} className="text-primary font-semibold hover:underline">
                      Sign Up
                    </button>
                  </p>
                </div>
              </div>
            </div>

            {/* Signup Form */}
            <div
              className={`absolute inset-0 transition-all duration-700 ease-in-out flex flex-col ${
                !isLogin ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
              }`}
            >
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <h3 className="text-xl font-bold text-primary-foreground mb-5 text-center">Register</h3>
                <form onSubmit={handleSignup} className="space-y-3">{formError && (<p role="alert" className="text-sm text-destructive">{formError}</p>)}
                  <div className="space-y-2">
                    <Label className="text-primary-foreground/70">I want to</Label>
                    <RadioGroup value={role} onValueChange={(v) => setRole(v as 'sender' | 'agent')} className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <RadioGroupItem value="sender" id="m-sender" className="peer sr-only" />
                        <Label htmlFor="m-sender" className="flex flex-col items-center gap-1 p-3 rounded-xl border border-primary-foreground/20 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 text-primary-foreground/70 peer-data-[state=checked]:text-primary">
                          <User className="h-5 w-5" />
                          <span className="text-xs font-medium">Send</span>
                        </Label>
                      </div>
                      <div className="relative">
                        <RadioGroupItem value="agent" id="m-agent" className="peer sr-only" />
                        <Label htmlFor="m-agent" className="flex flex-col items-center gap-1 p-3 rounded-xl border border-primary-foreground/20 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 text-primary-foreground/70 peer-data-[state=checked]:text-primary">
                          <Truck className="h-5 w-5" />
                          <span className="text-xs font-medium">Deliver</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-primary-foreground/70">Full Name</Label>
                    <Input type="text" placeholder="Enter your full name" value={fullName}
                      onChange={(e) => setFullName(e.target.value)} required
                      className="h-11 bg-transparent border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/30 focus:border-primary" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-primary-foreground/70">Email</Label>
                    <Input type="email" placeholder="Enter your email" value={email}
                      onChange={(e) => setEmail(e.target.value)} required
                      className="h-11 bg-transparent border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/30 focus:border-primary" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-primary-foreground/70">Phone</Label>
                    <Input type="tel" placeholder="+254 7XX XXX XXX" value={phone}
                      onChange={(e) => setPhone(e.target.value)} required
                      className="h-11 bg-transparent border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/30 focus:border-primary" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-primary-foreground/70">Password</Label>
                    <div className="relative">
                      <Input type={showPassword ? 'text' : 'password'} placeholder="Create a password" value={password}
                        onChange={(e) => setPassword(e.target.value)} required
                        className="h-11 pr-12 bg-transparent border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/30 focus:border-primary" />
                      <Button type="button" variant="ghost" size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-primary-foreground/50"
                        onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-primary-foreground/70">Confirm Password</Label>
                    <Input type={showPassword ? 'text' : 'password'} placeholder="Confirm password" value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)} required
                      className="h-11 bg-transparent border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/30 focus:border-primary" />
                  </div>
                  <Button type="submit" className="w-full h-12 text-base font-semibold rounded-full" disabled={submitting}>
                    {submitting ? 'Creating Account...' : 'Register'}
                  </Button>
                </form>
                <div className="mt-4">
                  <SocialLoginButtons mode="signup" />
                </div>
                <div className="mt-4 text-center pb-4">
                  <p className="text-primary-foreground/60">
                    Already have an account?{' '}
                    <button onClick={() => setIsLogin(true)} className="text-primary font-semibold hover:underline">
                      Sign In
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="relative hidden md:flex min-h-[500px]">
          {/* Login Form - left side */}
          <div className={`w-1/2 transition-all duration-700 ease-in-out flex items-center justify-center p-8 ${
            isLogin ? 'opacity-100 translate-x-0 z-[1]' : 'opacity-0 -translate-x-8 z-0'
          }`}>
            <div className="w-full max-w-sm">
              <h3 className="text-2xl font-bold text-primary-foreground mb-6">Login</h3>
              <form onSubmit={handleLogin} className="space-y-4">{formError && (<p role="alert" className="text-sm text-destructive">{formError}</p>)}
                <div className="space-y-2">
                  <Label className="text-primary-foreground/70">Email</Label>
                  <Input type="email" placeholder="Enter your email" value={email}
                    onChange={(e) => setEmail(e.target.value)} required
                    className="h-12 bg-transparent border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/30 focus:border-primary" />
                </div>
                <div className="space-y-2">
                  <Label className="text-primary-foreground/70">Password</Label>
                  <div className="relative">
                    <Input type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={password}
                      onChange={(e) => setPassword(e.target.value)} required
                      className="h-12 pr-12 bg-transparent border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/30 focus:border-primary" />
                    <Button type="button" variant="ghost" size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-primary-foreground/50"
                      onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-12 text-base font-semibold rounded-full" disabled={submitting}>
                  {submitting ? 'Signing in...' : 'Login'}
                </Button>
                <div className="text-right">
                  <Link to="/auth/forgot-password" className="text-sm text-primary hover:underline">Forgot Password?</Link>
                </div>
              </form>
              <div className="mt-4"><SocialLoginButtons mode="login" /></div>
              <div className="mt-4 text-center">
                <p className="text-primary-foreground/60">
                  Don't have an account?{' '}
                  <button onClick={() => setIsLogin(false)} className="text-primary font-semibold hover:underline">Sign Up</button>
                </p>
              </div>
            </div>
          </div>

          {/* Signup Form - right side */}
          <div className={`w-1/2 transition-all duration-700 ease-in-out flex items-center justify-center p-8 ${
            !isLogin ? 'opacity-100 translate-x-0 z-[1]' : 'opacity-0 translate-x-8 z-0'
          }`}>
            <div className="w-full max-w-sm">
              <h3 className="text-2xl font-bold text-primary-foreground mb-6">Register</h3>
              <form onSubmit={handleSignup} className="space-y-3">{formError && (<p role="alert" className="text-sm text-destructive">{formError}</p>)}
                <RadioGroup value={role} onValueChange={(v) => setRole(v as 'sender' | 'agent')} className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <RadioGroupItem value="sender" id="d-sender" className="peer sr-only" />
                    <Label htmlFor="d-sender" className="flex flex-col items-center gap-1 p-2 rounded-xl border border-primary-foreground/20 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 text-primary-foreground/70 peer-data-[state=checked]:text-primary">
                      <User className="h-5 w-5" /><span className="text-xs">Send</span>
                    </Label>
                  </div>
                  <div className="relative">
                    <RadioGroupItem value="agent" id="d-agent" className="peer sr-only" />
                    <Label htmlFor="d-agent" className="flex flex-col items-center gap-1 p-2 rounded-xl border border-primary-foreground/20 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 text-primary-foreground/70 peer-data-[state=checked]:text-primary">
                      <Truck className="h-5 w-5" /><span className="text-xs">Deliver</span>
                    </Label>
                  </div>
                </RadioGroup>
                <Input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required
                  className="h-11 bg-transparent border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/30 focus:border-primary" />
                <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="h-11 bg-transparent border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/30 focus:border-primary" />
                <Input type="tel" placeholder="+254 7XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} required
                  className="h-11 bg-transparent border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/30 focus:border-primary" />
                <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required
                  className="h-11 bg-transparent border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/30 focus:border-primary" />
                <Input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                  className="h-11 bg-transparent border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/30 focus:border-primary" />
                <Button type="submit" className="w-full h-12 text-base font-semibold rounded-full" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Register'}
                </Button>
              </form>
              <div className="mt-3"><SocialLoginButtons mode="signup" /></div>
              <div className="mt-3 text-center">
                <p className="text-primary-foreground/60">
                  Already have an account?{' '}
                  <button onClick={() => setIsLogin(true)} className="text-primary font-semibold hover:underline">Sign In</button>
                </p>
              </div>
            </div>
          </div>

          {/* Sliding overlay panel - desktop */}
          <div
            className={`absolute top-0 w-1/2 h-full z-20 transition-transform duration-700 ease-in-out ${
              isLogin ? 'translate-x-full' : 'translate-x-0'
            }`}
          >
            <div className="h-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center p-8">
              <div className="text-center">
                <h2 className="text-4xl font-bold text-primary-foreground mb-2 tracking-wide">
                  {isLogin ? 'WELCOME\nBACK!' : 'WELCOME!'}
                </h2>
                <p className="text-primary-foreground/80 mt-4">
                  {isLogin ? 'Sign in to manage your deliveries' : 'Join SwiftDrop today'}
                </p>
                <div className="mt-6 flex items-center justify-center gap-2">
                  <Package className="w-6 h-6 text-primary-foreground/80" />
                  <span className="font-bold text-primary-foreground text-lg">SwiftDrop</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
