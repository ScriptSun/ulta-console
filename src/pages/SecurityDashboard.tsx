import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Users, 
  MessageSquare, 
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  RefreshCw,
  Eye
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface SecurityEvent {
  id: string;
  tenant_id: string;
  event_type: string;
  severity: string;
  source: string;
  ip_address: string;
  user_agent: string;
  session_id: string | null;
  ticket_id: string | null;
  origin: string | null;
  details: any;
  created_at: string;
}

interface AuditLog {
  id: string;
  customer_id: string;
  actor: string;
  action: string;
  target: string;
  meta: any;
  created_at: string;
}

interface WidgetMetric {
  id: string;
  tenant_id: string;
  metric_type: string;
  metric_value: number;
  metadata: any;
  date_bucket: string;
  created_at: string;
}

interface DashboardStats {
  totalTicketsIssued: number;
  bootstrapSuccessRate: number;
  securityEvents24h: number;
  activeConversations: number;
}

export default function SecurityDashboard() {
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [widgetMetrics, setWidgetMetrics] = useState<WidgetMetric[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalTicketsIssued: 0,
    bootstrapSuccessRate: 0,
    securityEvents24h: 0,
    activeConversations: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch security events (last 24 hours)
      const { data: eventsData, error: eventsError } = await supabase
        .from('audit_logs') // Using audit_logs as fallback since security_events may not exist yet
        .select('*')
        .in('action', ['security_event', 'invalid_ticket', 'origin_mismatch', 'replay_attempt', 'csrf_fail'])
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (eventsError) {
        console.log('Security events query failed, using empty array:', eventsError);
      }

      // Fetch audit logs (last 100)
      const { data: auditData, error: auditError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (auditError) throw auditError;

      // Fetch widget metrics (last 7 days)
      const { data: metricsData, error: metricsError } = await supabase
        .from('widget_metrics')
        .select('*')
        .gte('date_bucket', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date_bucket', { ascending: false });

      if (metricsError) throw metricsError;

      // Calculate dashboard stats
      const ticketsIssued = metricsData?.filter(m => m.metric_type === 'tickets_issued')
        .reduce((sum, m) => sum + m.metric_value, 0) || 0;
      
      const bootstrapSuccess = metricsData?.filter(m => m.metric_type === 'bootstrap_success')
        .reduce((sum, m) => sum + m.metric_value, 0) || 0;
      
      const bootstrapFailures = metricsData?.filter(m => m.metric_type === 'bootstrap_failure')
        .reduce((sum, m) => sum + m.metric_value, 0) || 0;
      
      const successRate = (bootstrapSuccess + bootstrapFailures) > 0 
        ? (bootstrapSuccess / (bootstrapSuccess + bootstrapFailures)) * 100 
        : 0;

      // Transform audit logs to security event format
      const transformedEvents: SecurityEvent[] = (eventsData || [])
        .filter(log => ['security_event', 'invalid_ticket', 'origin_mismatch', 'replay_attempt', 'csrf_fail'].includes(log.action))
        .map(log => {
          const meta = log.meta as any; // Type assertion for JSON data
          return {
            id: log.id,
            tenant_id: log.customer_id,
            event_type: log.action,
            severity: meta?.severity || 'medium',
            source: meta?.source || 'unknown',
            ip_address: meta?.ip_address || '',
            user_agent: meta?.user_agent || '',
            session_id: meta?.session_id || null,
            ticket_id: meta?.ticket_id || null,
            origin: meta?.origin || null,
            details: meta || {},
            created_at: log.created_at
          };
        });

      setSecurityEvents(transformedEvents);
      setAuditLogs(auditData || []);
      setWidgetMetrics(metricsData || []);
      setDashboardStats({
        totalTicketsIssued: ticketsIssued,
        bootstrapSuccessRate: successRate,
        securityEvents24h: transformedEvents.length,
        activeConversations: auditData?.filter(log => 
          log.action === 'chat_start' && 
          new Date(log.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length || 0
      });

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      low: "secondary",
      medium: "outline",
      high: "destructive",
    };
    
    return (
      <Badge variant={variants[severity] || "outline"}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const getEventIcon = (eventType: string) => {
    const icons: Record<string, any> = {
      invalid_ticket: XCircle,
      origin_mismatch: AlertTriangle,
      replay_attempt: Shield,
      csrf_fail: AlertTriangle,
      websocket_rejected: XCircle,
    };
    
    const IconComponent = icons[eventType] || Shield;
    return <IconComponent className="h-4 w-4" />;
  };

  const getActionIcon = (action: string) => {
    const icons: Record<string, any> = {
      chat_start: MessageSquare,
      message_stored: MessageSquare,
      router_decision: Activity,
      task_link: CheckCircle,
      ticket_issued: Shield,
      widget_bootstrap_success: CheckCircle,
    };
    
    const IconComponent = icons[action] || Activity;
    return <IconComponent className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Security Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor security events, widget metrics, and system activity
            </p>
          </div>
        </div>
        <Button onClick={fetchDashboardData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Tickets Issued (7d)</span>
            </div>
            <div className="text-2xl font-bold">{dashboardStats.totalTicketsIssued}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Bootstrap Success Rate</span>
            </div>
            <div className="text-2xl font-bold">{dashboardStats.bootstrapSuccessRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">Security Events (24h)</span>
            </div>
            <div className="text-2xl font-bold">{dashboardStats.securityEvents24h}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Active Conversations</span>
            </div>
            <div className="text-2xl font-bold">{dashboardStats.activeConversations}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="security" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="security">Security Events</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="metrics">Widget Metrics</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Security Events Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Security Events (Last 24 Hours)
              </CardTitle>
              <CardDescription>
                Monitor failed authentication attempts, origin mismatches, and security violations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {securityEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2" />
                  <p>No security events in the last 24 hours</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {securityEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getEventIcon(event.event_type)}
                            <span className="font-mono text-sm">
                              {event.event_type.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getSeverityBadge(event.severity)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {event.source}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {event.ip_address || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground max-w-xs truncate">
                            {event.origin && <div>Origin: {event.origin}</div>}
                            {event.details?.reason && <div>Reason: {event.details.reason}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Audit Logs (Last 100 Events)
              </CardTitle>
              <CardDescription>
                Track chat starts, message storage, router decisions, and task links
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <span className="font-medium">
                            {log.action.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.actor === 'system' ? 'secondary' : 'outline'} className="text-xs">
                          {log.actor}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.target}
                      </TableCell>
                       <TableCell>
                         <div className="text-xs text-muted-foreground max-w-xs">
                           {(log.meta as any)?.agent_id && <div>Agent: {(log.meta as any).agent_id.slice(0, 8)}</div>}
                           {(log.meta as any)?.intent && <div>Intent: {(log.meta as any).intent}</div>}
                           {(log.meta as any)?.source && <div>Source: {(log.meta as any).source}</div>}
                         </div>
                       </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Widget Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Widget Metrics (Last 7 Days)
              </CardTitle>
              <CardDescription>
                Daily metrics for ticket issuance, bootstrap success/failure rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Metric Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Metadata</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {widgetMetrics.map((metric) => (
                    <TableRow key={metric.id}>
                      <TableCell className="font-mono text-sm">
                        {metric.date_bucket}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {metric.metric_type.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold">
                        {metric.metric_value}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {metric.tenant_id.slice(0, 8)}...
                      </TableCell>
                       <TableCell>
                         <div className="text-xs text-muted-foreground">
                           {(metric.metadata as any)?.agent_id && (
                             <div>Agent: {(metric.metadata as any).agent_id.slice(0, 8)}</div>
                           )}
                           {(metric.metadata as any)?.reason && (
                             <div>Reason: {(metric.metadata as any).reason}</div>
                           )}
                         </div>
                       </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Bootstrap Success Trends</CardTitle>
                <CardDescription>Success vs failure rates over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(
                    widgetMetrics.reduce((acc: Record<string, any>, metric) => {
                      const date = metric.date_bucket;
                      if (!acc[date]) acc[date] = { success: 0, failure: 0 };
                      if (metric.metric_type === 'bootstrap_success') acc[date].success += metric.metric_value;
                      if (metric.metric_type === 'bootstrap_failure') acc[date].failure += metric.metric_value;
                      return acc;
                    }, {})
                  ).map(([date, data]) => (
                    <div key={date} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="font-mono text-sm">{date}</div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{data.success}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="text-sm">{data.failure}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {((data.success / (data.success + data.failure)) * 100 || 0).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Event Breakdown</CardTitle>
                <CardDescription>Types and frequency of security events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {securityEvents.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <Shield className="h-6 w-6 mx-auto mb-2" />
                      <p>No security events recorded</p>
                    </div>
                  ) : (
                    Object.entries(
                      securityEvents.reduce((acc: Record<string, number>, event) => {
                        acc[event.event_type] = (acc[event.event_type] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([eventType, count]) => (
                      <div key={eventType} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          {getEventIcon(eventType)}
                          <span className="text-sm font-medium">
                            {eventType.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}