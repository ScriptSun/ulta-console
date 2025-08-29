import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
  RotateCcw,
  ListTodo,
  Network,
  Database,
  Zap,
  Wifi,
  BarChart3,
  Heart,
  Copy,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Agent {
  id: string;
  hostname?: string;
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
  customer_id: string;
  heartbeat?: any;
  last_heartbeat?: string;
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
  defaultTab?: string;
}

const statusConfig = {
  running: { 
    color: 'bg-gradient-to-r from-emerald-500/5 to-green-500/5 text-emerald-200 border-0 ring-1 ring-emerald-400/30 ring-inset backdrop-blur-xl rounded-full px-3 py-1', 
    dot: 'bg-emerald-400 ring-2 ring-emerald-400/20 ring-offset-1 ring-offset-transparent' 
  },
  idle: { 
    color: 'bg-gradient-to-r from-yellow-500/5 to-amber-500/5 text-yellow-200 border-0 ring-1 ring-yellow-400/30 ring-inset backdrop-blur-xl rounded-full px-3 py-1', 
    dot: 'bg-yellow-400 ring-2 ring-yellow-400/20 ring-offset-1 ring-offset-transparent' 
  },
  error: { 
    color: 'bg-gradient-to-r from-red-500/8 via-red-500/6 to-red-500/8 text-red-200 border-0 ring-1 ring-red-400/40 ring-inset backdrop-blur-xl rounded-full px-3 py-1', 
    dot: 'bg-gradient-to-r from-red-400 to-red-500 ring-2 ring-red-400/30 ring-offset-1 ring-offset-transparent' 
  },
  offline: { 
    color: 'bg-gradient-to-r from-slate-500/5 to-gray-500/5 text-gray-200 border-0 ring-1 ring-slate-400/30 ring-inset backdrop-blur-xl rounded-full px-3 py-1', 
    dot: 'bg-slate-400 ring-2 ring-slate-400/20 ring-offset-1 ring-offset-transparent' 
  },
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

export function AgentDetailsDrawer({ agent, isOpen, onClose, canManage, defaultTab = 'overview' }: AgentDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Always set to overview when drawer opens
    if (isOpen) {
      setActiveTab('overview');
    }
  }, [isOpen]);

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

  const copyHeartbeatToClipboard = async () => {
    if (!agent?.heartbeat) return;
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(agent.heartbeat, null, 2));
      toast({
        title: 'Copied!',
        description: 'Heartbeat JSON copied to clipboard',
      });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const validateHeartbeat = () => {
    if (!agent?.heartbeat) {
      toast({
        title: 'Validation Failed',
        description: 'No heartbeat data to validate',
        variant: 'destructive',
      });
      return;
    }

    const requiredKeys = ['agent_id', 'os', 'ip', 'open_ports', 'running_services'];
    const missingKeys = requiredKeys.filter(key => !(key in agent.heartbeat));

    if (missingKeys.length > 0) {
      toast({
        title: 'Validation Failed',
        description: `Missing required keys: ${missingKeys.join(', ')}`,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Validation Passed',
        description: 'All required keys are present in heartbeat',
      });
    }
  };

  if (!agent) return null;

  const config = statusConfig[agent.status];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-3xl flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <SheetTitle className="text-xl">{agent.id.slice(0, 5).toLowerCase()}@srvultahost.com</SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-3">
                <Badge 
                  variant="secondary"
                  className={`${config.color} gap-1`}
                >
                  <div className={`w-2 h-2 rounded-full ${config.dot}`} />
                  <span className="ml-1">{agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}</span>
                </Badge>
                <span>{agent.agent_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6 h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="heartbeat">Heartbeat</TabsTrigger>
              <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <TabsContent value="overview" className="space-y-6 p-1">
                  {/* System Information */}
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
                        <Label className="text-xs text-muted-foreground">Hostname</Label>
                        <p className="text-sm font-medium flex items-center gap-1">
                          <Server className="h-3 w-3" />
                          {agent.hostname || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Agent Type</Label>
                        <p className="text-sm font-medium capitalize">
                          {agent.agent_type}
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

                  {/* Security Status */}
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

                <TabsContent value="heartbeat" className="space-y-6 p-1">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Heart className="h-4 w-4" />
                        Agent Heartbeat
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-xs text-muted-foreground">Last heartbeat</Label>
                          <p className="text-sm font-medium">
                            {agent.last_heartbeat 
                              ? new Date(agent.last_heartbeat).toLocaleString()
                              : 'Unknown'
                            }
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={copyHeartbeatToClipboard}
                            disabled={!agent.heartbeat}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy JSON
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={validateHeartbeat}
                            disabled={!agent.heartbeat}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Validate
                          </Button>
                        </div>
                      </div>
                      
                      {agent.heartbeat && Object.keys(agent.heartbeat).length > 0 ? (
                        <div className="bg-muted rounded-lg p-4 max-h-96 overflow-auto">
                          <pre className="text-xs font-mono whitespace-pre-wrap">
                            {JSON.stringify(agent.heartbeat, null, 2)}
                          </pre>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No heartbeat data available</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="monitoring" className="space-y-6 p-1">
                  {/* Performance Metrics */}
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
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Used: {agent.cpu_usage.toFixed(1)}%</span>
                          <span>Free: {(100 - agent.cpu_usage).toFixed(1)}%</span>
                        </div>
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
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Used: {agent.memory_usage.toFixed(1)}%</span>
                          <span>Free: {(100 - agent.memory_usage).toFixed(1)}%</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Storage & Resources */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Database className="h-4 w-4" />
                          Disk Usage
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">75.2%</div>
                        <Progress value={75.2} className="mt-2" />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Used: 451 GB</span>
                          <span>Free: 149 GB</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Zap className="h-4 w-4" />
                          Load Average
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>1 min</span>
                            <span className="font-mono">1.24</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>5 min</span>
                            <span className="font-mono">1.18</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>15 min</span>
                            <span className="font-mono">1.05</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Wifi className="h-4 w-4" />
                          Network I/O
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>RX</span>
                            <span className="font-mono">124 MB/s</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>TX</span>
                            <span className="font-mono">89 MB/s</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Packets</span>
                            <span className="font-mono">15.2K/s</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Top Applications */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Top Applications
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {[
                          { name: 'nodejs', cpu: 15.2, memory: 8.3, pid: '1234' },
                          { name: 'nginx', cpu: 8.7, memory: 2.1, pid: '5678' },
                          { name: 'postgres', cpu: 12.4, memory: 15.6, pid: '9012' },
                          { name: 'redis-server', cpu: 3.1, memory: 4.2, pid: '3456' },
                          { name: 'docker', cpu: 6.8, memory: 11.9, pid: '7890' }
                        ].map((app, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center">
                                <span className="text-xs font-mono">{index + 1}</span>
                              </div>
                              <div>
                                <p className="font-medium font-mono text-sm">{app.name}</p>
                                <p className="text-xs text-muted-foreground">PID: {app.pid}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-medium">CPU: {app.cpu}%</p>
                              <p className="text-xs text-muted-foreground">RAM: {app.memory}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Resource Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Resource Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-muted/30 rounded">
                          <div className="text-2xl font-bold text-green-600">{(100 - agent.cpu_usage).toFixed(1)}%</div>
                          <div className="text-xs text-muted-foreground">CPU Free</div>
                        </div>
                        <div className="text-center p-3 bg-muted/30 rounded">
                          <div className="text-2xl font-bold text-blue-600">{(100 - agent.memory_usage).toFixed(1)}%</div>
                          <div className="text-xs text-muted-foreground">RAM Free</div>
                        </div>
                        <div className="text-center p-3 bg-muted/30 rounded">
                          <div className="text-2xl font-bold text-purple-600">24.8%</div>
                          <div className="text-xs text-muted-foreground">Disk Free</div>
                        </div>
                        <div className="text-center p-3 bg-muted/30 rounded">
                          <div className="text-2xl font-bold text-orange-600">4</div>
                          <div className="text-xs text-muted-foreground">CPU Cores</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4 p-1">
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
              </ScrollArea>
            </div>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
