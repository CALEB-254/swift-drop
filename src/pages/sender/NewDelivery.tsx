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
import { PACKAGING_COLORS, DeliveryType, DELIVERY_TYPES } from '@/types/delivery';
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
  const [agents, setAgents] = useState<{ id: string; business_name: string; location: string; zone_id: string | null }[]>([]);
  const [zones, setZones] = useState<{ id: string; name: string; delivery_fee: number; is_cbd: boolean; supports_doorstep: boolean; area: string; zone_type?: string }[]>([]);
  const [couriers, setCouriers] = useState<{ id: string; name: string; zone_id: string | null; price: number; phone: string | null }[]>([]);
  const [errandLocationId, setErrandLocationId] = useState<string>('');
  const [courierId, setCourierId] = useState<string>('');
  const [destArea, setDestArea] = useState<string>('');
  const [destZoneId, setDestZoneId] = useState<string>('');
  const [fromAgentId, setFromAgentId] = useState<string>('');
  
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
    collectCash: false,
    payOnDelivery: false,
  });

  // Fetch agents for pickup point selection
  useEffect(() => {
    const fetchAgents = async () => {
      const { data } = await supabase
        .from('agents')
        .select('id, business_name, location, zone_id')
        .eq('is_active', true)
        .order('business_name');
      if (data) setAgents(data as any);
    };
    fetchAgents();
    supabase
      .from('zones')
      .select('id, name, delivery_fee, is_cbd, supports_doorstep, area, zone_type' as any)
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setZones((data as any) || []));
    supabase
      .from('couriers' as any)
      .select('id, name, zone_id, price, phone')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setCouriers((data as any) || []));
  }, []);

  const allAreas = Array.from(new Set(zones.map(z => z.area).filter(Boolean)));
  const zonesInArea = zones.filter(z => z.area === destArea);
  const destZone = zones.find(z => z.id === destZoneId);
  const selectedAgent = agents.find(a => a.id === formData.pickupPoint);
  const selectedAgentZone = zones.find(z => z.id === selectedAgent?.zone_id);
  const fromAgent = agents.find(a => a.id === fromAgentId);
  const fromAgentZone = zones.find(z => z.id === fromAgent?.zone_id);

  const clampDoorstep = (fee: number) => Math.min(410, Math.max(250, fee));

  const errandLocation = zones.find(z => z.id === errandLocationId);
  const selectedCourier = couriers.find(c => c.id === courierId);
  const couriersInLocation = couriers.filter(c => c.zone_id === errandLocationId);

  const computeCost = (): number => {
    if (deliveryType === 'errand') return 70;

    // Pricing rule: if neither the sender's agent nor the receiver's agent
    // is located in the CBD, fixed price of KES 220.
    const senderIsCbd = !!fromAgentZone?.is_cbd;
    const receiverIsCbd = deliveryType === 'pickup_point'
      ? !!selectedAgentZone?.is_cbd
      : !!destZone?.is_cbd;
    if (fromAgent && (deliveryType === 'pickup_point' ? selectedAgent : destZone) && !senderIsCbd && !receiverIsCbd) {
      return 220;
    }

    if (deliveryType === 'pickup_point') {
      if (!selectedAgent) return 0;
      return Number(selectedAgentZone?.delivery_fee) || 0;
    }
    // Doorstep
    if (!destZone) return 0;
    return clampDoorstep(Number(destZone.delivery_fee) || 250);
  };
  const computedCost = computeCost();

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please log in to create a delivery');
      navigate('/auth/login');
      return;
    }

    if (!formData.customerName || !formData.customerPhone || !fromAgentId) {
      toast.error('Please choose a sender agent and fill all required fields');
      return;
    }
    if (deliveryType === 'errand' && (!errandLocationId || !courierId)) {
      toast.error('Please choose the location and courier for your errand');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const newPackage = await createPackage({
        senderName: profile?.full_name || 'Current User',
        senderPhone: profile?.phone || '+254700000000',
        senderAddress: fromAgent ? `${fromAgent.business_name} - ${fromAgent.location}` : formData.fromArea,
        receiverName: formData.customerName,
        receiverPhone: formData.customerPhone,
        receiverAddress:
          deliveryType === 'errand'
            ? `${errandLocation?.name || ''}${selectedCourier ? ' via ' + selectedCourier.name : ''}`
            : (formData.toArea || formData.deliveryAddress),
        deliveryType: deliveryType,
        pickupPoint: deliveryType === 'pickup_point' 
          ? selectedAgent?.business_name
          : undefined,
        pickupAgentId: deliveryType === 'pickup_point' ? formData.pickupPoint : undefined,
        senderAgentId: fromAgentId,
        courierId: deliveryType === 'errand' ? courierId : undefined,
        packageDescription: formData.packageDescription,
        weight: 0,
        isProduct: formData.isProduct,
        packageValue: parseFloat(formData.packageValue) || undefined,
        packagingColor: deliveryType === 'errand' ? undefined : (formData.packagingColor || undefined),
        codAmount: parseFloat(formData.codAmount) || 0,
        payOnDelivery: deliveryType === 'doorstep' && formData.payOnDelivery,
        cost: computedCost,
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
            <Link to="/sender" aria-label="Back">
              <button className="text-primary" aria-label="Back">
                <ArrowLeft className="w-6 h-6" />
              </button>
            </Link>
            <h1 className="font-display text-lg font-semibold">SwiftDrop</h1>
          </div>
          <button className="p-2" aria-label="Cart">
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
          <h2 className="section-accent font-semibold mb-4">Where Are You Sending From?</h2>
          <div className="space-y-2">
            <Label>Sender Agent</Label>
            <Select
              value={fromAgentId}
              onValueChange={(value) => {
                setFromAgentId(value);
                const a = agents.find(x => x.id === value);
                setFormData({ ...formData, fromArea: a ? a.location : '' });
              }}
            >
              <SelectTrigger className="input-accent">
                <SelectValue placeholder="-- Choose sender agent --" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.business_name} - {agent.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fromAgentZone && (
              <p className="text-xs text-muted-foreground">
                {fromAgentZone.is_cbd ? 'CBD pickup location' : 'Outside CBD'}
              </p>
            )}
          </div>
        </div>

        {/* Package Section */}
        <div>
          <h2 className="section-accent font-semibold mb-4">Package</h2>
          
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

            {deliveryType !== 'errand' && (
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
            )}
          </div>
        </div>

        {/* To Area Section */}
        <div>
          <h2 className="section-accent font-semibold mb-4">Where Are You Sending To?</h2>
          
          {deliveryType === 'errand' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Select
                  value={errandLocationId}
                  onValueChange={(value) => {
                    setErrandLocationId(value);
                    setCourierId('');
                  }}
                >
                  <SelectTrigger className="input-accent">
                    <SelectValue placeholder="-- Choose location --" />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.filter(z => z.zone_type === 'errand').map(z => (
                      <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                    ))}
                    {zones.filter(z => z.zone_type === 'errand').length === 0 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">No errand locations configured yet</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {errandLocationId && (
                <div className="space-y-2">
                  <Label>Courier (Sacco)</Label>
                  <Select value={courierId} onValueChange={setCourierId}>
                    <SelectTrigger className="input-accent">
                      <SelectValue placeholder="-- Choose courier --" />
                    </SelectTrigger>
                    <SelectContent>
                      {couriersInLocation.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} — KES {Number(c.price)}
                        </SelectItem>
                      ))}
                      {couriersInLocation.length === 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">No couriers for this location yet</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedCourier && (
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs space-y-1">
                  <p><strong>SwiftDrop errand fee:</strong> KES 70 (paid via app)</p>
                  <p><strong>Sacco fee (paid separately):</strong> KES {Number(selectedCourier.price)}</p>
                  <p className="text-muted-foreground">
                    After the agent scans your parcel, you'll get a notification asking you to send
                    <strong> KES {Number(selectedCourier.price)}</strong> to Till <strong>0114606040</strong> for {selectedCourier.name}.
                  </p>
                </div>
              )}
            </div>
          ) : (
          <div className="space-y-4">
            {/* Step 1: Area (city) */}
            <div className="space-y-2">
              <Label>Area</Label>
              <Select
                value={destArea}
                onValueChange={(value) => {
                  setDestArea(value);
                  setDestZoneId('');
                  setFormData({ ...formData, pickupPoint: '', toArea: value });
                }}
              >
                <SelectTrigger className="input-accent">
                  <SelectValue placeholder="-- Choose area (e.g. Nairobi) --" />
                </SelectTrigger>
                <SelectContent>
                  {allAreas.map((area) => (
                    <SelectItem key={area} value={area}>{area}</SelectItem>
                  ))}
                  {allAreas.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">No areas configured yet</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: Delivery Location (zone) */}
            {destArea && (
              <div className="space-y-2">
                <Label>Delivery Location</Label>
                <Select
                  value={destZoneId}
                  onValueChange={(value) => {
                    setDestZoneId(value);
                    setFormData({ ...formData, pickupPoint: '' });
                  }}
                >
                  <SelectTrigger className="input-accent">
                    <SelectValue placeholder="-- Choose delivery location --" />
                  </SelectTrigger>
                  <SelectContent>
                    {zonesInArea
                      .filter(z => deliveryType === 'doorstep'
                        ? (z.zone_type ? z.zone_type === 'doorstep' : z.supports_doorstep)
                        : (z.zone_type ? z.zone_type === 'pickup' : true))
                      .map(z => (
                        <SelectItem key={z.id} value={z.id}>
                          {z.name}
                          {deliveryType === 'doorstep'
                            ? ` — KES ${clampDoorstep(Number(z.delivery_fee))}`
                            : ` — KES ${Number(z.delivery_fee)}`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Step 3: Agent Pickup Point (pickup_point only) */}
            {deliveryType === 'pickup_point' && destZoneId && (
              <div className="space-y-2">
                <Label>Agent Pickup Point</Label>
                <Select
                  value={formData.pickupPoint}
                  onValueChange={(value) => setFormData({ ...formData, pickupPoint: value })}
                >
                  <SelectTrigger className="input-accent">
                    <SelectValue placeholder="-- Choose agent --" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.filter(a => a.zone_id === destZoneId).map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.business_name} - {agent.location}
                      </SelectItem>
                    ))}
                    {agents.filter(a => a.zone_id === destZoneId).length === 0 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">No agents in this location</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

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

        {/* Pay on Delivery — doorstep only */}
        {deliveryType === 'doorstep' && (
          <div>
            <h2 className="section-accent font-semibold mb-4">Delivery Fee Payment</h2>
            <div className="flex items-start gap-2">
              <Checkbox
                id="payOnDelivery"
                checked={formData.payOnDelivery}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, payOnDelivery: checked === true })
                }
              />
              <div className="space-y-1">
                <Label htmlFor="payOnDelivery" className="cursor-pointer">
                  Pay on Delivery (KES {computedCost})
                </Label>
                <p className="text-xs text-muted-foreground">
                  {formData.payOnDelivery
                    ? 'The doorstep fee will not be charged at checkout. The rider will collect it on delivery as "Collect My Cash".'
                    : 'Leave unchecked to pay the doorstep fee now at checkout.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Collect on Delivery — not available for errand */}
        {deliveryType !== 'errand' && (
        <div>
          <h2 className="section-accent font-semibold mb-4">Collect on Delivery (COD)</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="collectCash"
                checked={formData.collectCash}
                onCheckedChange={(checked) => {
                  const isChecked = checked === true;
                  setFormData({
                    ...formData,
                    collectCash: isChecked,
                    codAmount: isChecked
                      ? (formData.codAmount || formData.packageValue || '')
                      : '',
                  });
                }}
              />
              <Label htmlFor="collectCash" className="cursor-pointer">
                Collect my cash from receiver
              </Label>
            </div>
            {formData.collectCash && (
              <div className="space-y-2">
                <Label>Amount to collect (editable)</Label>
                <Input
                  placeholder="Amount"
                  type="number"
                  value={formData.codAmount}
                  onChange={(e) => setFormData({ ...formData, codAmount: e.target.value })}
                  className="input-accent"
                />
                <p className="text-xs text-muted-foreground">
                  Defaults to your package value. This amount will be collected from the receiver and deposited to your Pochi wallet.
                </p>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Submit Button */}
        <div className="pt-4">
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting
              ? 'Creating Delivery...'
              : formData.payOnDelivery && deliveryType === 'doorstep'
                ? `Create Delivery - Pay KES ${computedCost} on delivery`
                : `Create Delivery - KES ${computedCost}`}
          </Button>
        </div>
      </div>

      <HelpButton />
      <BottomNav />
    </div>
  );
}
