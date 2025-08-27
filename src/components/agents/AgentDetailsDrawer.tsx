import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Monitor, 
  Shield, 
  Settings, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Server,
  MapPin,
  Globe,
  Cpu,
  HardDrive,
  Activity,
  AlertTriangle,
  Key,
  RotateCcw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Agent {
  id: string;
  name: string;
  agent_type: string;
  status: 'running' | 'idle' | 'error' | 'offline';
  version?: string;
  os?: string;
  region?: string;
  ip_address?: string;
  last_seen: string | null;
  uptime_seconds: number;
  cpu_usage: number;
  memory_usage: number;
  tasks_completed: number;
  auto_updates_enabled: boolean;
  certificate_fingerprint?: string;
  signature_key_version: number;
  last_cert_rotation?: string;
  created_at: string;
}

interface AgentTask {
  id: string;
  task_name: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  created_at: string;
}

interface AgentLog {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

interface AgentDetailsDrawerProps {
  agent: Agent | null;
  isOpen: boolean;
  onClose: () => void;
  canManage: boolean;
}

const statusConfig = {
  running: { color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50' },
  idle: { color: 'bg-yellow-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50' },
  error: { color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50' },
  offline: { color: 'bg-gray-500', textColor: 'text-gray-700', bgColor: 'bg-gray-50' }
};

const taskStatusConfig = {
  pending: { icon: Clock, color: 'text-yellow-600' },
  running: { icon: Activity, color: 'text-blue-600' },
  success: { icon: CheckCircle2, color: 'text-green-600' },
  failed: { icon: XCircle, color: 'text-red-600' },
  cancelled: { icon: XCircle, color: 'text-gray-600' }
};

const logLevelConfig = {
  debug: { color: 'text-gray-600', bgColor: 'bg-gray-100' },
  info: { color: 'text-blue-600', bgColor: 'bg-blue-100' },
  warn: { color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  error: { color: 'text-red-600', bgColor: 'bg-red-100' }
};

export function AgentDetailsDrawer({ agent, isOpen, onClose, canManage }: AgentDetailsDrawerProps) {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (agent && isOpen) {
      fetchAgentData();
    }
  }, [agent, isOpen]);

  const fetchAgentData = async () => {
    if (!agent) return;
    
    setLoading(true);
    try {
      // Fetch tasks
      const { data: tasksData } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('agent_id', agent.id)
        .order('created_at', { ascending: false })
        .limit(50);

      // Fetch logs
      const { data: logsData } = await supabase
        .from('agent_logs')
        .select('*')
        .eq('agent_id', agent.id)
        .order('timestamp', { ascending: false })
        .limit(100);

      setTasks((tasksData || []) as AgentTask[]);
      setLogs((logsData || []) as AgentLog[]);
    } catch (error) {
      console.error('Error fetching agent data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load agent data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAutoUpdatesToggle = async (enabled: boolean) => {
    if (!agent || !canManage) return;

    try {
      const { error } = await supabase
        .from('agents')
        .update({ 
          auto_updates_enabled: enabled,
          updated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', agent.id);

      if (error) throw error;

      toast({
        title: 'Settings Updated',
        description: `Auto-updates ${enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error('Error updating auto-updates:', error);
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive',
      });
    }
  };

  const handleDeregisterAgent = async () => {
    if (!agent || !canManage) return;
    
    if (!confirm('Are you sure you want to deregister this agent? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', agent.id);

      if (error) throw error;

      toast({
        title: 'Agent Deregistered',
        description: 'Agent has been successfully deregistered',
      });
      
      onClose();
    } catch (error) {
      console.error('Error deregistering agent:', error);
      toast({
        title: 'Error',
        description: 'Failed to deregister agent',
        variant: 'destructive',
      });
    }
  };

  if (!agent) return null;

  const config = statusConfig[agent.status];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-2xl">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div>
              <SheetTitle className="text-xl">{agent.name}</SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-1">
                <Badge 
                  variant="secondary"
                  className={cn(
                    "text-xs font-medium border-0",
                    config.textColor,
                    config.bgColor
                  )}
                >
                  <div className={cn("w-2 h-2 rounded-full mr-1.5", config.color)} />
                  {agent.status}
                </Badge>
                <span>{agent.agent_type.replace('_', ' ')}</span>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  System Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Operating System</Label>
                  <p className="text-sm font-medium">{agent.os || 'Unknown'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Version</Label>
                  <p className="text-sm font-medium">{agent.version || 'Unknown'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Region</Label>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {agent.region || 'Unknown'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">IP Address</Label>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    {agent.ip_address || 'Unknown'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Last Heartbeat</Label>
                  <p className="text-sm font-medium">
                    {agent.last_seen 
                      ? new Date(agent.last_seen).toLocaleString()
                      : 'Never'
                    }
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Registered</Label>
                  <p className="text-sm font-medium">
                    {new Date(agent.created_at).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {tasks.map((task) => {
                  const TaskIcon = taskStatusConfig[task.status].icon;
                  return (
                    <Card key={task.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <TaskIcon className={cn("h-4 w-4", taskStatusConfig[task.status].color)} />
                              <span className="font-medium">{task.task_name}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Started: {task.started_at ? new Date(task.started_at).toLocaleString() : 'Not started'}
                            </p>
                            {task.completed_at && (
                              <p className="text-xs text-muted-foreground">
                                Completed: {new Date(task.completed_at).toLocaleString()}
                              </p>
                            )}
                            {task.error_message && (
                              <p className="text-xs text-red-600 mt-1">{task.error_message}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="ml-2">
                            {task.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {tasks.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No tasks found</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Cpu className="h-4 w-4" />
                    CPU Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{agent.cpu_usage}%</div>
                  <Progress value={agent.cpu_usage} className="mt-2" />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <HardDrive className="h-4 w-4" />
                    Memory Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{agent.memory_usage}%</div>
                  <Progress value={agent.memory_usage} className="mt-2" />
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Recent Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {logs.slice(0, 20).map((log) => (
                      <div key={log.id} className="flex items-start gap-2 text-sm">
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "text-xs px-2 py-0 h-5",
                            logLevelConfig[log.level].color,
                            logLevelConfig[log.level].bgColor
                          )}
                        >
                          {log.level}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="break-words">{log.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {logs.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No logs found</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Security Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Certificate Status</Label>
                    <p className="text-sm font-medium flex items-center gap-2">
                      {agent.certificate_fingerprint ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          Active
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          Not Configured
                        </>
                      )}
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">Signature Key Version</Label>
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      v{agent.signature_key_version}
                    </p>
                  </div>
                </div>
                
                {agent.certificate_fingerprint && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Certificate Fingerprint</Label>
                    <p className="text-xs font-mono bg-muted p-2 rounded mt-1 break-all">
                      {agent.certificate_fingerprint}
                    </p>
                  </div>
                )}
                
                {agent.last_cert_rotation && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Last Certificate Rotation</Label>
                    <p className="text-sm font-medium flex items-center gap-2">
                      <RotateCcw className="h-4 w-4" />
                      {new Date(agent.last_cert_rotation).toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            {canManage ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Agent Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto-updates</Label>
                        <p className="text-xs text-muted-foreground">
                          Automatically update agent when new versions are available
                        </p>
                      </div>
                      <Switch
                        checked={agent.auto_updates_enabled}
                        onCheckedChange={handleAutoUpdatesToggle}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Deregistering an agent will permanently remove it from your account.
                        This action cannot be undone.
                      </p>
                      <Button 
                        variant="destructive" 
                        onClick={handleDeregisterAgent}
                        className="w-full"
                      >
                        Deregister Agent
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    You don't have permission to modify agent settings.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}