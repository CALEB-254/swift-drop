import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageSquare, Send, Clock, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
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
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

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

  const openConversation = async (ticket: any) => {
    setActiveTicket(ticket);
    const { data } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  };

  useEffect(() => {
    if (!activeTicket) return;
    const channel = supabase
      .channel(`ticket-${activeTicket.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${activeTicket.id}` },
        (payload) => {
          setMessages((prev) => prev.find(m => m.id === (payload.new as any).id) ? prev : [...prev, payload.new]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeTicket?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  const sendReply = async () => {
    if (!reply.trim() || !user || !activeTicket) return;
    setSending(true);
    const text = reply.trim();
    const { data, error } = await supabase.from('ticket_messages').insert({
      ticket_id: activeTicket.id,
      sender_id: user.id,
      message: text,
      is_admin: false,
    }).select().single();
    setSending(false);
    if (error) { toast.error(error.message); return; }
    if (data) setMessages((prev) => prev.find(m => m.id === data.id) ? prev : [...prev, data]);
    setReply('');
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
                <Card
                  key={ticket.id}
                  className="border-0 shadow-card cursor-pointer hover:bg-muted/30"
                  onClick={() => openConversation(ticket)}
                >
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
                    <p className="text-[11px] text-primary mt-2">Tap to view conversation</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Conversation Dialog */}
      <Dialog open={!!activeTicket} onOpenChange={(o) => { if (!o) { setActiveTicket(null); setMessages([]); setReply(''); } }}>
        <DialogContent className="max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <button onClick={() => setActiveTicket(null)} aria-label="Back">
                <ArrowLeft className="w-4 h-4" />
              </button>
              {activeTicket?.subject}
            </DialogTitle>
            {activeTicket && (
              <p className="text-xs text-muted-foreground capitalize">
                {activeTicket.category} · {activeTicket.priority} · {activeTicket.status?.replace('_', ' ')}
              </p>
            )}
          </DialogHeader>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20 min-h-[300px] max-h-[50vh]">
            {activeTicket && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg px-3 py-2 bg-background border text-sm">
                  <p className="text-[10px] uppercase text-muted-foreground mb-1">You · original</p>
                  <p className="whitespace-pre-wrap">{activeTicket.description}</p>
                </div>
              </div>
            )}
            {messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    mine ? 'bg-primary text-primary-foreground' : 'bg-background border'
                  }`}>
                    <p className="text-[10px] uppercase opacity-70 mb-1">
                      {m.is_admin ? 'Support' : mine ? 'You' : 'User'} · {format(new Date(m.created_at), 'MMM d, HH:mm')}
                    </p>
                    <p className="whitespace-pre-wrap">{m.message}</p>
                  </div>
                </div>
              );
            })}
            {activeTicket && messages.length === 0 && (
              <p className="text-xs text-center text-muted-foreground py-4">
                No replies yet. Support will respond soon.
              </p>
            )}
          </div>

          <div className="p-3 border-t flex gap-2 items-end">
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type your message..."
              className="min-h-[44px] max-h-32 resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendReply();
                }
              }}
            />
            <Button onClick={sendReply} disabled={sending || !reply.trim()} size="icon" className="shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
