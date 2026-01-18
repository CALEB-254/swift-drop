import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Package, Search, Plus, Truck, MapPin, Clock, Shield } from 'lucide-react';
import { useDeliveryStore } from '@/store/deliveryStore';
import { PackageCard } from '@/components/PackageCard';

export default function SenderHome() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const { packages } = useDeliveryStore();

  // Show recent packages (last 3)
  const recentPackages = packages.slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="gradient-hero text-primary-foreground">
        <div className="container py-12 px-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary-foreground/10 rounded-xl backdrop-blur-sm">
              <Package className="w-8 h-8" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">SwiftDeliver</h1>
              <p className="text-sm opacity-80">Fast & Reliable Delivery</p>
            </div>
          </div>
          
          <h2 className="font-display text-3xl font-bold mb-2 animate-fade-in">
            Send Packages<br />Anywhere, Anytime
          </h2>
          <p className="text-primary-foreground/80 mb-6 animate-fade-in">
            Affordable rates, real-time tracking, and secure delivery
          </p>

          {/* Quick Actions */}
          <div className="flex gap-3 mb-8">
            <Link to="/sender/new" className="flex-1">
              <Button variant="accent" size="lg" className="w-full gap-2">
                <Plus className="w-5 h-5" />
                New Delivery
              </Button>
            </Link>
            <Link to="/sender/track">
              <Button variant="outline" size="lg" className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20">
                <Search className="w-5 h-5" />
              </Button>
            </Link>
          </div>

          {/* Track Package */}
          <Card className="border-0 shadow-xl bg-card/95 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter tracking number..."
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="flex-1"
                />
                <Link to={trackingNumber ? `/sender/track?q=${trackingNumber}` : '/sender/track'}>
                  <Button variant="default">Track</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Features */}
      <div className="container py-8 px-4">
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Truck className="w-6 h-6 text-primary" />
            </div>
            <p className="text-xs font-medium">Fast Delivery</p>
          </div>
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-2">
              <MapPin className="w-6 h-6 text-accent" />
            </div>
            <p className="text-xs font-medium">Live Tracking</p>
          </div>
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-2">
              <Shield className="w-6 h-6 text-success" />
            </div>
            <p className="text-xs font-medium">Secure</p>
          </div>
        </div>

        {/* Recent Deliveries */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-lg">Recent Deliveries</h3>
            <Link to="/sender/history">
              <Button variant="ghost" size="sm" className="text-primary">
                View All
              </Button>
            </Link>
          </div>

          {recentPackages.length > 0 ? (
            <div className="space-y-4">
              {recentPackages.map((pkg) => (
                <Link key={pkg.id} to={`/sender/track?q=${pkg.trackingNumber}`}>
                  <PackageCard pkg={pkg} />
                </Link>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No deliveries yet</p>
                <Link to="/sender/new">
                  <Button variant="default" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Your First Delivery
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Pricing Info */}
        <Card className="mt-8 border-0 shadow-card">
          <CardContent className="p-6">
            <h3 className="font-display font-semibold text-lg mb-4">Delivery Rates</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Pickup Point</p>
                    <p className="text-xs text-muted-foreground">Collect from nearest hub</p>
                  </div>
                </div>
                <span className="font-display font-bold text-primary">KES 150</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-accent" />
                  <div>
                    <p className="font-medium">Doorstep Delivery</p>
                    <p className="text-xs text-muted-foreground">Direct to recipient</p>
                  </div>
                </div>
                <span className="font-display font-bold text-accent">KES 300</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
