import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  Bot, 
  Activity, 
  Globe, 
  Server, 
  User, 
  Mail, 
  Calendar, 
  HardDrive, 
  Cpu, 
  MemoryStick,
  CreditCard,
  TrendingUp
} from 'lucide-react';

interface HeartbeatData {
  ram_mb?: number;
  ram_free_mb?: number;
  cpu_cores?: number;
  disk_total_gb?: number;
  disk_free_gb?: number;
  uptime?: string;
  architecture?: string;
  os_version?: string;
  timezone?: string;
  open_ports?: number[];
  running_services?: string[];
}

export default function AgentDetail() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();

  const { data: agent, isLoading: agentLoading } = useQuery({
    queryKey: ['agent', agentId],
    queryFn: async () => {
      const { data, error } = await api
        .from('agents')
        .select(`
          *,
          users:user_id (
            email,
            full_name
          )
        `)
        .eq('id', agentId!)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!agentId,
  });

  // Fetch agent usage data
  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['agent-usage', agentId],
    queryFn: async () => {
      if (!agentId) return null;
      
      // Get current usage for today
      const { data: usage } = await api
        .from('agent_usage')
        .select('usage_type, count')
        .eq('agent_id', agentId)
        .eq('usage_date', new Date().toISOString().split('T')[0]);

      // Mock plan data for now
      const planLimits = {
        name: agent?.plan_key === 'pro_plan' ? 'Pro Plan' : 
              agent?.plan_key === 'enterprise_plan' ? 'Enterprise Plan' : 'Free Plan',
        monthly_ai_requests: agent?.plan_key === 'pro_plan' ? 1000 : 
                           agent?.plan_key === 'enterprise_plan' ? 10000 : 25,
        monthly_server_events: agent?.plan_key === 'pro_plan' ? 5000 : 
                             agent?.plan_key === 'enterprise_plan' ? 50000 : 100
      };

      return {
        usage: usage || [],
        planLimits
      };
    },
    enabled: !!agentId,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      running: { variant: 'default' as const, label: 'Running', color: 'text-foreground' },
      idle: { variant: 'secondary' as const, label: 'Idle', color: 'text-foreground' },
      error: { variant: 'destructive' as const, label: 'Error', color: 'text-foreground' },
      offline: { variant: 'outline' as const, label: 'Offline', color: 'text-foreground' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.offline;
    
    return (
      <Badge variant={config.variant} className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (agentLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold mb-2">Agent Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested agent could not be found.</p>
          <Button onClick={() => navigate('/agents')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Agents
          </Button>
        </div>
      </div>
    );
  }

  const heartbeat = (agent.heartbeat as HeartbeatData) || {};

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Link 
          to="/agents"
          className="text-lg font-medium hover:text-primary transition-colors"
        >
          Agents
        </Link>
        <span className="text-lg text-muted-foreground">/</span>
        <span className="text-lg font-medium text-primary">
          {agent.hostname || `Agent ${agent.id.slice(0, 8)}`}
        </span>
      </div>

      {/* Agent Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Agent Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Agent ID</label>
              <code className="block text-sm bg-muted px-2 py-1 rounded font-mono mt-1">
                {agent.id}
              </code>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="mt-1">
                {getStatusBadge(agent.status)}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Hostname</label>
              <p className="text-sm mt-1">{String(agent.hostname || 'Not provided')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">OS</label>
              <p className="text-sm mt-1 capitalize">{String(agent.os || 'Unknown')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Version</label>
              <p className="text-sm mt-1">{String(agent.version || 'N/A')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Region</label>
              <p className="text-sm mt-1">{String(agent.region || 'N/A')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">IP Address</label>
              <p className="text-sm mt-1">{String(agent.ip_address || 'N/A')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Plan</label>
              <div className="mt-1">
                <Badge variant="outline">
                  {String(agent.plan_key || 'No Plan')}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Tasks Completed</label>
              <p className="text-sm mt-1">{String(agent.tasks_completed || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Associated User */}
      {agent.users && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Associated User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                <p className="text-sm mt-1">{agent.users.full_name || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="h-4 w-4" />
                  <button
                    onClick={() => navigate(`/users/${agent.user_id}`)}
                    className="text-sm text-primary hover:text-primary/80 hover:underline"
                  >
                    {agent.users.email}
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Plan Usage & Limits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {usageLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Current Plan</label>
                  <div className="mt-1">
                    <Badge variant="outline" className="text-sm">
                      {usageData?.planLimits?.name || 'Free Plan'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Usage Period</label>
                  <div className="flex items-center gap-1 mt-1">
                    <Calendar className="h-3 w-3" />
                    <span className="text-sm">Today ({new Date().toLocaleDateString()})</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* AI Requests Usage */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      AI Requests
                    </label>
                    <span className="text-sm text-muted-foreground">
                      {usageData?.usage?.find(u => u.usage_type === 'ai_request')?.count || 0} / {usageData?.planLimits?.monthly_ai_requests || 25}
                    </span>
                  </div>
                  <Progress 
                    value={((usageData?.usage?.find(u => u.usage_type === 'ai_request')?.count || 0) / (usageData?.planLimits?.monthly_ai_requests || 25)) * 100} 
                    className="h-2"
                  />
                </div>

                {/* Server Events Usage */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      Server Events
                    </label>
                    <span className="text-sm text-muted-foreground">
                      {usageData?.usage?.find(u => u.usage_type === 'server_event')?.count || 0} / {usageData?.planLimits?.monthly_server_events || 100}
                    </span>
                  </div>
                  <Progress 
                    value={((usageData?.usage?.find(u => u.usage_type === 'server_event')?.count || 0) / (usageData?.planLimits?.monthly_server_events || 100)) * 100} 
                    className="h-2"
                  />
                </div>
              </div>

              {/* Usage Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-lg font-semibold">{usageData?.usage?.reduce((sum, u) => sum + u.count, 0) || 0}</div>
                  <div className="text-xs text-muted-foreground">Total Requests Today</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-lg font-semibold">{agent?.tasks_completed || 0}</div>
                  <div className="text-xs text-muted-foreground">Tasks Completed</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-lg font-semibold">
                    {Math.max(0, (usageData?.planLimits?.monthly_ai_requests || 25) - (usageData?.usage?.find(u => u.usage_type === 'ai_request')?.count || 0))}
                  </div>
                  <div className="text-xs text-muted-foreground">AI Requests Remaining</div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* System Information */}
      {heartbeat && Object.keys(heartbeat).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {heartbeat.ram_mb && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <MemoryStick className="h-3 w-3" />
                    Total RAM
                  </label>
                  <p className="text-sm mt-1">{formatBytes(heartbeat.ram_mb * 1024 * 1024)}</p>
                </div>
              )}
              {heartbeat.ram_free_mb && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Free RAM</label>
                  <p className="text-sm mt-1">{formatBytes(heartbeat.ram_free_mb * 1024 * 1024)}</p>
                </div>
              )}
              {heartbeat.cpu_cores && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Cpu className="h-3 w-3" />
                    CPU Cores
                  </label>
                  <p className="text-sm mt-1">{heartbeat.cpu_cores}</p>
                </div>
              )}
              {heartbeat.disk_total_gb && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <HardDrive className="h-3 w-3" />
                    Total Disk
                  </label>
                  <p className="text-sm mt-1">{heartbeat.disk_total_gb} GB</p>
                </div>
              )}
              {heartbeat.disk_free_gb && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Free Disk</label>
                  <p className="text-sm mt-1">{heartbeat.disk_free_gb} GB</p>
                </div>
              )}
              {heartbeat.uptime && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Uptime</label>
                  <p className="text-sm mt-1">{heartbeat.uptime}</p>
                </div>
              )}
              {heartbeat.architecture && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Architecture</label>
                  <p className="text-sm mt-1">{heartbeat.architecture}</p>
                </div>
              )}
              {heartbeat.os_version && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">OS Version</label>
                  <p className="text-sm mt-1">{heartbeat.os_version}</p>
                </div>
              )}
              {heartbeat.timezone && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    Timezone
                  </label>
                  <p className="text-sm mt-1">{heartbeat.timezone}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Network & Services */}
      {heartbeat && (heartbeat.open_ports || heartbeat.running_services) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Network & Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {heartbeat.open_ports && heartbeat.open_ports.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Open Ports</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {heartbeat.open_ports?.map((port: number) => (
                      <Badge key={port} variant="secondary" className="text-xs">
                        {port}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {heartbeat.running_services && heartbeat.running_services.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Running Services</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {heartbeat.running_services?.map((service: string) => (
                      <Badge key={service} variant="outline" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}