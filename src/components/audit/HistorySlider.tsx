import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  User, 
  Calendar, 
  Activity,
  FileText,
  Edit,
  Power,
  Plus,
  GitCommit,
  Download
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AuditLog {
  id: string;
  actor: string;
  action: string;
  target: string;
  meta: any;
  created_at: string;
}

interface HistorySliderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: string;
  title: string;
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'command_created':
    case 'batch_created':
      return <Plus className="h-4 w-4 text-green-500" />;
    case 'command_updated':
    case 'batch_updated':
      return <Edit className="h-4 w-4 text-blue-500" />;
    case 'command_activated':
    case 'batch_activated':
      return <Power className="h-4 w-4 text-green-500" />;
    case 'command_deactivated':
    case 'batch_deactivated':
      return <Power className="h-4 w-4 text-red-500" />;
    case 'command_validation':
    case 'batch_validation':
      return <Activity className="h-4 w-4 text-primary" />;
    default:
      return <FileText className="h-4 w-4 text-muted-foreground" />;
  }
};

const getActionLabel = (action: string) => {
  return action.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

const formatMetaDiff = (meta: any, action: string) => {
  if (!meta) return null;

  // Handle different meta formats based on action type
  if (action.includes('updated') && meta.changes) {
    return (
      <div className="space-y-2">
        {Object.entries(meta.changes).map(([field, change]: [string, any]) => (
          <div key={field} className="text-xs">
            <span className="font-medium">{field}:</span>
            <div className="ml-2 space-y-1">
              {change.from && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">From</Badge>
                  <code className="text-xs bg-muted px-1 rounded">
                    {typeof change.from === 'object' ? JSON.stringify(change.from) : String(change.from)}
                  </code>
                </div>
              )}
              {change.to && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">To</Badge>
                  <code className="text-xs bg-muted px-1 rounded">
                    {typeof change.to === 'object' ? JSON.stringify(change.to) : String(change.to)}
                  </code>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (action.includes('validation') && meta.result) {
    return (
      <div className="text-xs space-y-1">
        <div>
          <span className="font-medium">Result:</span>
          <Badge 
            variant={meta.result === 'success' ? 'default' : 'destructive'} 
            className="ml-2 text-xs"
          >
            {meta.result}
          </Badge>
        </div>
        {meta.agent_snapshot && (
          <div>
            <span className="font-medium">Agent:</span>
            <span className="ml-2 text-muted-foreground">
              {meta.agent_snapshot.os} v{meta.agent_snapshot.agent_version}
            </span>
          </div>
        )}
      </div>
    );
  }

  if (action.includes('created') && meta.initial_config) {
    return (
      <div className="text-xs">
        <span className="font-medium">Initial Configuration:</span>
        <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">
          {JSON.stringify(meta.initial_config, null, 2)}
        </pre>
      </div>
    );
  }

  // Generic meta display
  if (meta && Object.keys(meta).length > 0) {
    return (
      <div className="text-xs">
        <span className="font-medium">Details:</span>
        <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">
          {JSON.stringify(meta, null, 2)}
        </pre>
      </div>
    );
  }

  return null;
};

export function HistorySlider({ open, onOpenChange, target, title }: HistorySliderProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && target) {
      fetchAuditLogs();
    }
  }, [open, target]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('target', target)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching audit logs:', error);
      } else {
        setAuditLogs(data || []);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportHistory = () => {
    const csvContent = [
      ['Timestamp', 'Actor', 'Action', 'Target', 'Details'].join(','),
      ...auditLogs.map(log => [
        new Date(log.created_at).toISOString(),
        log.actor,
        log.action,
        log.target,
        JSON.stringify(log.meta || {})
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${target}-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:w-[500px]">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <GitCommit className="h-5 w-5" />
                History: {title}
              </SheetTitle>
              <SheetDescription>
                Activity timeline and change history
              </SheetDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportHistory}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="h-full mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2" />
              <p>No history found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {auditLogs.map((log, index) => (
                <div key={log.id} className="relative">
                  {/* Timeline line */}
                  {index < auditLogs.length - 1 && (
                    <div className="absolute left-5 top-8 w-px h-8 bg-border" />
                  )}
                  
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full border-2 border-border bg-background flex items-center justify-center">
                      {getActionIcon(log.action)}
                    </div>
                    
                    <div className="flex-1 min-w-0 pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">
                            {getActionLabel(log.action)}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <User className="h-3 w-3" />
                            <span>{log.actor}</span>
                            <Calendar className="h-3 w-3 ml-2" />
                            <span>
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs ml-2">
                          {log.action}
                        </Badge>
                      </div>
                      
                      {formatMetaDiff(log.meta, log.action) && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                          {formatMetaDiff(log.meta, log.action)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}