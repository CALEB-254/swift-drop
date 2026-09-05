import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { DeliveryType } from '@/types/delivery';
import { Database } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';

type PackageRow = Database['public']['Tables']['packages']['Row'];
type PackageStatus = Database['public']['Enums']['package_status'];

export type PaymentMethod = 'prepaid' | 'pay_on_delivery' | 'collect_my_cash';

export interface RiderPackage {
  id: string;
  trackingNumber: string;
  userId: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string | null;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  deliveryType: DeliveryType;
  pickupPoint: string | null;
  packageDescription: string | null;
  packageValue: number | null;
  weight: number;
  cost: number;
  commission: number | null;
  status: PackageStatus;
  codAmount: number;
  codCollected: boolean;
  feeOnDelivery: boolean;
  feeCollected: boolean;
  paymentStatus: string;
  paymentMethod: PaymentMethod;
  amountDue: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PackageLog {
  id: string;
  action: string;
  actorName: string | null;
  actorId: string | null;
  statusBefore: string | null;
  statusAfter: string | null;
  locationText: string | null;
  notes: string | null;
  createdAt: Date;
}

export const REJECTION_REASONS = [
  'Sender not available',
  'Package not ready',
  'Incorrect package details',
  'Package damaged',
  'Pickup location unreachable',
  'Vehicle capacity exceeded',
  'Safety concern',
  'Other',
];

const mapRow = (row: PackageRow): RiderPackage => {
  const cod = row.cod_amount ? Number(row.cod_amount) : 0;
  const feeOnDelivery = !!(row as any).fee_on_delivery;
  const feeCollected = !!(row as any).fee_collected;
  const paymentStatus = (row as any).payment_status ?? 'pending';
  const cost = Number(row.cost);
  const paymentMethod: PaymentMethod =
    cod > 0 ? 'collect_my_cash' : feeOnDelivery ? 'pay_on_delivery' : 'prepaid';
  const amountDue =
    (cod > 0 && !row.cod_collected ? cod : 0) + (feeOnDelivery && !feeCollected ? cost : 0);

  return {
    id: row.id,
    trackingNumber: row.tracking_number,
    userId: row.user_id,
    senderName: row.sender_name,
    senderPhone: row.sender_phone,
    senderAddress: row.sender_address,
    receiverName: row.receiver_name,
    receiverPhone: row.receiver_phone,
    receiverAddress: row.receiver_address,
    deliveryType: row.delivery_type as DeliveryType,
    pickupPoint: row.pickup_point,
    packageDescription: row.package_description,
    packageValue: row.package_value ? Number(row.package_value) : null,
    weight: row.weight ? Number(row.weight) : 0,
    cost,
    commission: row.commission ? Number(row.commission) : null,
    status: row.status,
    codAmount: cod,
    codCollected: !!row.cod_collected,
    feeOnDelivery,
    feeCollected,
    paymentStatus,
    paymentMethod,
    amountDue,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
};

async function currentPosition(): Promise<{ lat: number | null; lng: number | null }> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return { lat: null, lng: null };
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ lat: null, lng: null }), 6000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        clearTimeout(timer);
        resolve({ lat: null, lng: null });
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  });
}

