import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Send, ImagePlus, X, Loader2, CheckCheck, Eye, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { AdminData } from '@/pages/admin/AdminDashboard';

interface Receipt {
  id: string;
  user_id: string;
  title: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

interface Props { data: AdminData; onRefresh: () => void; }

export function AdminNotifications({ data }: Props) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [targetUserId, setTargetUserId] = useState('');
  const [sending, setSending] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState('general');
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(true);

  /** Read receipts for messages sent from the admin dashboard. */
  const loadReceipts = useCallback(async () => {
    setLoadingReceipts(true);
    const { data: rows } = await supabase
      .from('notifications')
      .select('id, user_id, title, is_read, read_at, created_at')
      .in('type', ['admin_broadcast', 'admin_message'])
      .order('created_at', { ascending: false })
      .limit(100);
    setReceipts((rows as Receipt[]) || []);
    setLoadingReceipts(false);
  }, []);

  useEffect(() => { loadReceipts(); }, [loadReceipts]);

  const nameFor = (userId: string) =>
    data.users.find(u => u.user_id === userId)?.full_name || 'User';

  /** Uploads to the private notification-media bucket and keeps a long-lived signed URL. */
  const handleMediaUpload = async (file: File) => {
    const isVideo = file.type.startsWith('video/');
    if (!file.type.startsWith('image/') && !isVideo) {
      toast.error('Only images and videos are supported');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error('File too large', { description: 'Maximum size is 25MB.' });
      return;
    }
    setUploading(true);
    try {
      const path = `broadcasts/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error: upErr } = await supabase.storage
        .from('notification-media')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (upErr) { toast.error('Upload failed', { description: upErr.message }); return; }

      const { data: signed, error: signErr } = await supabase.storage
        .from('notification-media')
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (signErr || !signed) { toast.error('Could not generate media link'); return; }

      setMediaUrl(signed.signedUrl);
      setMediaType(isVideo ? 'video' : 'image');
      toast.success('Media attached');
    } finally {
      setUploading(false);
    }
  };

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
          category,
          media_url: mediaUrl,
          media_type: mediaType,
        }));
        const { error } = await supabase.from('notifications').insert(notifs);
        if (error) { toast.error(error.message); return; }

        // Also save broadcast record
        await supabase.from('broadcast_notifications').insert({
          title: title.trim(),
          message: message.trim(),
          target_type: 'all',
          sent_by: user.id,
          category,
          media_url: mediaUrl,
          media_type: mediaType,
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
          category,
          media_url: mediaUrl,
          media_type: mediaType,
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
          category,
          media_url: mediaUrl,
          media_type: mediaType,
        });
        if (error) { toast.error(error.message); return; }

        await supabase.from('broadcast_notifications').insert({
          title: title.trim(),
          message: message.trim(),
          target_type: 'specific',
          target_user_ids: [targetUserId],
          sent_by: user.id,
          category,
          media_url: mediaUrl,
          media_type: mediaType,
        });

        toast.success('Notification sent');
      }

      setTitle('');
      setMessage('');
      setTargetUserId('');
      setSearchUser('');
      setMediaUrl(null);
      setMediaType(null);
      loadReceipts();
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

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="packages">Packages</SelectItem>
                  <SelectItem value="payments">Payments</SelectItem>
                  <SelectItem value="offers">Offers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="broadcast-media">Photo or video (optional)</Label>
              {mediaUrl ? (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  {mediaType === 'video' ? (
                    <video src={mediaUrl} controls className="w-full max-h-48 bg-black" />
                  ) : (
                    <img src={mediaUrl} alt="Attached media preview" className="w-full max-h-48 object-cover" />
                  )}
                  <Button
                    type="button" variant="secondary" size="icon"
                    aria-label="Remove media"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={() => { setMediaUrl(null); setMediaType(null); }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <label
                  htmlFor="broadcast-media"
                  className="flex items-center justify-center gap-2 h-20 rounded-lg border-2 border-dashed border-border cursor-pointer text-sm text-muted-foreground hover:border-primary/60"
                >
                  {uploading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                    : <><ImagePlus className="w-4 h-4" /> Upload photo or video</>}
                </label>
              )}
              <input
                id="broadcast-media"
                type="file"
                accept="image/*,video/*"
                className="sr-only"
                disabled={uploading}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleMediaUpload(f); e.target.value = ''; }}
              />
            </div>

            <Button className="w-full gap-2" onClick={sendNotification} disabled={sending || uploading}>
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

      {/* Read receipts */}
      <Card className="border-0 shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium">Read receipts</p>
            </div>
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={loadReceipts} disabled={loadingReceipts}>
              <RefreshCw className={`w-4 h-4 ${loadingReceipts ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
          {loadingReceipts ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : receipts.length === 0 ? (
            <p className="text-xs text-muted-foreground">No admin messages sent yet.</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-2">
                {receipts.filter(r => r.is_read).length} of {receipts.length} recent messages viewed
              </p>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {receipts.map(r => (
                  <div key={r.id} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-secondary/30">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{r.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {nameFor(r.user_id)} · sent {format(new Date(r.created_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    {r.is_read ? (
                      <span className="text-[10px] text-primary flex items-center gap-1 shrink-0">
                        <CheckCheck className="w-3 h-3" />
                        {r.read_at ? format(new Date(r.read_at), 'MMM d, h:mm a') : 'Read'}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground shrink-0">Unread</span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
