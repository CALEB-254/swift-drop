import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, ChevronDown, Store, Truck, Bus } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { HelpButton } from '@/components/HelpButton';
import { DeliveryTypeCard } from '@/components/DeliveryTypeCard';
import { TopHeader } from '@/components/TopHeader';
import { DELIVERY_TYPES, DeliveryType } from '@/types/delivery';

const iconMap: Record<string, React.ReactNode> = {
  store: <Store className="w-6 h-6 text-primary" />,
  truck: <Truck className="w-6 h-6 text-primary" />,
  bus: <Bus className="w-6 h-6 text-primary" />,
};

export default function SenderHome() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<DeliveryType | null>(null);

  const handleTypeSelect = (type: DeliveryType) => {
    setSelectedType(type);
    navigate(`/sender/new?type=${type}`);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header with Map Background */}
      <div className="gradient-hero relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 10 L30 10 L30 30 L50 30 L50 50 L70 50 L70 70 L90 70' fill='none' stroke='%23000' stroke-width='1'/%3E%3Ccircle cx='20' cy='20' r='3' fill='%23000'/%3E%3Ccircle cx='50' cy='50' r='3' fill='%23000'/%3E%3Ccircle cx='80' cy='80' r='3' fill='%23000'/%3E%3C/svg%3E")`,
            backgroundSize: '100px 100px',
          }}
        />
        <div className="relative px-4 py-6">
          <div className="mb-6">
            <TopHeader />
          </div>
          <div className="relative">
            <Link to="/agents">
              <div className="bg-card rounded-lg flex items-center overflow-hidden">
                <div className="px-4">
                  <Search className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 h-10 flex items-center text-muted-foreground">
                  Find the nearest agent
                </div>
                <div className="px-4 py-3 hover:bg-muted transition-colors">
                  <ChevronDown className="w-5 h-5 text-muted-foreground rotate-[-90deg]" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Delivery Types */}
      <div className="px-4 py-6">
        <div className="mb-4">
          <h2 className="font-display text-lg font-semibold">Choose Delivery Type</h2>
          <p className="text-sm text-muted-foreground">Select one delivery mode, that fits you</p>
        </div>
        <div className="space-y-3">
          {DELIVERY_TYPES.map((type) => (
            <DeliveryTypeCard
              key={type.id}
              icon={iconMap[type.icon]}
              title={type.name}
              description={type.description}
              selected={selectedType === type.id}
              onClick={() => handleTypeSelect(type.id)}
            />
          ))}
        </div>
      </div>

      <HelpButton />
      <BottomNav />
    </div>
  );
}
