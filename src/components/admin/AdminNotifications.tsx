import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Send, Users, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AdminData } from '@/pages/admin/AdminDashboard';

interface Props { data: AdminData; onRefresh: () => void; }

export function AdminNotifications({ data }: Props) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [targetUserId, setTargetUserId] = useState('');
  const [sending, setSending] = useState(false);
  const [searchUser, setSearchUser] = useState('');

  const filteredUsers = data.users.filter(u =>
    searchUser && (u.full_name.toLowerCase().includes(searchUser.toLowerCase()) || u.phone.includes(searchUser))
  );

  const sendNotification = async () => {
    if (!title.trim() || !message.trim()) { toast.error('Title and message required'); return; }
    if (targetType === 'specific' && !targetUserId) { toast.error('Select a user'); return; }

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (targetType === 'all') {
        // Send to all users
        const notifs = data.users.map(u => ({
          user_id: u.user_id,
          title: title.trim(),
          message: message.trim(),
          type: 'admin_broadcast',
        }));
        const { error } = await supabase.from('notifications').insert(notifs);
        if (error) { toast.error(error.message); return; }

        // Also save broadcast record
        await supabase.from('broadcast_notifications').insert({
          title: title.trim(),
          message: message.trim(),
          target_type: 'all',
          sent_by: user.id,
        });

        toast.success(`Notification sent to ${data.users.length} users`);
      } else if (targetType === 'role') {
        const roleUsers = data.users.filter(u => u.role === targetUserId);
        if (roleUsers.length === 0) { toast.error('No users with this role'); return; }
        const notifs = roleUsers.map(u => ({
          user_id: u.user_id,
          title: title.trim(),
          message: message.trim(),
          type: 'admin_broadcast',
        }));
        const { error } = await supabase.from('notifications').insert(notifs);
        if (error) { toast.error(error.message); return; }
        toast.success(`Notification sent to ${roleUsers.length} ${targetUserId}s`);
      } else {
        // Send to specific user
        const { error } = await supabase.from('notifications').insert({
          user_id: targetUserId,
          title: title.trim(),
          message: message.trim(),
          type: 'admin_message',
        });
        if (error) { toast.error(error.message); return; }

        await supabase.from('broadcast_notifications').insert({
          title: title.trim(),
          message: message.trim(),
          target_type: 'specific',
          target_user_ids: [targetUserId],
          sent_by: user.id,
        });

        toast.success('Notification sent');
      }

      setTitle('');
      setMessage('');
      setTargetUserId('');
      setSearchUser('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4 mt-4">
      <Card className="border-0 shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-primary" />
            <p className="text-sm font-medium">Send Notification</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Target</Label>
              <Select value={targetType} onValueChange={v => { setTargetType(v); setTargetUserId(''); setSearchUser(''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="role">By Role</SelectItem>
                  <SelectItem value="specific">Specific User</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {targetType === 'role' && (
              <div className="space-y-2">
                <Label>Select Role</Label>
                <Select value={targetUserId} onValueChange={setTargetUserId}>
                  <SelectTrigger><SelectValue placeholder="Choose role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sender">Senders ({data.users.filter(u => u.role === 'sender').length})</SelectItem>
                    <SelectItem value="agent">Agents ({data.users.filter(u => u.role === 'agent').length})</SelectItem>
                    <SelectItem value="admin">Admins ({data.users.filter(u => u.role === 'admin').length})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {targetType === 'specific' && (
              <div className="space-y-2">
                <Label>Search User</Label>
                <Input value={searchUser} onChange={e => setSearchUser(e.target.value)} placeholder="Search by name or phone..." />
                {filteredUsers.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-1 border rounded-md p-1">
                    {filteredUsers.slice(0, 5).map(u => (
                      <button key={u.user_id} className={`w-full text-left text-sm p-2 rounded hover:bg-secondary ${targetUserId === u.user_id ? 'bg-primary/10' : ''}`}
                        onClick={() => { setTargetUserId(u.user_id); setSearchUser(u.full_name); }}>
                        <p className="font-medium">{u.full_name}</p>
                        <p className="text-xs text-muted-foreground">{u.phone} · {u.role}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Notification title" />
            </div>

            <div className="space-y-2">
              <Label>Message *</Label>
              <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Write your notification message..." className="min-h-[80px]" />
            </div>

            <Button className="w-full gap-2" onClick={sendNotification} disabled={sending}>
              <Send className="w-4 h-4" /> {sending ? 'Sending...' : 'Send Notification'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Templates */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-3">Quick Templates</p>
          <div className="space-y-2">
            {[
              { t: '🎉 Special Offer', m: 'Get 20% off your next delivery! Use code SWIFT20 at checkout.' },
              { t: '🚀 Service Update', m: 'We have expanded our delivery coverage area. Check the app for more details!' },
              { t: '⚠️ Maintenance Notice', m: 'Scheduled maintenance on Saturday 2AM-4AM. Some services may be briefly unavailable.' },
              { t: '📦 New Feature', m: 'We have added real-time package tracking! Open your package details to try it out.' },
            ].map((tmpl, i) => (
              <Button key={i} variant="outline" size="sm" className="w-full justify-start text-xs"
                onClick={() => { setTitle(tmpl.t); setMessage(tmpl.m); }}>
                {tmpl.t}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
