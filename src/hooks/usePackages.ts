import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { DELIVERY_PRICING, DeliveryType } from '@/types/delivery';
import { Database } from '@/integrations/supabase/types';

type PackageRow = Database['public']['Tables']['packages']['Row'];
type PackageInsert = Database['public']['Tables']['packages']['Insert'];
type PackageStatus = Database['public']['Enums']['package_status'];
type DeliveryTypeEnum = Database['public']['Enums']['delivery_type'];

export interface Package {
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
  packagingColor: string | null;
  weight: number;
  cost: number;
  commission: number | null;
  status: PackageStatus;
  agentId: string | null;
  isProduct: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Generate tracking number
const generateTrackingNumber = () => {
  const prefix = 'MTN';
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  return `${prefix}${random}${timestamp}`;
};

const getCostByType = (type: DeliveryType): number => {
  switch (type) {
    case 'pickup_point':
      return DELIVERY_PRICING.pickupPointCost;
    case 'doorstep':
      return DELIVERY_PRICING.doorstepCost;
    case 'errand':
      return DELIVERY_PRICING.errandCost;
    default:
      return DELIVERY_PRICING.pickupPointCost;
  }
};

const mapRowToPackage = (row: PackageRow): Package => ({
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
  packagingColor: row.packaging_color,
  weight: row.weight ? Number(row.weight) : 0,
  cost: Number(row.cost),
  commission: row.commission ? Number(row.commission) : null,
  status: row.status,
  agentId: row.agent_id,
  isProduct: row.is_product ?? false,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

export interface CreatePackageData {
  senderName: string;
  senderPhone: string;
  senderAddress?: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  deliveryType: DeliveryType;
  pickupPoint?: string;
  packageDescription?: string;
  packageValue?: number;
  packagingColor?: string;
  weight?: number;
  isProduct?: boolean;
}

export function usePackages() {
  const { user, profile } = useAuth();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's packages
  const fetchPackages = useCallback(async () => {
    if (!user) {
      setPackages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('packages')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setPackages((data || []).map(mapRowToPackage));
      setError(null);
    } catch (err) {
      console.error('Error fetching packages:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch packages');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    fetchPackages();

    const channel = supabase
      .channel('packages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'packages',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newPkg = mapRowToPackage(payload.new as PackageRow);
            setPackages((prev) => [newPkg, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedPkg = mapRowToPackage(payload.new as PackageRow);
            setPackages((prev) =>
              prev.map((pkg) => (pkg.id === updatedPkg.id ? updatedPkg : pkg))
            );
          } else if (payload.eventType === 'DELETE') {
            setPackages((prev) =>
              prev.filter((pkg) => pkg.id !== (payload.old as { id: string }).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchPackages]);

  // Create a new package
  const createPackage = async (data: CreatePackageData): Promise<Package> => {
    if (!user || !profile) {
      throw new Error('You must be logged in to create a delivery');
    }

    const cost = getCostByType(data.deliveryType);
    const commission = cost * DELIVERY_PRICING.commissionRate;
    const trackingNumber = generateTrackingNumber();

    const insertData: PackageInsert = {
      user_id: user.id,
      tracking_number: trackingNumber,
      sender_name: profile.full_name || data.senderName,
      sender_phone: profile.phone || data.senderPhone,
      sender_address: data.senderAddress || profile.address,
      receiver_name: data.receiverName,
      receiver_phone: data.receiverPhone,
      receiver_address: data.receiverAddress,
      delivery_type: data.deliveryType as DeliveryTypeEnum,
      pickup_point: data.pickupPoint,
      package_description: data.packageDescription,
      package_value: data.packageValue,
      packaging_color: data.packagingColor,
      weight: data.weight || 0,
      cost,
      commission,
      is_product: data.isProduct || false,
    };

    const { data: newPackage, error: insertError } = await supabase
      .from('packages')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating package:', insertError);
      throw new Error(insertError.message);
    }

    return mapRowToPackage(newPackage);
  };

  // Get package by tracking number
  const getPackageByTracking = async (trackingNumber: string): Promise<Package | null> => {
    const { data, error: fetchError } = await supabase
      .from('packages')
      .select('*')
      .ilike('tracking_number', trackingNumber)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching package:', fetchError);
      return null;
    }

    return data ? mapRowToPackage(data) : null;
  };

  // Update package status
  const updatePackageStatus = async (id: string, status: PackageStatus): Promise<void> => {
    const { error: updateError } = await supabase
      .from('packages')
      .update({ status })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating package status:', updateError);
      throw new Error(updateError.message);
    }
  };

  // Get pending packages (for agents)
  const getPendingPackages = useCallback(() => {
    return packages.filter((pkg) => !pkg.agentId && pkg.status === 'pending');
  }, [packages]);

  // Get agent's assigned packages
  const getAgentPackages = useCallback(
    (agentId: string) => {
      return packages.filter((pkg) => pkg.agentId === agentId);
    },
    [packages]
  );

  return {
    packages,
    loading,
    error,
    createPackage,
    getPackageByTracking,
    updatePackageStatus,
    getPendingPackages,
    getAgentPackages,
    refetch: fetchPackages,
  };
}
