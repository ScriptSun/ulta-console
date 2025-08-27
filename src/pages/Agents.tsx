import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AgentCard } from '@/components/agents/AgentCard';
import { AgentDetailsDrawer } from '@/components/agents/AgentDetailsDrawer';
import { DeployAgentModal } from '@/components/agents/DeployAgentModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  customer_id: string;
}

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [userRole, setUserRole] = useState<'viewer' | 'editor' | 'approver' | 'admin'>('viewer');
  const { toast } = useToast();

  useEffect(() => {
    fetchAgents();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('agents-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agents'
        },
        () => {
          fetchAgents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterAgents();
  }, [agents, searchQuery, statusFilter, typeFilter]);

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAgents((data || []) as Agent[]);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load agents',
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
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.agent_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.region?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(agent => agent.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(agent => agent.agent_type === typeFilter);
    }

    setFilteredAgents(filtered);
  };

  const handleAgentAction = async (agentId: string, action: 'start' | 'pause') => {
    try {
      const { error } = await supabase.functions.invoke('agent-control', {
        body: { agent_id: agentId, action }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Agent ${action === 'start' ? 'started' : 'paused'} successfully`,
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
    // This could open a separate logs modal/drawer
    toast({
      title: 'Logs',
      description: `Opening logs for ${agent.name}`,
    });
  };

  const handleAgentDetails = (agent: Agent) => {
    setSelectedAgent(agent);
    setDetailsOpen(true);
  };

  const handleUpdateAgent = async (agent: Agent) => {
    // This could trigger an update through the API
    toast({
      title: 'Update Triggered',
      description: `Update initiated for ${agent.name}`,
    });
  };

  const handleDeleteAgent = async (agent: Agent) => {
    if (!confirm(`Are you sure you want to delete "${agent.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', agent.id);

      if (error) throw error;

      toast({
        title: 'Agent Deleted',
        description: `${agent.name} has been deleted successfully`,
      });

      fetchAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete agent',
        variant: 'destructive',
      });
    }
  };

  const statusCounts = {
    running: agents.filter(a => a.status === 'running').length,
    idle: agents.filter(a => a.status === 'idle').length,
    error: agents.filter(a => a.status === 'error').length,
    offline: agents.filter(a => a.status === 'offline').length,
  };

  const canManage = userRole === 'approver' || userRole === 'admin';

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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-muted-foreground">Running</span>
            </div>
            <p className="text-2xl font-bold">{statusCounts.running}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-sm text-muted-foreground">Idle</span>
            </div>
            <p className="text-2xl font-bold">{statusCounts.idle}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-sm text-muted-foreground">Error</span>
            </div>
            <p className="text-2xl font-bold">{statusCounts.error}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-500" />
              <span className="text-sm text-muted-foreground">Offline</span>
            </div>
            <p className="text-2xl font-bold">{statusCounts.offline}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="idle">Idle</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="data_processor">Data Processor</SelectItem>
            <SelectItem value="monitor">Monitor</SelectItem>
            <SelectItem value="backup">Backup</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Agents Grid */}
      {filteredAgents.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onStart={(agent) => handleAgentAction(agent.id, 'start')}
              onPause={(agent) => handleAgentAction(agent.id, 'pause')}
              onLogs={handleViewLogs}
              onDetails={handleAgentDetails}
              onUpdate={handleUpdateAgent}
              onDelete={handleDeleteAgent}
              canManage={canManage}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
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
        onClose={() => setDetailsOpen(false)}
        canManage={canManage}
      />

      <DeployAgentModal
        isOpen={deployModalOpen}
        onClose={() => setDeployModalOpen(false)}
      />
    </div>
  );
}