import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ShoppingCart, Search } from 'lucide-react';
import { usePackages } from '@/hooks/usePackages';
import { useAuth } from '@/hooks/useAuth';
import { AREAS, PACKAGING_COLORS, DeliveryType, DELIVERY_TYPES } from '@/types/delivery';
import { toast } from 'sonner';
import { BottomNav } from '@/components/BottomNav';
import { HelpButton } from '@/components/HelpButton';
import { supabase } from '@/integrations/supabase/client';

export default function NewDelivery() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { createPackage } = usePackages();
  const { user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agents, setAgents] = useState<{ id: string; business_name: string; location: string }[]>([]);
  
  const deliveryType = (searchParams.get('type') as DeliveryType) || 'pickup_point';
  const deliveryTypeInfo = DELIVERY_TYPES.find(t => t.id === deliveryType);
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    fromArea: '',
    toArea: '',
    isProduct: false,
    packageDescription: '',
    packageValue: '',
    packagingColor: '',
    pickupPoint: '',
    deliveryAddress: '',
    codAmount: '',
  });

  // Fetch agents for pickup point selection
  useEffect(() => {
    const fetchAgents = async () => {
      const { data } = await supabase
        .from('agents')
        .select('id, business_name, location')
        .eq('is_active', true)
        .order('business_name');
      if (data) {
        // Only admin-created agents (with tracking_prefix)
        const adminAgents = data.filter(a => 
          // @ts-ignore - services may exist
          true // show all active agents as pickup points
        );
        setAgents(data);
      }
    };
    fetchAgents();
  }, []);

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please log in to create a delivery');
      navigate('/auth/login');
      return;
    }

    if (!formData.customerName || !formData.customerPhone || !formData.fromArea) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const selectedAgent = agents.find(a => a.id === formData.pickupPoint);
      const newPackage = await createPackage({
        senderName: profile?.full_name || 'Current User',
        senderPhone: profile?.phone || '+254700000000',
        senderAddress: formData.fromArea,
        receiverName: formData.customerName,
        receiverPhone: formData.customerPhone,
        receiverAddress: formData.toArea || formData.deliveryAddress,
        deliveryType: deliveryType,
        pickupPoint: deliveryType === 'pickup_point' 
          ? selectedAgent?.business_name
          : undefined,
        pickupAgentId: deliveryType === 'pickup_point' ? formData.pickupPoint : undefined,
        packageDescription: formData.packageDescription,
        weight: 0,
        isProduct: formData.isProduct,
        packageValue: parseFloat(formData.packageValue) || undefined,
        packagingColor: formData.packagingColor || undefined,
      });

      toast.success('Delivery added to cart!', {
        description: `Tracking: ${newPackage.trackingNumber}. Pay to process.`,
      });

      navigate('/sender/cart');
    } catch (error) {
      toast.error('Failed to create delivery', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-40">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Link to="/sender">
              <button className="text-primary">
                <ArrowLeft className="w-6 h-6" />
              </button>
            </Link>
            <h1 className="font-display text-lg font-semibold">SwiftDrop</h1>
          </div>
          <button className="p-2">
            <ShoppingCart className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Customer Search */}
        <div className="relative">
          <div className="bg-muted rounded-lg flex items-center overflow-hidden">
            <div className="px-4">
              <Search className="w-5 h-5 text-muted-foreground" />
            </div>
            <Input
              placeholder="Choose customer"
              className="border-0 focus-visible:ring-0 bg-transparent"
            />
          </div>
        </div>

        {/* Customer Details */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Customer name</Label>
            <Input
              placeholder="Type customer name"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              className="input-accent"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Phone number</Label>
            <Input
              placeholder="customer's Phone number"
              type="tel"
              value={formData.customerPhone}
              onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              className="input-accent"
            />
          </div>
        </div>

        {/* From Area Section */}
        <div>
          <h3 className="section-accent font-semibold mb-4">Where Are You Sending From?</h3>
          <div className="space-y-2">
            <Label>From Area</Label>
            <Select
              value={formData.fromArea}
              onValueChange={(value) => setFormData({ ...formData, fromArea: value })}
            >
              <SelectTrigger className="input-accent">
                <SelectValue placeholder="-- Choose area --" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.location}>
                    {agent.business_name} - {agent.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Package Section */}
        <div>
          <h3 className="section-accent font-semibold mb-4">Package</h3>
          
          {/* Package/Product Toggle */}
          <div className="flex items-center gap-4 mb-4 bg-muted rounded-lg p-1 w-fit">
            <button
              onClick={() => setFormData({ ...formData, isProduct: false })}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                !formData.isProduct 
                  ? 'bg-card shadow-sm' 
                  : 'text-muted-foreground'
              }`}
            >
              <Checkbox checked={!formData.isProduct} />
              <span className="text-sm font-medium">Package</span>
            </button>
            <button
              onClick={() => setFormData({ ...formData, isProduct: true })}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                formData.isProduct 
                  ? 'bg-card shadow-sm' 
                  : 'text-muted-foreground'
              }`}
            >
              <Checkbox checked={formData.isProduct} />
              <span className="text-sm font-medium">Product</span>
            </button>
          </div>

          {formData.isProduct && (
            <p className="text-sm text-muted-foreground mb-4">
              Sending product? tap on <strong>product</strong> above.
            </p>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>What are you selling?</Label>
              <Input
                placeholder="Describe what you're sending"
                value={formData.packageDescription}
                onChange={(e) => setFormData({ ...formData, packageDescription: e.target.value })}
                className="input-accent"
              />
            </div>

            <div className="space-y-2">
              <Label>Price</Label>
              <Input
                placeholder="Package value"
                type="number"
                value={formData.packageValue}
                onChange={(e) => setFormData({ ...formData, packageValue: e.target.value })}
                className="input-accent"
              />
            </div>

            <div className="space-y-2">
              <Label>Packaging color</Label>
              <Select
                value={formData.packagingColor}
                onValueChange={(value) => setFormData({ ...formData, packagingColor: value })}
              >
                <SelectTrigger className="input-accent">
                  <SelectValue placeholder="Packaging color" />
                </SelectTrigger>
                <SelectContent>
                  {PACKAGING_COLORS.map((color) => (
                    <SelectItem key={color} value={color}>
                      {color}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* To Area Section */}
        <div>
          <h3 className="section-accent font-semibold mb-4">Where Are You Sending To?</h3>
          
          {deliveryType === 'pickup_point' ? (
            <div className="space-y-2">
              <Label>Pickup Point</Label>
              <Select
                value={formData.pickupPoint}
                onValueChange={(value) => setFormData({ ...formData, pickupPoint: value })}
              >
                <SelectTrigger className="input-accent">
                  <SelectValue placeholder="-- Choose pickup point --" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.business_name} - {agent.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Area</Label>
                <Select
                  value={formData.toArea}
                  onValueChange={(value) => setFormData({ ...formData, toArea: value })}
                >
                  <SelectTrigger className="input-accent">
                    <SelectValue placeholder="-- Choose area --" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.location}>
                        {agent.business_name} - {agent.location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {deliveryType === 'doorstep' && (
                <div className="space-y-2">
                  <Label>Delivery Address</Label>
                  <Textarea
                    placeholder="Enter full delivery address"
                    value={formData.deliveryAddress}
                    onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                    className="input-accent"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? 'Creating Delivery...' : `Create Delivery - KES ${deliveryTypeInfo?.cost || 150}`}
          </Button>
        </div>
      </div>

      <HelpButton />
      <BottomNav />
    </div>
  );
}
