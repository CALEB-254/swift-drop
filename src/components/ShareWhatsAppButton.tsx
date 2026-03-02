import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';

interface ShareWhatsAppButtonProps {
  pkg: {
    trackingNumber: string;
    receiverName: string;
    receiverPhone: string;
    receiverAddress: string;
    deliveryType: string;
    pickupPoint?: string | null;
    cost: number;
  };
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ShareWhatsAppButton({ pkg, variant = 'outline', size = 'sm' }: ShareWhatsAppButtonProps) {
  const handleShare = () => {
    const destination = pkg.deliveryType === 'pickup_point' && pkg.pickupPoint
      ? `Pickup Point: ${pkg.pickupPoint}`
      : `Address: ${pkg.receiverAddress}`;

    const message = `📦 *SwiftDrop Delivery Receipt*

Hi ${pkg.receiverName}, your package is on its way!

🔢 *Tracking:* ${pkg.trackingNumber}
📍 *${destination}*
💰 *Cost:* KES ${pkg.cost.toLocaleString()}

Track your package at: ${window.location.origin}/sender/track?tracking=${pkg.trackingNumber}

Thank you for using SwiftDrop! 🚀`;

    // Clean phone: remove spaces, ensure +254 format
    let phone = pkg.receiverPhone.replace(/\s+/g, '');
    if (phone.startsWith('0')) phone = '254' + phone.slice(1);
    if (!phone.startsWith('+')) phone = phone.startsWith('254') ? phone : '254' + phone;
    phone = phone.replace('+', '');

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <Button variant={variant} size={size} className="gap-2" onClick={handleShare}>
      <MessageCircle className="w-4 h-4" />
      <span className="hidden sm:inline">Share</span>
    </Button>
  );
}
