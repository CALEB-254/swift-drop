import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { DELIVERY_PRICING, DeliveryType } from '@/types/delivery';
import { Database } from '@/integrations/supabase/types';

type PackageRow = Database['public']['Tables']['packages']['Row'];
type PackageStatus = Database['public']['Enums']['package_status'];

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

export interface AgentStats {
  activeDeliveries: number;
  completedDeliveries: number;
  totalCommission: number;
  pendingCommission: number;
}

export function useAgentPackages() {
  const { user, profile } = useAuth();
  const [availablePackages, setAvailablePackages] = useState<Package[]>([]);
  const [myPackages, setMyPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAgent = profile?.role === 'agent';

  // Calculate agent stats from packages
  const calculateStats = useCallback((packages: Package[]): AgentStats => {
    const activeDeliveries = packages.filter(
      (pkg) => pkg.status !== 'delivered' && pkg.status !== 'cancelled'
    ).length;
    
    const completedPackages = packages.filter((pkg) => pkg.status === 'delivered');
    const completedDeliveries = completedPackages.length;
    
    const totalCommission = completedPackages.reduce(
      (sum, pkg) => sum + (pkg.commission || 0),
      0
    );
    
    const pendingPackages = packages.filter(
      (pkg) => pkg.status !== 'delivered' && pkg.status !== 'cancelled'
    );
    const pendingCommission = pendingPackages.reduce(
      (sum, pkg) => sum + (pkg.commission || 0),
      0
    );

    return {
      activeDeliveries,
      completedDeliveries,
      totalCommission,
      pendingCommission,
    };
  }, []);

  // Fetch available packages (pending, no agent assigned)
  const fetchAvailablePackages = useCallback(async () => {
    if (!user || !isAgent) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('packages')
        .select('*')
        .eq('status', 'pending')
        .is('agent_id', null)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setAvailablePackages((data || []).map(mapRowToPackage));
    } catch (err) {
      console.error('Error fetching available packages:', err);
    }
  }, [user, isAgent]);

  // Fetch agent's assigned packages
  const fetchMyPackages = useCallback(async () => {
    if (!user || !isAgent) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('packages')
        .select('*')
        .eq('agent_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setMyPackages((data || []).map(mapRowToPackage));
    } catch (err) {
      console.error('Error fetching my packages:', err);
    }
  }, [user, isAgent]);

  // Fetch all packages
  const fetchPackages = useCallback(async () => {
    if (!user || !isAgent) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      await Promise.all([fetchAvailablePackages(), fetchMyPackages()]);
      setError(null);
    } catch (err) {
      console.error('Error fetching packages:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch packages');
    } finally {
      setLoading(false);
    }
  }, [user, isAgent, fetchAvailablePackages, fetchMyPackages]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user || !isAgent) return;

    fetchPackages();

    const channel = supabase
      .channel('agent-packages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'packages',
        },
        () => {
          // Refetch on any change to ensure consistency
          fetchPackages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAgent, fetchPackages]);

  // Accept a package (assign to self)
  const acceptPackage = async (packageId: string): Promise<void> => {
    if (!user) throw new Error('You must be logged in');

    const { error: updateError } = await supabase
      .from('packages')
      .update({
        agent_id: user.id,
        status: 'picked_up' as PackageStatus,
      })
      .eq('id', packageId);

    if (updateError) {
      console.error('Error accepting package:', updateError);
      throw new Error(updateError.message);
    }
  };

  // Update package status
  const updatePackageStatus = async (
    packageId: string,
    status: PackageStatus
  ): Promise<void> => {
    const { error: updateError } = await supabase
      .from('packages')
      .update({ status })
      .eq('id', packageId);

    if (updateError) {
      console.error('Error updating package status:', updateError);
      throw new Error(updateError.message);
    }
  };

  // Get next status in workflow
  const getNextStatus = (currentStatus: PackageStatus): PackageStatus | null => {
    const statusFlow: Record<PackageStatus, PackageStatus | null> = {
      pending: 'picked_up',
      dropped_at_agent: 'picked_up',
      picked_up: 'in_transit',
      in_transit: 'out_for_delivery',
      out_for_delivery: 'delivered',
      delivered: null,
      cancelled: null,
    };
    return statusFlow[currentStatus];
  };

  // Derived data
  const activePackages = myPackages.filter(
    (pkg) => pkg.status !== 'delivered' && pkg.status !== 'cancelled'
  );
  
  const completedPackages = myPackages.filter((pkg) => pkg.status === 'delivered');
  
  const stats = calculateStats(myPackages);

  return {
    availablePackages,
    myPackages,
    activePackages,
    completedPackages,
    stats,
    loading,
    error,
    acceptPackage,
    updatePackageStatus,
    getNextStatus,
    refetch: fetchPackages,
  };
}
