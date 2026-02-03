import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  ArrowLeft, 
  ShoppingCart, 
  Package, 
  Trash2, 
  CreditCard,
  Phone,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { BottomNav } from '@/components/BottomNav';
import { format } from 'date-fns';
import { DELIVERY_TYPES } from '@/types/delivery';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface CartPackage {
  id: string;
  tracking_number: string;
  receiver_name: string;
  receiver_address: string;
  delivery_type: string;
  cost: number;
  created_at: string;
  package_description: string | null;
  payment_status: string;
}

export default function Cart() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthContext();
  const [packages, setPackages] = useState<CartPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'stk_push' | 'till'>('stk_push');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'success' | 'failed'>('pending');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth/login');
      return;
    }

    if (user) {
      fetchCartPackages();
    }
  }, [user, authLoading]);

  const fetchCartPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('id, tracking_number, receiver_name, receiver_address, delivery_type, cost, created_at, package_description, payment_status')
        .eq('user_id', user?.id)
        .eq('payment_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPackages(data || []);
    } catch (error: any) {
      toast.error('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (id: string) => {
    try {
      const { error } = await supabase
        .from('packages')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id)
        .eq('payment_status', 'pending');

      if (error) throw error;
      
      setPackages((prev) => prev.filter((p) => p.id !== id));
      toast.success('Package removed from cart');
    } catch (error: any) {
      toast.error('Failed to remove package');
    }
  };

  const totalAmount = packages.reduce((sum, pkg) => sum + pkg.cost, 0);

  const handlePayment = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    // Format phone number to 254XXXXXXXXX
    let formattedPhone = phoneNumber.replace(/\s/g, '').replace(/^0/, '254').replace(/^\+/, '');
    if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }

    if (formattedPhone.length !== 12) {
      toast.error('Invalid phone number format. Use format: 0712345678');
      return;
    }

    setIsProcessing(true);
    setShowPaymentDialog(true);
    setPaymentStatus('processing');

    try {
      const packageIds = packages.map((p) => p.id);
      
      const { data, error } = await supabase.functions.invoke('mpesa-payment', {
        body: {
          phoneNumber: formattedPhone,
          amount: totalAmount,
          packageIds,
          paymentMethod,
        },
      });

      if (error) throw error;

      if (data.success) {
        if (paymentMethod === 'stk_push') {
          toast.success('Check your phone for the M-Pesa prompt');
          // Poll for payment status
          pollPaymentStatus(data.checkoutRequestId);
        } else {
          // Till payment - show instructions
          setPaymentStatus('pending');
          toast.info(`Pay to Till Number: ${data.tillNumber}`);
        }
      } else {
        throw new Error(data.error || 'Payment initiation failed');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentStatus('failed');
      toast.error(error.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const pollPaymentStatus = async (checkoutRequestId: string) => {
    const maxAttempts = 30;
    let attempts = 0;

    const checkStatus = async () => {
      attempts++;
      
      try {
        const { data, error } = await supabase.functions.invoke('mpesa-payment', {
          body: {
            action: 'check_status',
            checkoutRequestId,
          },
        });

        if (error) throw error;

        if (data.status === 'completed') {
          setPaymentStatus('success');
          toast.success('Payment successful!');
          await fetchCartPackages();
          return;
        } else if (data.status === 'failed') {
          setPaymentStatus('failed');
          toast.error('Payment was not completed');
          return;
        }

        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 3000);
        } else {
          setPaymentStatus('failed');
          toast.error('Payment verification timed out. Please check your M-Pesa messages.');
        }
      } catch (error) {
        console.error('Status check error:', error);
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 3000);
        }
      }
    };

    setTimeout(checkStatus, 5000);
  };

  const getDeliveryTypeName = (type: string) => {
    return DELIVERY_TYPES.find((t) => t.id === type)?.name || type;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-lg">My Cart</h1>
            <p className="text-sm opacity-80">{packages.length} pending deliveries</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 space-y-4">
        {packages.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Cart is empty</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Create a new delivery to add it to your cart
              </p>
              <Button onClick={() => navigate('/sender')}>
                Create Delivery
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Package List */}
            {packages.map((pkg) => (
              <Card key={pkg.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{pkg.receiver_name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {pkg.receiver_address}
                          </p>
                        </div>
                        <p className="font-semibold text-primary shrink-0">
                          KES {pkg.cost}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">
                            {getDeliveryTypeName(pkg.delivery_type)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(pkg.created_at), 'MMM d')}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-destructive hover:text-destructive"
                          onClick={() => removeFromCart(pkg.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Payment Section */}
            <Card className="border-0 shadow-sm mt-6">
              <CardContent className="p-4 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Details
                </h3>

                <div className="space-y-3">
                  <Label>Payment Method</Label>
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={(v) => setPaymentMethod(v as 'stk_push' | 'till')}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-3 p-3 border rounded-lg">
                      <RadioGroupItem value="stk_push" id="stk_push" />
                      <Label htmlFor="stk_push" className="flex-1 cursor-pointer">
                        <p className="font-medium">M-Pesa STK Push</p>
                        <p className="text-xs text-muted-foreground">
                          Receive a prompt on your phone
                        </p>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 border rounded-lg">
                      <RadioGroupItem value="till" id="till" />
                      <Label htmlFor="till" className="flex-1 cursor-pointer">
                        <p className="font-medium">Pay to Till</p>
                        <p className="text-xs text-muted-foreground">
                          Manual payment to Till number
                        </p>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">M-Pesa Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      placeholder="0712345678"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Total */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="text-2xl font-bold text-primary">
                      KES {totalAmount}
                    </span>
                  </div>

                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handlePayment}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Pay KES ${totalAmount}`
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Payment Status Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {paymentStatus === 'processing' && 'Processing Payment'}
              {paymentStatus === 'success' && 'Payment Successful'}
              {paymentStatus === 'failed' && 'Payment Failed'}
              {paymentStatus === 'pending' && 'Complete Payment'}
            </DialogTitle>
            <DialogDescription>
              {paymentStatus === 'processing' && (
                <div className="text-center py-8">
                  <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                  <p>Please check your phone and enter your M-Pesa PIN...</p>
                </div>
              )}
              {paymentStatus === 'success' && (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p>Your payment was successful! Your deliveries are now being processed.</p>
                </div>
              )}
              {paymentStatus === 'failed' && (
                <div className="text-center py-8">
                  <p className="text-destructive">Payment was not completed. Please try again.</p>
                </div>
              )}
              {paymentStatus === 'pending' && paymentMethod === 'till' && (
                <div className="text-center py-4">
                  <p className="mb-4">Complete your payment using M-Pesa:</p>
                  <ol className="text-left space-y-2 text-sm">
                    <li>1. Go to M-Pesa on your phone</li>
                    <li>2. Select "Lipa na M-Pesa"</li>
                    <li>3. Select "Buy Goods and Services"</li>
                    <li>4. Enter Till Number: <strong>XXXXXX</strong></li>
                    <li>5. Enter Amount: <strong>KES {totalAmount}</strong></li>
                    <li>6. Enter your M-Pesa PIN and confirm</li>
                  </ol>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          {(paymentStatus === 'success' || paymentStatus === 'failed') && (
            <Button onClick={() => setShowPaymentDialog(false)}>
              {paymentStatus === 'success' ? 'View Deliveries' : 'Try Again'}
            </Button>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
