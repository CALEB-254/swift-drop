import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, ShoppingCart, Search, Package, MapPin, CreditCard, ShieldCheck } from 'lucide-react';
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
  type PaymentOption = 'pay_now' | 'pay_on_delivery' | 'collect_my_cash';
  const [paymentOption, setPaymentOption] = useState<PaymentOption>('pay_now');
  
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
    if (!/^0[17]\d{8}$/.test(formData.customerPhone)) {
      toast.error('Incorrect phone number. Use 10 digits starting with 07 or 01.');
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
        payOnDelivery: deliveryType !== 'errand' && paymentOption !== 'pay_now',
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
      <div className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <Link to="/sender" className="flex items-center gap-3" aria-label="Back to home">
            <ArrowLeft className="h-5 w-5 text-primary" />
            <span className="font-display text-lg font-semibold">Swift<span className="text-primary">Drop</span></span>
          </Link>
          <Button variant="ghost" size="icon" asChild><Link to="/sender/cart" aria-label="Cart"><ShoppingCart className="h-5 w-5" /></Link></Button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-5 flex items-start gap-3"><ArrowLeft className="mt-1 h-5 w-5 text-primary" /><div><h1 className="text-xl font-semibold">Create Delivery</h1><p className="text-sm text-muted-foreground">Fill in the details below to create a new delivery package.</p></div></div>
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <div className="space-y-3">
        {/* Customer Details */}
        <section className="rounded-lg border border-border bg-card p-4 sm:p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">1</span><Package className="h-4 w-4 text-primary" /> Customer Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
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
              placeholder="07XXXXXXXX or 01XXXXXXXX"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={formData.customerPhone}
              onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              className="input-accent"
            />
          </div>
        </div>
        </section>

        {/* From Area Section */}
        <section className="rounded-lg border border-border bg-card p-4 sm:p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">2</span><MapPin className="h-4 w-4 text-primary" /> Where Are You Sending From?</h2>
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
        </section>

        {/* Package Section */}
        <section className="rounded-lg border border-border bg-card p-4 sm:p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">3</span><Package className="h-4 w-4 text-primary" /> Package</h2>
          
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

          <div className="grid gap-4 sm:grid-cols-2">
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
        </section>

        {/* To Area Section */}
        <section className="rounded-lg border border-border bg-card p-4 sm:p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">4</span><MapPin className="h-4 w-4 text-primary" /> Where Are You Sending To?</h2>
          
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
        </section>

        {/* Payment option */}
        {deliveryType !== 'errand' && (
        <section className="rounded-lg border border-border bg-card p-4 sm:p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">5</span><CreditCard className="h-4 w-4 text-primary" /> Payment</h2>
          <RadioGroup
            value={paymentOption}
            onValueChange={(v) => {
              const opt = v as PaymentOption;
              setPaymentOption(opt);
              setFormData((prev) => ({
                ...prev,
                payOnDelivery: opt !== 'pay_now',
                collectCash: opt === 'collect_my_cash',
                codAmount:
                  opt === 'collect_my_cash'
                    ? (prev.codAmount || prev.packageValue || '')
                    : '',
              }));
            }}
            className="grid gap-3 sm:grid-cols-2"
          >
            <div className={`flex items-start gap-2 rounded-md border p-3 ${paymentOption === 'pay_now' ? 'border-primary bg-primary/10' : 'border-border'}`}>
              <RadioGroupItem value="pay_now" id="pay_now" className="mt-1" />
              <div>
                <Label htmlFor="pay_now" className="cursor-pointer">Pay Now (KES {computedCost})</Label>
                <p className="text-xs text-muted-foreground">You pay the delivery fee at checkout.</p>
              </div>
            </div>

            {deliveryType === 'doorstep' && (
              <div className={`flex items-start gap-2 rounded-md border p-3 ${paymentOption === 'pay_on_delivery' ? 'border-primary bg-primary/10' : 'border-border'}`}>
                <RadioGroupItem value="pay_on_delivery" id="pay_on_delivery" className="mt-1" />
                <div>
                  <Label htmlFor="pay_on_delivery" className="cursor-pointer">Pay on Delivery (KES {computedCost})</Label>
                  <p className="text-xs text-muted-foreground">
                    The receiver pays the delivery fee by M-Pesa when the rider arrives. Nothing is charged now.
                  </p>
                </div>
              </div>
            )}

            <div className={`flex items-start gap-2 rounded-md border p-3 ${paymentOption === 'collect_my_cash' ? 'border-primary bg-primary/10' : 'border-border'}`}>
              <RadioGroupItem value="collect_my_cash" id="collect_my_cash" className="mt-1" />
              <div className="w-full space-y-2">
                <Label htmlFor="collect_my_cash" className="cursor-pointer">Collect My Cash</Label>
                <p className="text-xs text-muted-foreground">
                  The receiver pays for the goods plus the delivery fee on delivery. The goods amount is credited to your Pochi wallet.
                </p>
                {paymentOption === 'collect_my_cash' && (
                  <div className="space-y-2">
                    <Label>Goods amount to collect (editable)</Label>
                    <Input
                      placeholder="Amount"
                      type="number"
                      value={formData.codAmount}
                      onChange={(e) => setFormData({ ...formData, codAmount: e.target.value })}
                      className="input-accent"
                    />
                    <p className="text-xs text-muted-foreground">
                      Total the receiver pays: KES{' '}
                      {((parseFloat(formData.codAmount) || 0) + computedCost).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </RadioGroup>
        </section>
        )}


        {/* Submit Button */}
        <div className="pt-2 lg:hidden">
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting
              ? 'Creating Delivery...'
              : paymentOption !== 'pay_now' && deliveryType !== 'errand'
                ? `Create Delivery - Pay KES ${computedCost} on delivery`
                : `Create Delivery - KES ${computedCost}`}
          </Button>
        </div>
        </div>
        <aside className="hidden space-y-4 lg:block lg:sticky lg:top-24">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex items-center gap-3 border-b border-border bg-primary/10 p-4"><Package className="h-5 w-5 text-primary" /><div><h2 className="text-sm font-semibold">Delivery Summary</h2><p className="text-xs text-muted-foreground">Quick overview of your package details</p></div></div>
            <dl className="divide-y divide-border px-4 text-sm">
              <div className="flex justify-between gap-4 py-3"><dt>Customer</dt><dd className="min-w-0 truncate text-muted-foreground">{formData.customerName || 'Not set'}</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt>Phone</dt><dd className="min-w-0 truncate text-muted-foreground">{formData.customerPhone || 'Not set'}</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt>From</dt><dd className="min-w-0 truncate text-muted-foreground">{fromAgent?.business_name || 'Not set'}</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt>To</dt><dd className="min-w-0 truncate text-muted-foreground">{selectedAgent?.business_name || destZone?.name || errandLocation?.name || 'Not set'}</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt>Package</dt><dd className="text-muted-foreground">{formData.packageDescription || 'Not set'}</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt>Payment</dt><dd className="text-muted-foreground">{paymentOption === 'pay_now' ? 'Pay Now' : paymentOption === 'pay_on_delivery' ? 'Pay on Delivery' : 'Collect My Cash'}</dd></div>
            </dl>
          </div>
          <div className="flex gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4"><ShieldCheck className="h-5 w-5 shrink-0 text-primary" /><div><p className="text-sm font-semibold">Safe &amp; Secure</p><p className="mt-1 text-xs text-muted-foreground">Your delivery is protected with tracking and verified handover.</p></div></div>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full" size="lg">{isSubmitting ? 'Creating Delivery...' : `Create Delivery - KES ${computedCost}`}</Button>
        </aside>
        </div>
      </div>

      <HelpButton />
      <BottomNav />
    </div>
  );
}
