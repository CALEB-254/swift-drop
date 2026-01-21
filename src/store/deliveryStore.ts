import { create } from 'zustand';
import { Package, Agent, PackageStatus, DELIVERY_PRICING, DeliveryType } from '@/types/delivery';

// Generate tracking number
const generateTrackingNumber = () => {
  const prefix = 'MTN';
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  return `${prefix}${random}${timestamp}`;
};

const getCostByType = (type: DeliveryType): number => {
  switch (type) {
    case 'xpress':
      return DELIVERY_PRICING.xpressCost;
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

// Demo packages
const demoPackages: Package[] = [
  {
    id: '1',
    trackingNumber: 'MTN-M4K7X-AB12',
    senderName: 'John Kamau',
    senderPhone: '+254712345678',
    senderAddress: 'Nairobi CBD',
    receiverName: 'Mary Wanjiku',
    receiverPhone: '+254723456789',
    receiverAddress: 'Westlands',
    deliveryType: 'doorstep',
    packageDescription: 'Electronics - Laptop',
    weight: 2.5,
    cost: 300,
    status: 'in_transit',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-16'),
    agentId: '1',
    commission: 45,
  },
  {
    id: '2',
    trackingNumber: 'MTN-N5L8Y-CD34',
    senderName: 'Peter Omondi',
    senderPhone: '+254734567890',
    senderAddress: 'Kilimani',
    receiverName: 'Grace Akinyi',
    receiverPhone: '+254745678901',
    receiverAddress: 'Kisumu',
    deliveryType: 'pickup_point',
    pickupPoint: 'Central Hub - Downtown',
    packageDescription: 'Documents',
    weight: 0.5,
    cost: 150,
    status: 'pending',
    createdAt: new Date('2024-01-17'),
    updatedAt: new Date('2024-01-17'),
  },
  {
    id: '3',
    trackingNumber: 'MTN-O6M9Z-EF56',
    senderName: 'Sarah Njeri',
    senderPhone: '+254756789012',
    senderAddress: 'Lavington',
    receiverName: 'David Kiprop',
    receiverPhone: '+254767890123',
    receiverAddress: 'Eldoret',
    deliveryType: 'doorstep',
    packageDescription: 'Clothing',
    weight: 1.5,
    cost: 300,
    status: 'delivered',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-12'),
    agentId: '1',
    commission: 45,
  },
];

// Demo agent
const demoAgent: Agent = {
  id: '1',
  name: 'James Mwangi',
  phone: '+254700123456',
  email: 'james@mtaani.com',
  totalCommission: 2340,
  pendingCommission: 540,
  completedDeliveries: 47,
  activeDeliveries: 3,
};

interface DeliveryStore {
  packages: Package[];
  agent: Agent;
  addPackage: (pkg: Omit<Package, 'id' | 'trackingNumber' | 'status' | 'createdAt' | 'updatedAt' | 'cost' | 'commission'>) => Package;
  updatePackageStatus: (id: string, status: PackageStatus) => void;
  assignAgent: (packageId: string, agentId: string) => void;
  getPackageByTracking: (trackingNumber: string) => Package | undefined;
  getPendingPackages: () => Package[];
  getAgentPackages: (agentId: string) => Package[];
}

export const useDeliveryStore = create<DeliveryStore>((set, get) => ({
  packages: demoPackages,
  agent: demoAgent,

  addPackage: (pkgData) => {
    const cost = getCostByType(pkgData.deliveryType);
    const commission = cost * DELIVERY_PRICING.commissionRate;

    const newPackage: Package = {
      ...pkgData,
      id: Date.now().toString(),
      trackingNumber: generateTrackingNumber(),
      status: 'pending',
      cost,
      commission,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set((state) => ({
      packages: [newPackage, ...state.packages],
    }));

    return newPackage;
  },

  updatePackageStatus: (id, status) => {
    set((state) => {
      const updatedPackages = state.packages.map((pkg) => {
        if (pkg.id === id) {
          const updated = { ...pkg, status, updatedAt: new Date() };
          
          // If delivered, calculate commission
          if (status === 'delivered' && pkg.agentId) {
            updated.commission = pkg.cost * DELIVERY_PRICING.commissionRate;
            
            // Update agent's commission
            set((s) => ({
              agent: {
                ...s.agent,
                totalCommission: s.agent.totalCommission + (updated.commission || 0),
                pendingCommission: s.agent.pendingCommission + (updated.commission || 0),
                completedDeliveries: s.agent.completedDeliveries + 1,
                activeDeliveries: Math.max(0, s.agent.activeDeliveries - 1),
              },
            }));
          }
          
          return updated;
        }
        return pkg;
      });

      return { packages: updatedPackages };
    });
  },

  assignAgent: (packageId, agentId) => {
    set((state) => ({
      packages: state.packages.map((pkg) =>
        pkg.id === packageId
          ? { ...pkg, agentId, updatedAt: new Date() }
          : pkg
      ),
      agent: {
        ...state.agent,
        activeDeliveries: state.agent.activeDeliveries + 1,
      },
    }));
  },

  getPackageByTracking: (trackingNumber) => {
    return get().packages.find(
      (pkg) => pkg.trackingNumber.toLowerCase() === trackingNumber.toLowerCase()
    );
  },

  getPendingPackages: () => {
    return get().packages.filter((pkg) => !pkg.agentId && pkg.status === 'pending');
  },

  getAgentPackages: (agentId) => {
    return get().packages.filter((pkg) => pkg.agentId === agentId);
  },
}));
