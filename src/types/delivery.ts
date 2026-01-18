export type DeliveryType = 'pickup_point' | 'doorstep';

export type PackageStatus = 
  | 'pending' 
  | 'picked_up' 
  | 'in_transit' 
  | 'out_for_delivery' 
  | 'delivered' 
  | 'cancelled';

export interface Package {
  id: string;
  trackingNumber: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  deliveryType: DeliveryType;
  pickupPoint?: string;
  packageDescription: string;
  weight: number;
  cost: number;
  status: PackageStatus;
  createdAt: Date;
  updatedAt: Date;
  agentId?: string;
  commission?: number;
}

export interface Agent {
  id: string;
  name: string;
  phone: string;
  email: string;
  totalCommission: number;
  pendingCommission: number;
  completedDeliveries: number;
  activeDeliveries: number;
}

export interface DeliveryPricing {
  pickupPointCost: number;
  doorstepCost: number;
  commissionRate: number;
}

export const DELIVERY_PRICING: DeliveryPricing = {
  pickupPointCost: 150,
  doorstepCost: 300,
  commissionRate: 0.15, // 15% commission
};

export const PICKUP_POINTS = [
  { id: '1', name: 'Central Hub - Downtown', address: '123 Main Street, Downtown' },
  { id: '2', name: 'East Point Station', address: '456 East Avenue, Eastside' },
  { id: '3', name: 'West Mall Collection', address: '789 West Boulevard, Westgate' },
  { id: '4', name: 'North Terminal', address: '321 North Road, Northville' },
  { id: '5', name: 'South Plaza Hub', address: '654 South Lane, Southpark' },
];

export const STATUS_LABELS: Record<PackageStatus, string> = {
  pending: 'Pending Pickup',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const STATUS_COLORS: Record<PackageStatus, string> = {
  pending: 'warning',
  picked_up: 'info',
  in_transit: 'info',
  out_for_delivery: 'primary',
  delivered: 'success',
  cancelled: 'destructive',
};
