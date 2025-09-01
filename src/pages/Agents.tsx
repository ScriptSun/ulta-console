import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Filter, Search, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AgentDetailsDrawer } from '@/components/agents/AgentDetailsDrawer';
import { AgentsTable } from '@/components/agents/AgentsTable';
import { DeployAgentModal } from '@/components/agents/DeployAgentModal';
import { AssignUserToAgentDialog } from '@/components/agents/AssignUserToAgentDialog';

import { supabaseEnhanced, queryWithRetry, testSupabaseConnection } from '@/lib/supabaseClient';
import { SupabaseConnectionTest } from '@/components/debug/SupabaseConnectionTest';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Agent {
  id: string;
  hostname?: string;
  agent_type: string;
  status: 'active' | 'suspended' | 'terminated';
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
  user_id?: string;
  plan_key?: string;
  users?: {
    email: string;
    full_name: string | null;
  };
}

export default function Agents() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [osFilter, setOsFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [assignUserDialogOpen, setAssignUserDialogOpen] = useState(false);
  const [agentToAssign, setAgentToAssign] = useState<Agent | null>(null);
  const [userRole, setUserRole] = useState<'viewer' | 'editor' | 'approver' | 'admin'>('admin');
  const [defaultTab, setDefaultTab] = useState<string>('overview');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const loadAgents = async () => {
      console.log('Loading agents...');
      await fetchAgents();
      console.log('Agents loaded successfully');
    };
    
    loadAgents();
    
    // Note: Realtime disabled temporarily to avoid WebSocket connection issues
    // Data will refresh when user performs actions or refreshes the page
    
    return () => {
      // Cleanup will be handled by component unmount
    };
  }, []);

  useEffect(() => {
    filterAgents();
  }, [agents, searchQuery, statusFilter, osFilter, regionFilter]);

  const fetchAgents = async () => {
    console.log('Starting agent fetch - user authenticated:', !!user);
    setLoading(true);
    setConnectionError(null);
    
    // First test the connection with a simple query
    const connectionTest = await testSupabaseConnection();
    if (!connectionTest.success) {
      setConnectionError(connectionTest.error || 'Connection test failed');
      setLoading(false);
      toast({
        title: 'Connection Failed',
        description: connectionTest.error,
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Simple query with retry logic built-in
      const { data, error } = await supabase
        .from('agents')
        .select(`
          *, 
          heartbeat, 
          last_heartbeat
        `)
        .order('created_at', { ascending: false });

      console.log('Agents query completed:', { 
        success: !error, 
        dataCount: data?.length, 
        error: error?.message 
      });

      if (error) {
        console.error('Supabase agents query error:', error);
        setConnectionError(`Database query failed: ${error.message}`);
        throw error;
      }

      const agentsWithStatus = (data || []).map((agent) => ({
        ...agent
      }));

      console.log('Successfully fetched agents:', agentsWithStatus.length);
      setAgents(agentsWithStatus as Agent[]);
      
    } catch (error: any) {
      console.error('Error fetching agents:', error);
      
      let errorMessage = 'Failed to load agents from database.';
      
      if (error.message?.includes('Failed to fetch') || error.message?.includes('fetch')) {
        errorMessage = 'Network connection to database failed. Check your internet connection.';
      } else if (error.message?.includes('JWT') || error.message?.includes('auth')) {
        errorMessage = 'Authentication issue. Try refreshing the page.';
      } else if (error.message) {
        errorMessage = `Database error: ${error.message}`;
      }
      
      setConnectionError(errorMessage);
      
      toast({
        title: 'Connection Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAgents = () => {
    let filtered = agents;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(agent =>
        agent.hostname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.agent_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.region?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.ip_address?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(agent => agent.status === statusFilter);
    }

    // OS filter
    if (osFilter !== 'all') {
      filtered = filtered.filter(agent => agent.os === osFilter);
    }

    // Region filter
    if (regionFilter !== 'all') {
      filtered = filtered.filter(agent => agent.region === regionFilter);
    }

    setFilteredAgents(filtered);
  };

  const handleAgentAction = async (agentId: string, action: 'start' | 'pause' | 'stop') => {
    try {
      // Log the action to audit trail
      await supabase.from('audit_logs').insert({
        customer_id: '22222222-2222-2222-2222-222222222222',
        actor: 'elin@ultahost.com', // Should be from user context
        action: `agent_${action}`,
        target: `agent:${agentId}`,
        meta: { agent_id: agentId, action }
      });

      const { error } = await supabase.functions.invoke('agent-control', {
        body: { agent_id: agentId, action }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Agent ${action}ed successfully`,
      });

      // Refresh agents
      fetchAgents();
    } catch (error) {
      console.error(`Error ${action}ing agent:`, error);
      toast({
        title: 'Error',
        description: `Failed to ${action} agent`,
        variant: 'destructive',
      });
    }
  };

  const handleViewLogs = async (agent: Agent) => {
    setSelectedAgent(agent);
    setDefaultTab('logs');
    setDetailsOpen(true);
  };

  const handleAgentDetails = (agent: Agent) => {
    setSelectedAgent(agent);
    setDefaultTab('overview');
    setDetailsOpen(true);
  };

  const handleAssignUser = (agent: Agent) => {
    setAgentToAssign(agent);
    setAssignUserDialogOpen(true);
  };

  const handleRecentTasks = (agent: Agent) => {
    navigate(`/agents/${agent.id}/tasks`);
  };

  const handleAgentClick = (agent: Agent) => {
    setSelectedAgent(agent);
    setDefaultTab('overview');
    setDetailsOpen(true);
  };

  const handleUpdateAgent = async (agent: Agent) => {
    // This could trigger an update through the API
    toast({
      title: 'Update Triggered',
      description: `Update initiated for ${agent.hostname || agent.id}`,
    });
  };

  const handleRemoveAgent = async (agent: Agent) => {
    if (!confirm(`Are you sure you want to remove "${agent.hostname || agent.id}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // Log the action to audit trail
      await supabase.from('audit_logs').insert({
        customer_id: '22222222-2222-2222-2222-222222222222',
        actor: 'elin@ultahost.com', // Should be from user context
        action: 'agent_remove',
        target: `agent:${agent.id}`,
        meta: { agent_id: agent.id, agent_hostname: agent.hostname }
      });

      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', agent.id);

      if (error) throw error;

      toast({
        title: 'Agent Removed',
        description: `${agent.hostname || agent.id} has been removed successfully`,
      });

      fetchAgents();
    } catch (error) {
      console.error('Error removing agent:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove agent',
        variant: 'destructive',
      });
    }
  };

  const statusCounts = {
    active: agents.filter(a => a.status === 'active').length,
    suspended: agents.filter(a => a.status === 'suspended').length,
    terminated: agents.filter(a => a.status === 'terminated').length,
  };

  const canManage = userRole === 'approver' || userRole === 'admin';

  // Get unique values for filters
  const uniqueOSValues = [...new Set(agents.map(agent => agent.os).filter(Boolean))];
  const uniqueRegionValues = [...new Set(agents.map(agent => agent.region).filter(Boolean))];

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agents</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage your AI agents
          </p>
        </div>
        <Button onClick={() => setDeployModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Deploy New Agent
        </Button>
      </div>

      {/* Connection Error Alert */}
      {connectionError && (
        <Alert className="mb-6 border-destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Database Connection Issue</AlertTitle>
          <AlertDescription className="mt-2">
            <div>{connectionError}</div>
            <div className="mt-3 space-x-2">
              <Button size="sm" variant="outline" onClick={fetchAgents}>
                Retry Connection
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Debug Panel - Show when there are connection issues */}
      {connectionError && (
        <div className="mb-6">
          <SupabaseConnectionTest />
        </div>
      )}

      {/* Connection Status - Show when no agents and not loading */}
      {agents.length === 0 && !loading && (
        <Card className="border-warning">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <div>
                  <p className="font-medium">No Agents Found</p>
                  <p className="text-sm text-muted-foreground">Try refreshing or check your permissions</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchAgents}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-muted-foreground">Active</span>
            </div>
            <p className="text-2xl font-bold">{statusCounts.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-sm text-muted-foreground">Suspended</span>
            </div>
            <p className="text-2xl font-bold">{statusCounts.suspended}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-sm text-muted-foreground">Terminated</span>
            </div>
            <p className="text-2xl font-bold">{statusCounts.terminated}</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar with Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by hostname, agent type, region, or IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
            </SelectContent>
          </Select>

          <Select value={osFilter} onValueChange={setOsFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All OS" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All OS</SelectItem>
              {uniqueOSValues.map((os) => (
                <SelectItem key={os} value={os} className="capitalize">
                  {os}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Regions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {uniqueRegionValues.map((region) => (
                <SelectItem key={region} value={region} className="capitalize">
                  {region}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Agents Table */}
      {filteredAgents.length > 0 ? (
        <AgentsTable
          agents={filteredAgents}
          onAgentClick={handleAgentClick}
          onStart={(agent) => handleAgentAction(agent.id, 'start')}
          onPause={(agent) => handleAgentAction(agent.id, 'pause')}
          onStop={(agent) => handleAgentAction(agent.id, 'stop')}
          onRemove={handleRemoveAgent}
          onLogs={handleViewLogs}
          onDetails={handleAgentDetails}
          onRecentTasks={handleRecentTasks}
          canManage={canManage}
        />
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {agents.length === 0 ? 'No agents deployed yet' : 'No agents match your filters'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {agents.length === 0 
                  ? 'Deploy your first agent to get started with UltaAI Control'
                  : 'Try adjusting your search criteria or filters'
                }
              </p>
              {agents.length === 0 && (
                <Button onClick={() => setDeployModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Deploy New Agent
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <AgentDetailsDrawer
        agent={selectedAgent}
        isOpen={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setDefaultTab('overview');
        }}
        canManage={canManage}
        defaultTab={defaultTab}
      />

      <DeployAgentModal
        isOpen={deployModalOpen}
        onClose={() => setDeployModalOpen(false)}
      />

      <AssignUserToAgentDialog
        agent={agentToAssign}
        open={assignUserDialogOpen}
        onOpenChange={setAssignUserDialogOpen}
        onSuccess={() => {
          fetchAgents();
          toast({
            title: 'Success',
            description: 'User assigned to agent successfully',
          });
        }}
      />
    </div>
  );
}
