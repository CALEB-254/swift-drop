import { Card, CardContent } from '@/components/ui/card';
import { Users, Truck, Star, Clock } from 'lucide-react';
import type { AdminData } from '@/pages/admin/AdminDashboard';

interface Props { data: AdminData; onRefresh: () => void; }

export function AdminRiders({ data }: Props) {
  // Riders are agents who handle deliveries - for now show agent performance
  const agents = data.agents;
  
  const getAgentStats = (agentId: string) => {
    const agentPkgs = data.packages.filter(p => p.agent_id === agentId || p.pickup_agent_id === agentId);
    return {
      total: agentPkgs.length,
      delivered: agentPkgs.filter(p => p.status === 'delivered').length,
      pending: agentPkgs.filter(p => p.status === 'pending' || p.status === 'in_transit').length,
      commission: agentPkgs.filter(p => p.payment_status === 'paid').reduce((s, p) => s + (p.commission || 0), 0),
    };
  };

  return (
    <div className="space-y-4 mt-4">
      <Card className="border-0 shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="w-5 h-5 text-primary" />
            <p className="text-sm font-medium">Rider/Agent Performance</p>
          </div>
          <p className="text-xs text-muted-foreground">Track delivery performance across all agents</p>
        </CardContent>
      </Card>

      {agents.length === 0 ? (
        <Card className="border-0 shadow-card">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No riders/agents registered yet</p>
          </CardContent>
        </Card>
      ) : (
        agents.map(agent => {
          const agentStats = getAgentStats(agent.id);
          const deliveryRate = agentStats.total > 0 
            ? Math.round((agentStats.delivered / agentStats.total) * 100) 
            : 0;
          
          return (
            <Card key={agent.id} className="border-0 shadow-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium">{agent.business_name}</p>
                    <p className="text-sm text-muted-foreground">{agent.location}</p>
                    <p className="text-xs text-muted-foreground">{agent.phone}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    agent.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    {agent.is_active ? 'Online' : 'Offline'}
                  </span>
                </div>
                
                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-border">
                  <div className="text-center">
                    <p className="text-sm font-bold">{agentStats.total}</p>
                    <p className="text-[10px] text-muted-foreground">Total</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-primary">{agentStats.delivered}</p>
                    <p className="text-[10px] text-muted-foreground">Delivered</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-warning">{agentStats.pending}</p>
                    <p className="text-[10px] text-muted-foreground">Active</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold">{deliveryRate}%</p>
                    <p className="text-[10px] text-muted-foreground">Rate</p>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Commission earned: <span className="text-foreground font-medium">KES {agentStats.commission.toLocaleString()}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
