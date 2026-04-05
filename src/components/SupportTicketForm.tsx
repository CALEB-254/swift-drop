import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageSquare, Send, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function SupportTicketForm() {
  const { user } = useAuthContext();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('medium');
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [showTickets, setShowTickets] = useState(false);

  const submitTicket = async () => {
    if (!subject.trim() || !description.trim()) { toast.error('Fill in all fields'); return; }
    if (!user) { toast.error('Please login first'); return; }

    setSubmitting(true);
    const { error } = await supabase.from('support_tickets').insert({
      user_id: user.id,
      subject: subject.trim(),
      description: description.trim(),
      category,
      priority: priority as any,
    });
    setSubmitting(false);

    if (error) { toast.error(error.message); return; }
    toast.success('Support ticket submitted! We will get back to you soon.');
    setSubject('');
    setDescription('');
    setCategory('general');
    setPriority('medium');
    setOpen(false);
  };

  const loadTickets = async () => {
    if (!user) return;
    const { data } = await supabase.from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setTickets(data || []);
    setShowTickets(true);
  };

  const statusIcon = (status: string) => {
    if (status === 'open') return <AlertCircle className="w-4 h-4 text-warning" />;
    if (status === 'in_progress') return <Clock className="w-4 h-4 text-info" />;
    return <CheckCircle className="w-4 h-4 text-primary" />;
  };

  return (
    <>
      <div className="flex gap-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex-1 gap-2">
              <MessageSquare className="w-4 h-4" /> New Support Ticket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Submit Support Ticket</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="late_delivery">Late Delivery</SelectItem>
                    <SelectItem value="wrong_items">Wrong Items</SelectItem>
                    <SelectItem value="missing_order">Missing Order</SelectItem>
                    <SelectItem value="payment">Payment Issue</SelectItem>
                    <SelectItem value="account">Account Issue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subject *</Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief description of your issue" />
              </div>
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Provide details about your issue..." className="min-h-[100px]" />
              </div>
              <Button className="w-full gap-2" onClick={submitTicket} disabled={submitting}>
                <Send className="w-4 h-4" /> {submitting ? 'Submitting...' : 'Submit Ticket'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" onClick={loadTickets} className="gap-2">
          <Clock className="w-4 h-4" /> My Tickets
        </Button>
      </div>

      {/* My Tickets Dialog */}
      <Dialog open={showTickets} onOpenChange={setShowTickets}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>My Support Tickets</DialogTitle></DialogHeader>
          {tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No tickets yet</p>
          ) : (
            <div className="space-y-3">
              {tickets.map(ticket => (
                <Card key={ticket.id} className="border-0 shadow-card">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        {statusIcon(ticket.status)}
                        <div>
                          <p className="text-sm font-medium">{ticket.subject}</p>
                          <p className="text-xs text-muted-foreground capitalize">{ticket.category} · {ticket.priority}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(ticket.created_at), 'MMM d, yyyy HH:mm')}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${
                        ticket.status === 'open' ? 'bg-warning/10 text-warning'
                        : ticket.status === 'in_progress' ? 'bg-info/10 text-info'
                        : 'bg-primary/10 text-primary'
                      }`}>{ticket.status.replace('_', ' ')}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
