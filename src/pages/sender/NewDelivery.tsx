import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, MapPin, Truck, Package, User, Phone, FileText, Check } from 'lucide-react';
import { useDeliveryStore } from '@/store/deliveryStore';
import { PICKUP_POINTS, DELIVERY_PRICING, DeliveryType } from '@/types/delivery';
import { toast } from 'sonner';

export default function NewDelivery() {
  const navigate = useNavigate();
  const { addPackage } = useDeliveryStore();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    senderName: '',
    senderPhone: '',
    senderAddress: '',
    receiverName: '',
    receiverPhone: '',
    receiverAddress: '',
    deliveryType: 'pickup_point' as DeliveryType,
    pickupPoint: '',
    packageDescription: '',
    weight: '',
  });

  const cost = formData.deliveryType === 'pickup_point' 
    ? DELIVERY_PRICING.pickupPointCost 
    : DELIVERY_PRICING.doorstepCost;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const newPackage = addPackage({
        ...formData,
        weight: parseFloat(formData.weight) || 0,
        pickupPoint: formData.deliveryType === 'pickup_point' 
          ? PICKUP_POINTS.find(p => p.id === formData.pickupPoint)?.name 
          : undefined,
      });

      toast.success('Delivery created successfully!', {
        description: `Tracking: ${newPackage.trackingNumber}`,
      });

      navigate(`/sender/track?q=${newPackage.trackingNumber}`);
    } catch (error) {
      toast.error('Failed to create delivery');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStep1Valid = formData.senderName && formData.senderPhone && formData.senderAddress;
  const isStep2Valid = formData.receiverName && formData.receiverPhone && 
    (formData.deliveryType === 'pickup_point' ? formData.pickupPoint : formData.receiverAddress);
  const isStep3Valid = formData.packageDescription;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-primary text-primary-foreground p-4">
        <div className="container">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/sender">
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="font-display text-xl font-bold">New Delivery</h1>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm transition-all ${
                    s < step 
                      ? 'bg-primary-foreground text-primary' 
                      : s === step 
                        ? 'bg-primary-foreground/20 text-primary-foreground ring-2 ring-primary-foreground' 
                        : 'bg-primary-foreground/10 text-primary-foreground/50'
                  }`}
                >
                  {s < step ? <Check className="w-4 h-4" /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-16 sm:w-24 h-1 mx-2 rounded ${
                    s < step ? 'bg-primary-foreground' : 'bg-primary-foreground/20'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container py-6 px-4">
        {/* Step 1: Sender Details */}
        {step === 1 && (
          <Card className="border-0 shadow-card animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display">
                <User className="w-5 h-5 text-primary" />
                Sender Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="senderName">Full Name</Label>
                <Input
                  id="senderName"
                  placeholder="Enter your name"
                  value={formData.senderName}
                  onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senderPhone">Phone Number</Label>
                <Input
                  id="senderPhone"
                  type="tel"
                  placeholder="+254..."
                  value={formData.senderPhone}
                  onChange={(e) => setFormData({ ...formData, senderPhone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senderAddress">Pickup Address</Label>
                <Textarea
                  id="senderAddress"
                  placeholder="Enter the pickup location"
                  value={formData.senderAddress}
                  onChange={(e) => setFormData({ ...formData, senderAddress: e.target.value })}
                />
              </div>
              
              <Button 
                variant="hero" 
                size="lg" 
                className="w-full mt-4"
                onClick={() => setStep(2)}
                disabled={!isStep1Valid}
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Receiver & Delivery Type */}
        {step === 2 && (
          <Card className="border-0 shadow-card animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display">
                <MapPin className="w-5 h-5 text-accent" />
                Delivery Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="receiverName">Receiver's Name</Label>
                <Input
                  id="receiverName"
                  placeholder="Enter receiver's name"
                  value={formData.receiverName}
                  onChange={(e) => setFormData({ ...formData, receiverName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiverPhone">Receiver's Phone</Label>
                <Input
                  id="receiverPhone"
                  type="tel"
                  placeholder="+254..."
                  value={formData.receiverPhone}
                  onChange={(e) => setFormData({ ...formData, receiverPhone: e.target.value })}
                />
              </div>

              {/* Delivery Type */}
              <div className="space-y-3">
                <Label>Delivery Type</Label>
                <RadioGroup
                  value={formData.deliveryType}
                  onValueChange={(value: DeliveryType) => setFormData({ ...formData, deliveryType: value })}
                  className="space-y-3"
                >
                  <Label
                    htmlFor="pickup_point"
                    className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.deliveryType === 'pickup_point'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value="pickup_point" id="pickup_point" />
                    <MapPin className="w-5 h-5 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium">Pickup Point</p>
                      <p className="text-sm text-muted-foreground">Collect from hub</p>
                    </div>
                    <span className="font-display font-bold text-primary">KES 150</span>
                  </Label>
                  
                  <Label
                    htmlFor="doorstep"
                    className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.deliveryType === 'doorstep'
                        ? 'border-accent bg-accent/5'
                        : 'border-border hover:border-accent/50'
                    }`}
                  >
                    <RadioGroupItem value="doorstep" id="doorstep" />
                    <Truck className="w-5 h-5 text-accent" />
                    <div className="flex-1">
                      <p className="font-medium">Doorstep Delivery</p>
                      <p className="text-sm text-muted-foreground">Direct to address</p>
                    </div>
                    <span className="font-display font-bold text-accent">KES 300</span>
                  </Label>
                </RadioGroup>
              </div>

              {/* Conditional Fields */}
              {formData.deliveryType === 'pickup_point' ? (
                <div className="space-y-2">
                  <Label>Select Pickup Point</Label>
                  <Select
                    value={formData.pickupPoint}
                    onValueChange={(value) => setFormData({ ...formData, pickupPoint: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose pickup location" />
                    </SelectTrigger>
                    <SelectContent>
                      {PICKUP_POINTS.map((point) => (
                        <SelectItem key={point.id} value={point.id}>
                          <div className="flex flex-col">
                            <span>{point.name}</span>
                            <span className="text-xs text-muted-foreground">{point.address}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="receiverAddress">Delivery Address</Label>
                  <Textarea
                    id="receiverAddress"
                    placeholder="Enter full delivery address"
                    value={formData.receiverAddress}
                    onChange={(e) => setFormData({ ...formData, receiverAddress: e.target.value })}
                  />
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button 
                  variant="hero" 
                  className="flex-1"
                  onClick={() => setStep(3)}
                  disabled={!isStep2Valid}
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Package Details & Confirm */}
        {step === 3 && (
          <Card className="border-0 shadow-card animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display">
                <Package className="w-5 h-5 text-primary" />
                Package Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="packageDescription">Package Description</Label>
                <Textarea
                  id="packageDescription"
                  placeholder="Describe the package contents"
                  value={formData.packageDescription}
                  onChange={(e) => setFormData({ ...formData, packageDescription: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg) - Optional</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                />
              </div>

              {/* Order Summary */}
              <div className="p-4 bg-secondary rounded-lg space-y-3">
                <h4 className="font-display font-semibold">Order Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">From</span>
                    <span className="font-medium">{formData.senderName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">To</span>
                    <span className="font-medium">{formData.receiverName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery Type</span>
                    <span className="font-medium capitalize">
                      {formData.deliveryType === 'pickup_point' ? 'Pickup Point' : 'Doorstep'}
                    </span>
                  </div>
                </div>
                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="font-semibold">Total Cost</span>
                  <span className="font-display text-2xl font-bold text-primary">
                    KES {cost.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Back
                </Button>
                <Button 
                  variant="hero" 
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={!isStep3Valid || isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Delivery'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
