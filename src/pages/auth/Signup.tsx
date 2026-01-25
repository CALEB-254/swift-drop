import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Package, ArrowLeft, Eye, EyeOff, User, Truck } from 'lucide-react';

export default function Signup() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
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

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await signUp(
        formData.email,
        formData.password,
        formData.fullName,
        formData.phone,
        formData.role,
        formData.address || undefined
      );
      
      toast.success('Account created successfully!');
      
      // Redirect based on role
      if (formData.role === 'agent') {
        navigate('/agent');
      } else {
        navigate('/sender');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate('/')}
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
      <div className="flex-1 flex items-center justify-center p-4 pb-8">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
            <CardDescription>Join Canyi Delivery to start sending or delivering packages</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role Selection */}
              <div className="space-y-2">
                <Label>I want to</Label>
                <RadioGroup
                  value={formData.role}
                  onValueChange={(value) => handleChange('role', value)}
                  className="grid grid-cols-2 gap-3"
                >
                  <div className="relative">
                    <RadioGroupItem value="sender" id="sender" className="peer sr-only" />
                    <Label
                      htmlFor="sender"
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                    >
                      <User className="h-6 w-6" />
                      <span className="font-medium">Send Packages</span>
                    </Label>
                  </div>
                  <div className="relative">
                    <RadioGroupItem value="agent" id="agent" className="peer sr-only" />
                    <Label
                      htmlFor="agent"
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                    >
                      <Truck className="h-6 w-6" />
                      <span className="font-medium">Deliver Packages</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  required
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  required
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+254 7XX XXX XXX"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  required
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address (Optional)</Label>
                <Input
                  id="address"
                  type="text"
                  placeholder="Enter your address"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    required
                    className="h-12 pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  required
                  className="h-12"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold"
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                Already have an account?{' '}
                <Link to="/auth/login" className="text-primary font-semibold hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
