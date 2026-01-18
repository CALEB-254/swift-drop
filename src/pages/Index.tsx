import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Package, Truck, ArrowRight, MapPin, Shield, Clock, Zap } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="gradient-hero text-primary-foreground min-h-[60vh] flex flex-col justify-center relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-20 right-10 w-32 h-32 bg-primary-foreground/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-48 h-48 bg-accent/10 rounded-full blur-3xl" />
        
        <div className="container py-16 px-4 relative z-10">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-3 bg-primary-foreground/10 rounded-xl backdrop-blur-sm">
              <Package className="w-8 h-8" />
            </div>
            <span className="font-display text-2xl font-bold">SwiftDeliver</span>
          </div>
          
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4 leading-tight animate-fade-in">
            Deliver Anywhere,<br />
            <span className="text-accent">Anytime</span>
          </h1>
          
          <p className="text-lg text-primary-foreground/80 mb-8 max-w-md animate-fade-in">
            Fast, reliable package delivery with real-time tracking and affordable rates.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-2 mb-8">
            {[
              { icon: Zap, text: 'Fast Delivery' },
              { icon: MapPin, text: 'Live Tracking' },
              { icon: Shield, text: 'Secure' },
            ].map(({ icon: Icon, text }) => (
              <span 
                key={text}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-foreground/10 rounded-full text-sm backdrop-blur-sm"
              >
                <Icon className="w-4 h-4" />
                {text}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* App Selection */}
      <div className="container py-12 px-4 -mt-16 relative z-20">
        <h2 className="font-display text-lg font-semibold text-center mb-6 text-foreground">
          Choose Your Portal
        </h2>
        
        <div className="grid gap-4 md:grid-cols-2 max-w-2xl mx-auto">
          {/* Sender App */}
          <Link to="/sender">
            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group cursor-pointer overflow-hidden">
              <CardContent className="p-0">
                <div className="gradient-primary p-6 text-primary-foreground">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary-foreground/10 rounded-xl">
                      <Package className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-xl">Send a Package</h3>
                      <p className="text-sm opacity-80">For customers</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-3 text-sm">
                      <Clock className="w-4 h-4 text-primary" />
                      <span>Create delivery orders</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span>Track packages in real-time</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                      <Shield className="w-4 h-4 text-primary" />
                      <span>Get delivery notifications</span>
                    </li>
                  </ul>
                  <Button variant="hero" className="w-full group-hover:shadow-lg">
                    Open Sender App
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Agent App */}
          <Link to="/agent">
            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group cursor-pointer overflow-hidden">
              <CardContent className="p-0">
                <div className="gradient-accent p-6 text-accent-foreground">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-accent-foreground/10 rounded-xl">
                      <Truck className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-xl">Delivery Agent</h3>
                      <p className="text-sm opacity-80">For riders</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-3 text-sm">
                      <Package className="w-4 h-4 text-accent" />
                      <span>Accept delivery requests</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                      <Clock className="w-4 h-4 text-accent" />
                      <span>Update delivery status</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                      <Zap className="w-4 h-4 text-accent" />
                      <span>Earn commission on deliveries</span>
                    </li>
                  </ul>
                  <Button variant="accent" className="w-full group-hover:shadow-lg">
                    Open Agent App
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Pricing Info */}
        <div className="mt-12 max-w-2xl mx-auto">
          <Card className="border-0 shadow-card bg-secondary/50">
            <CardContent className="p-6">
              <h3 className="font-display font-semibold text-center mb-4">Simple Pricing</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-card rounded-lg">
                  <MapPin className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="font-display text-2xl font-bold text-primary">KES 150</p>
                  <p className="text-sm text-muted-foreground">Pickup Point</p>
                </div>
                <div className="text-center p-4 bg-card rounded-lg">
                  <Truck className="w-6 h-6 text-accent mx-auto mb-2" />
                  <p className="font-display text-2xl font-bold text-accent">KES 300</p>
                  <p className="text-sm text-muted-foreground">Doorstep Delivery</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
