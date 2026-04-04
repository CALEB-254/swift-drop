import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save, Settings, DollarSign, Clock, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AdminData } from '@/pages/admin/AdminDashboard';

interface Props { data: AdminData; onRefresh: () => void; }

export function AdminConfig({ data, onRefresh }: Props) {
  const getConfig = (key: string) => {
    const item = data.config.find((c: any) => c.config_key === key);
    return item?.config_value || {};
  };

  const [deliveryCharges, setDeliveryCharges] = useState(getConfig('delivery_charges'));
  const [serviceFees, setServiceFees] = useState(getConfig('service_fees'));
  const [taxConfig, setTaxConfig] = useState(getConfig('tax_config'));
  const [workingHours, setWorkingHours] = useState(getConfig('working_hours'));
  const [serviceAreas, setServiceAreas] = useState(getConfig('service_areas'));

  const saveConfig = async (key: string, value: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('system_config').update({
      config_value: value,
      updated_by: user?.id,
    }).eq('config_key', key);
    if (error) { toast.error(error.message); return; }
    toast.success(`${key} updated!`);
    onRefresh();
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Delivery Charges */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-primary" />
            <p className="text-sm font-medium">Delivery Charges</p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Base Fee (KES)</Label>
              <Input type="number" value={deliveryCharges.base_fee || ''} onChange={e => setDeliveryCharges((p: any) => ({ ...p, base_fee: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Per KM (KES)</Label>
              <Input type="number" value={deliveryCharges.per_km || ''} onChange={e => setDeliveryCharges((p: any) => ({ ...p, per_km: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Express Multiplier</Label>
              <Input type="number" step="0.1" value={deliveryCharges.express_multiplier || ''} onChange={e => setDeliveryCharges((p: any) => ({ ...p, express_multiplier: Number(e.target.value) }))} />
            </div>
            <Button size="sm" className="w-full gap-2" onClick={() => saveConfig('delivery_charges', deliveryCharges)}>
              <Save className="w-3.5 h-3.5" /> Save
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Service Fees */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-4 h-4 text-warning" />
            <p className="text-sm font-medium">Service Fees</p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Platform Fee (KES)</Label>
              <Input type="number" value={serviceFees.platform_fee || ''} onChange={e => setServiceFees((p: any) => ({ ...p, platform_fee: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Insurance Rate</Label>
              <Input type="number" step="0.01" value={serviceFees.insurance_rate || ''} onChange={e => setServiceFees((p: any) => ({ ...p, insurance_rate: Number(e.target.value) }))} />
            </div>
            <Button size="sm" className="w-full gap-2" onClick={() => saveConfig('service_fees', serviceFees)}>
              <Save className="w-3.5 h-3.5" /> Save
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tax */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-info" />
            <p className="text-sm font-medium">Tax Configuration</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">VAT Enabled</Label>
              <Switch checked={taxConfig.enabled || false} onCheckedChange={v => setTaxConfig((p: any) => ({ ...p, enabled: v }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">VAT Rate</Label>
              <Input type="number" step="0.01" value={taxConfig.vat_rate || ''} onChange={e => setTaxConfig((p: any) => ({ ...p, vat_rate: Number(e.target.value) }))} />
            </div>
            <Button size="sm" className="w-full gap-2" onClick={() => saveConfig('tax_config', taxConfig)}>
              <Save className="w-3.5 h-3.5" /> Save
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Working Hours */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-primary" />
            <p className="text-sm font-medium">Working Hours</p>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Start</Label>
                <Input value={workingHours.start || ''} onChange={e => setWorkingHours((p: any) => ({ ...p, start: e.target.value }))} placeholder="06:00" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End</Label>
                <Input value={workingHours.end || ''} onChange={e => setWorkingHours((p: any) => ({ ...p, end: e.target.value }))} placeholder="22:00" />
              </div>
            </div>
            <Button size="sm" className="w-full gap-2" onClick={() => saveConfig('working_hours', workingHours)}>
              <Save className="w-3.5 h-3.5" /> Save
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Service Areas */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-warning" />
            <p className="text-sm font-medium">Service Areas</p>
          </div>
          <div className="space-y-2">
            {(serviceAreas.cities || []).map((city: string, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={city} onChange={e => {
                  const updated = [...(serviceAreas.cities || [])];
                  updated[i] = e.target.value;
                  setServiceAreas((p: any) => ({ ...p, cities: updated }));
                }} />
                <Button variant="ghost" size="sm" onClick={() => {
                  const updated = (serviceAreas.cities || []).filter((_: string, idx: number) => idx !== i);
                  setServiceAreas((p: any) => ({ ...p, cities: updated }));
                }} className="text-destructive">×</Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" onClick={() => setServiceAreas((p: any) => ({ ...p, cities: [...(p.cities || []), ''] }))}>
              Add City
            </Button>
            <Button size="sm" className="w-full gap-2" onClick={() => saveConfig('service_areas', serviceAreas)}>
              <Save className="w-3.5 h-3.5" /> Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
