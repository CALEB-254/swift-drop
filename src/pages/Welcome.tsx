import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Package, Truck, Shield, Clock, ArrowRight } from 'lucide-react';

export default function Welcome() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <div className="gradient-hero relative overflow-hidden flex-1 flex flex-col">
        {/* Map pattern overlay */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 10 L30 10 L30 30 L50 30 L50 50 L70 50 L70 70 L90 70' fill='none' stroke='%23fff' stroke-width='1'/%3E%3Ccircle cx='20' cy='20' r='3' fill='%23fff'/%3E%3Ccircle cx='50' cy='50' r='3' fill='%23fff'/%3E%3Ccircle cx='80' cy='80' r='3' fill='%23fff'/%3E%3C/svg%3E")`,
            backgroundSize: '100px 100px',
          }}
        />
        
        <div className="relative flex-1 flex flex-col px-6 py-8">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-auto">
            <div className="w-10 h-10 bg-primary-foreground rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <span className="font-display text-xl font-bold text-primary-foreground">
              Canyi Delivery
            </span>
          </div>

          {/* Hero Content */}
          <div className="my-auto py-12">
            <h1 className="font-display text-4xl font-bold text-primary-foreground mb-4 leading-tight">
              Fast & Reliable
              <br />
              Package Delivery
            </h1>
            <p className="text-primary-foreground/80 text-lg mb-8 max-w-sm">
              Send packages anywhere in Kenya with real-time tracking and professional agents.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2 mb-8">
              <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary-foreground" />
                <span className="text-sm text-primary-foreground">Same Day</span>
              </div>
              <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary-foreground" />
                <span className="text-sm text-primary-foreground">Secure</span>
              </div>
              <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary-foreground" />
                <span className="text-sm text-primary-foreground">Tracked</span>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3 mt-auto">
            <Link to="/auth/login" className="block">
              <Button 
                size="lg" 
                className="w-full h-14 text-base font-semibold bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              >
                Sign In
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/auth/signup" className="block">
              <Button 
                size="lg" 
                variant="outline"
                className="w-full h-14 text-base font-semibold border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              >
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
