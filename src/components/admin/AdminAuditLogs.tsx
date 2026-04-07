import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Search, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { AdminData } from '@/pages/admin/AdminDashboard';

interface Props { data: AdminData; onRefresh: () => void; }

interface AuditLog {
  id: string;
  admin_id: string;
  admin_email: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  old_values: any;
  new_values: any;
  created_at: string;
}

export function AdminAuditLogs({ data, onRefresh }: Props) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    setLogs((data as AuditLog[]) || []);
    setLoading(false);
  };

  const actionColors: Record<string, string> = {
    create: 'text-primary bg-primary/10',
    update: 'text-info bg-info/10',
    delete: 'text-destructive bg-destructive/10',
    activate: 'text-primary bg-primary/10',
    deactivate: 'text-warning bg-warning/10',
  };

  const getActionColor = (action: string) => {
    const key = Object.keys(actionColors).find(k => action.includes(k));
    return key ? actionColors[key] : 'text-muted-foreground bg-muted';
  };

  const uniqueActions = [...new Set(logs.map(l => l.action))];

  const filtered = logs.filter(log => {
    const matchSearch = !search || 
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.admin_email?.toLowerCase().includes(search.toLowerCase()) ||
      log.target_table?.toLowerCase().includes(search.toLowerCase()) ||
      log.target_id?.toLowerCase().includes(search.toLowerCase());
    const matchAction = filterAction === 'all' || log.action === filterAction;
    return matchSearch && matchAction;
  });

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-4 mt-4">
      <h2 className="font-display font-bold">Audit Logs</h2>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {uniqueActions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-0 shadow-card">
          <CardContent className="p-6 text-center text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No audit logs found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(log => (
            <Card key={log.id} className="border-0 shadow-card">
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium mt-0.5 ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                    <div>
                      <p className="text-xs text-muted-foreground">{log.admin_email || 'Unknown admin'}</p>
                      {log.target_table && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          on <span className="font-medium">{log.target_table}</span>
                          {log.target_id && <> #{log.target_id.slice(0, 8)}</>}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {format(new Date(log.created_at), 'MMM dd HH:mm')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
