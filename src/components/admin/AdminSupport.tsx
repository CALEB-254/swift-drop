import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { MessageSquare, Clock, CheckCircle, AlertCircle, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { AdminData } from '@/pages/admin/AdminDashboard';

interface Props { data: AdminData; onRefresh: () => void; }

const STATUS_ICONS: Record<string, any> = {
  open: AlertCircle,
  in_progress: Clock,
  resolved: CheckCircle,
  closed: CheckCircle,
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-info/10 text-info',
  high: 'bg-warning/10 text-warning',
  urgent: 'bg-destructive/10 text-destructive',
};

export function AdminSupport({ data, onRefresh }: Props) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [newStatus, setNewStatus] = useState('');

  const filtered = data.tickets.filter(t => statusFilter === 'all' || t.status === statusFilter);

  const getUserName = (userId: string) => {
    const user = data.users.find(u => u.user_id === userId);
    return user?.full_name || 'Unknown';
  };

  const openTicket = async (ticket: any) => {
    setSelectedTicket(ticket);
    setNewStatus(ticket.status);
    const { data: msgs } = await supabase.from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });
    setMessages(msgs || []);
  };

  const sendReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('ticket_messages').insert({
      ticket_id: selectedTicket.id,
      sender_id: user.id,
      message: replyMessage.trim(),
      is_admin: true,
    });
    if (error) { toast.error(error.message); return; }
    setReplyMessage('');
    openTicket(selectedTicket);
  };

  const updateTicketStatus = async () => {
    if (!selectedTicket || !newStatus) return;
    const updates: any = { status: newStatus };
    if (newStatus === 'resolved') updates.resolved_at = new Date().toISOString();
    
    const { error } = await supabase.from('support_tickets').update(updates).eq('id', selectedTicket.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Ticket updated');
    setSelectedTicket(null);
    onRefresh();
  };

  const openCount = data.tickets.filter(t => t.status === 'open').length;
  const inProgressCount = data.tickets.filter(t => t.status === 'in_progress').length;

  return (
    <div className="space-y-3 mt-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-0 shadow-card">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-warning">{openCount}</p>
            <p className="text-[10px] text-muted-foreground">Open</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-info">{inProgressCount}</p>
            <p className="text-[10px] text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold">{data.tickets.length}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </CardContent>
        </Card>
      </div>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger><SelectValue placeholder="Filter by status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Tickets</SelectItem>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="resolved">Resolved</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
        </SelectContent>
      </Select>

      {filtered.length === 0 ? (
        <Card className="border-0 shadow-card">
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No support tickets</p>
          </CardContent>
        </Card>
      ) : (
        filtered.map(ticket => {
          const Icon = STATUS_ICONS[ticket.status] || AlertCircle;
          return (
            <Card key={ticket.id} className="border-0 shadow-card cursor-pointer" onClick={() => openTicket(ticket)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 mt-0.5 ${
                      ticket.status === 'open' ? 'text-warning' : ticket.status === 'in_progress' ? 'text-info' : 'text-primary'
                    }`} />
                    <div>
                      <p className="font-medium text-sm">{ticket.subject}</p>
                      <p className="text-xs text-muted-foreground">{getUserName(ticket.user_id)}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(ticket.created_at), 'MMM d, HH:mm')}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${PRIORITY_COLORS[ticket.priority]}`}>
                      {ticket.priority}
                    </span>
                    <span className="text-[10px] text-muted-foreground capitalize">{ticket.status.replace('_', ' ')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={open => !open && setSelectedTicket(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">{selectedTicket?.subject}</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground">
                <p>From: {getUserName(selectedTicket.user_id)}</p>
                <p>Category: {selectedTicket.category}</p>
                <p>Created: {format(new Date(selectedTicket.created_at), 'PPp')}</p>
              </div>
              
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-sm">{selectedTicket.description}</p>
              </div>

              {/* Messages */}
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {messages.map(msg => (
                  <div key={msg.id} className={`p-2 rounded-lg text-sm ${msg.is_admin ? 'bg-primary/10 ml-4' : 'bg-secondary/50 mr-4'}`}>
                    <p className="text-xs text-muted-foreground mb-1">
                      {msg.is_admin ? 'Admin' : getUserName(msg.sender_id)} · {format(new Date(msg.created_at), 'HH:mm')}
                    </p>
                    <p>{msg.message}</p>
                  </div>
                ))}
              </div>

              {/* Reply */}
              <div className="flex gap-2">
                <Textarea value={replyMessage} onChange={e => setReplyMessage(e.target.value)} placeholder="Type a reply..." className="min-h-[60px]" />
                <Button size="icon" onClick={sendReply} disabled={!replyMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              {/* Status Update */}
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Update Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" onClick={updateTicketStatus}>Update</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
