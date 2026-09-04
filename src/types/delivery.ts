export type DeliveryType = 'pickup_point' | 'doorstep' | 'errand';

export type PackageStatus = 
  | 'pending' 
  | 'dropped_at_agent'
  | 'picked_up' 
  | 'in_transit' 
  | 'received_in_warehouse'
  | 'out_for_delivery' 
  | 'awaiting_payment'
  | 'delivered' 
  | 'cancelled'
  | 'refunded';

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
  packageValue?: number;
  packagingColor?: string;
  weight: number;
  cost: number;
  status: PackageStatus;
  createdAt: Date;
  updatedAt: Date;
  agentId?: string;
  commission?: number;
  isProduct?: boolean;
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
  errandCost: number;
  commissionRate: number;
}

export const DELIVERY_PRICING: DeliveryPricing = {
  pickupPointCost: 120,
  doorstepCost: 250,
  errandCost: 70,
  commissionRate: 0.15,
};

export const DELIVERY_TYPES = [
  {
    id: 'pickup_point' as DeliveryType,
    name: 'Agent Pickup Point',
    description: 'Pick a package from your Nearest pickup agents across Kenya.',
    icon: 'store',
    cost: 120,
  },
  {
    id: 'doorstep' as DeliveryType,
    name: 'Doorstep Delivery',
    description: 'Get your package delivered straight to your home.',
    icon: 'truck',
    cost: 250,
  },
  {
    id: 'errand' as DeliveryType,
    name: 'Errand Parcel',
    description: 'Pick your package from your favourite parcel provider. Eg. Ena Coach, Buscar, 2NK etc',
    icon: 'bus',
    cost: 70,
  },
];

export const PACKAGING_COLORS = [
  'Black',
  'White',
  'Brown',
  'Blue',
  'Red',
  'Green',
  'Yellow',
  'Transparent',
];

export const STATUS_LABELS: Record<PackageStatus, string> = {
  pending: 'Pending Pickup',
  dropped_at_agent: 'Dropped at Agent',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  received_in_warehouse: 'Received in Warehouse',
  out_for_delivery: 'Out for Delivery',
  awaiting_payment: 'Awaiting Payment',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export const STATUS_COLORS: Record<PackageStatus, string> = {
  pending: 'warning',
  dropped_at_agent: 'info',
  picked_up: 'info',
  in_transit: 'info',
  received_in_warehouse: 'info',
  out_for_delivery: 'primary',
  awaiting_payment: 'warning',
  delivered: 'success',
  cancelled: 'destructive',
  refunded: 'destructive',
};