export function useRiderPackages() {
  const { user, profile } = useAuth();
  const [rider, setRider] = useState<any>(null);
  const [packages, setPackages] = useState<RiderPackage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRider = useCallback(async () => {
    if (!user) return null;
    const { data } = await supabase.from('riders').select('*').eq('user_id', user.id).maybeSingle();
    setRider(data ?? null);
    return data ?? null;
  }, [user]);

  const fetchPackages = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const r = rider ?? (await fetchRider());
      if (!r) {
        setPackages([]);
        return;
      }
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('assigned_rider_id', r.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPackages((data || []).map(mapRow));
    } catch (err) {
      logger.error('Error fetching rider packages:', err);
    } finally {
      setLoading(false);
    }
  }, [user, rider, fetchRider]);

  useEffect(() => {
    fetchPackages();
    if (!user) return;
    const channel = supabase
      .channel('rider-packages-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'packages' }, () => {
        fetchPackages();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchPackages]);

  const logAction = useCallback(
    async (
      pkg: RiderPackage,
      action: string,
      statusBefore: string | null,
      statusAfter: string | null,
      notes?: string
    ) => {
      if (!user) return;
      const { lat, lng } = await currentPosition();
      const { error } = await supabase.from('package_logs' as any).insert({
        package_id: pkg.id,
        tracking_number: pkg.trackingNumber,
        actor_id: user.id,
        actor_name: profile?.full_name ?? rider?.full_name ?? 'Rider',
        actor_role: 'rider',
        action,
        status_before: statusBefore,
        status_after: statusAfter,
        latitude: lat,
        longitude: lng,
        location_text: lat && lng ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : null,
        notes: notes ?? null,
      });
      if (error) logger.error('Error writing package log:', error);
    },
    [user, profile, rider]
  );

  const fetchLogs = useCallback(async (packageId: string): Promise<PackageLog[]> => {
    const { data, error } = await supabase
      .from('package_logs' as any)
      .select('*')
      .eq('package_id', packageId)
      .order('created_at', { ascending: true });
    if (error) {
      logger.error('Error fetching package logs:', error);
      return [];
    }
    return ((data as any[]) || []).map((l) => ({
      id: l.id,
      action: l.action,
      actorName: l.actor_name,
      actorId: l.actor_id,
      statusBefore: l.status_before,
      statusAfter: l.status_after,
      locationText: l.location_text,
      notes: l.notes,
      createdAt: new Date(l.created_at),
    }));
  }, []);

  const collectPackage = useCallback(
    async (pkg: RiderPackage) => {
      const { error } = await supabase
        .from('packages')
        .update({ status: 'picked_up' as PackageStatus })
        .eq('id', pkg.id);
      if (error) throw new Error(error.message);
      await logAction(pkg, 'Package Collected', pkg.status, 'picked_up');
      await fetchPackages();
    },
    [logAction, fetchPackages]
  );

  const collectPackages = useCallback(
    async (pkgs: RiderPackage[]) => {
      for (const pkg of pkgs) {
        await collectPackage(pkg);
      }
    },
    [collectPackage]
  );

  const rejectPackage = useCallback(
    async (pkg: RiderPackage, reason: string, notes?: string) => {
      const { error } = await supabase
        .from('packages')
        .update({ assigned_rider_id: null, rejection_reason: reason })
        .eq('id', pkg.id);
      if (error) throw new Error(error.message);
      await logAction(pkg, 'Package Rejected', pkg.status, pkg.status, [reason, notes].filter(Boolean).join(' — '));
      await fetchPackages();
    },
    [logAction, fetchPackages]
  );

  const updateStatus = useCallback(
    async (pkg: RiderPackage, status: PackageStatus) => {
      const { error } = await supabase.from('packages').update({ status }).eq('id', pkg.id);
      if (error) throw new Error(error.message);
      await logAction(pkg, `Status changed to ${status.replace(/_/g, ' ')}`, pkg.status, status);
      await fetchPackages();
    },
    [logAction, fetchPackages]
  );

  const collectPayment = useCallback(
    async (pkg: RiderPackage, phone?: string) => {
      const { data, error } = await supabase.functions.invoke('collect-payment', {
        body: { packageId: pkg.id, phone },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Failed to send payment prompt');
      await logAction(pkg, 'Payment Prompt Sent', pkg.status, 'awaiting_payment', `KES ${data.amount} to ${phone || pkg.receiverPhone}`);
      await fetchPackages();
      return data as { checkoutRequestId: string; amount: number };
    },
    [logAction, fetchPackages]
  );

  const checkCollectionStatus = useCallback(async (packageId: string) => {
    const { data, error } = await supabase.functions.invoke('collect-payment', {
      body: { packageId, action: 'status' },
    });
    if (error) throw new Error(error.message);
    return (data?.status as string) || 'none';
  }, []);

  const giveOutPackage = useCallback(
    async (pkg: RiderPackage, releaseCode: string) => {
      const { error } = await supabase.rpc('release_package' as any, {
        _package_id: pkg.id,
        _release_code: releaseCode.trim(),
      });
      if (error) throw new Error(error.message);
      await logAction(pkg, 'Package Delivered', pkg.status, 'delivered', 'Released with code');
      await fetchPackages();
    },
    [logAction, fetchPackages]
  );

  const setOnline = useCallback(
    async (online: boolean) => {
      if (!rider) return;
      const { error } = await supabase.from('riders').update({ is_online: online }).eq('id', rider.id);
      if (error) throw new Error(error.message);
      setRider({ ...rider, is_online: online });
    },
    [rider]
  );

  const assigned = packages.filter((p) => p.status === 'pending' || p.status === 'dropped_at_agent');
  const collected = packages.filter((p) => p.status === 'picked_up');
  const inTransit = packages.filter((p) => p.status === 'in_transit' || p.status === 'out_for_delivery');
  const awaitingPayment = packages.filter((p) => p.status === 'awaiting_payment');
  const delivered = packages.filter((p) => p.status === 'delivered');

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const deliveredToday = delivered.filter((p) => p.updatedAt >= startOfToday);
  const todaysEarnings = deliveredToday.reduce((s, p) => s + (p.commission || 0), 0);

  return {
    rider,
    packages,
    assigned,
    collected,
    inTransit,
    awaitingPayment,
    delivered,
    stats: {
      assigned: assigned.length,
      collected: collected.length,
      inTransit: inTransit.length,
      awaitingPayment: awaitingPayment.length,
      deliveredToday: deliveredToday.length,
      todaysEarnings,
    },
    loading,
    collectPackage,
    collectPackages,
    rejectPackage,
    updateStatus,
    collectPayment,
    checkCollectionStatus,
    giveOutPackage,
    fetchLogs,
    setOnline,
    refetch: fetchPackages,
  };
}
