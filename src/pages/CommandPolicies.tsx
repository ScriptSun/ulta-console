import React, { useState, useEffect } from 'react';
import { Plus, Eye, Edit, Power, History, Info, Activity, Bot, CheckSquare, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PolicyDrawer } from '@/components/policies/PolicyDrawer';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface CommandPolicy {
  id: string;
  policy_name: string;
  mode: 'auto' | 'confirm' | 'forbid';
  match_type: 'exact' | 'regex' | 'wildcard';
  match_value: string;
  os_whitelist: string[] | null;
  risk: 'low' | 'medium' | 'high' | 'critical';
  timeout_sec: number | null;
  param_schema: any;
  confirm_message: string | null;
  active: boolean;
  updated_at: string;
}

const mockPolicies: CommandPolicy[] = [];

// KPI hooks
const useKPIData = () => {
  const activeCommands = useQuery({
    queryKey: ['activeCommands'],
    queryFn: async () => {
      const { count } = await supabase
        .from('command_policies')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    }
  });

  const confirmCommands = useQuery({
    queryKey: ['confirmCommands'],
    queryFn: async () => {
      const { count } = await supabase
        .from('command_policies')
        .select('*', { count: 'exact', head: true })
        .eq('mode', 'confirm');
      return count || 0;
    }
  });

  const totalScripts = useQuery({
    queryKey: ['totalScripts'],
    queryFn: async () => {
      const { data } = await supabase.from('view_total_scripts').select('count').single();
      return data?.count || 0;
    }
  });

  const forbidCommands = useQuery({
    queryKey: ['forbidCommands'],
    queryFn: async () => {
      const { count } = await supabase
        .from('command_policies')
        .select('*', { count: 'exact', head: true })
        .eq('mode', 'forbid');
      return count || 0;
    }
  });

  const successRate = useQuery({
    queryKey: ['successRate'],
    queryFn: async () => {
      // Get successful auto/confirm executions (approved status)
      const { count: successCount } = await supabase
        .from('command_confirmations')
        .select('*', { count: 'exact', head: true })
        .in('status', ['approved', 'executed'])
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      
      // Get blocked forbid commands (rejected status)
      const { count: blockCount } = await supabase
        .from('command_confirmations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      
      const totalExecutions = (successCount || 0) + (blockCount || 0);
      
      if (totalExecutions === 0) return 0;
      
      return Math.round((successCount || 0) / totalExecutions * 100);
    }
  });

  return { activeCommands, confirmCommands, totalScripts, forbidCommands, successRate };
};

export default function CommandPolicies() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<CommandPolicy | null>(null);
  const [policies, setPolicies] = useState<CommandPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeCommands, confirmCommands, totalScripts, forbidCommands, successRate } = useKPIData();

  // Fetch policies from Supabase
  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('command_policies')
        .select('*')
        .order('policy_name');

      if (error) {
        console.error('Error fetching policies:', error);
        toast({
          title: "Error",
          description: "Failed to load command policies",
          variant: "destructive",
        });
        return;
      }

      setPolicies(data?.map(policy => ({
        ...policy,
        mode: policy.mode as 'auto' | 'confirm' | 'forbid',
        match_type: policy.match_type as 'exact' | 'regex' | 'wildcard',
        risk: policy.risk as 'low' | 'medium' | 'high' | 'critical'
      })) || []);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load command policies",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'auto': return 'bg-success/20 text-success border-success/30';
      case 'confirm': return 'bg-warning/20 text-warning border-warning/30';
      case 'forbid': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted/50 text-muted-foreground border-muted';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'medium': return 'bg-warning/20 text-warning border-warning/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'critical': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted/50 text-muted-foreground border-muted';
    }
  };

  const columns: ColumnDef<CommandPolicy>[] = [
    {
      accessorKey: 'policy_name',
      header: 'Policy Name',
    },
    {
      accessorKey: 'match_type',
      header: 'Match Type',
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.getValue('match_type')}
        </Badge>
      ),
    },
    {
      accessorKey: 'match_value',
      header: 'Match Value',
      cell: ({ row }) => (
        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
          {row.getValue('match_value')}
        </code>
      ),
    },
    {
      accessorKey: 'os_whitelist',
      header: 'OS Whitelist',
      cell: ({ row }) => {
        const osList = row.getValue('os_whitelist') as string[] | null;
        return osList ? (
          <div className="flex gap-1 flex-wrap">
            {osList.map((os) => (
              <Badge key={os} variant="secondary" className="text-xs">
                {os}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">All</span>
        );
      },
    },
    {
      accessorKey: 'risk',
      header: 'Risk',
      cell: ({ row }) => (
        <Badge className={getRiskColor(row.getValue('risk'))}>
          {String(row.getValue('risk')).charAt(0).toUpperCase() + String(row.getValue('risk')).slice(1)}
        </Badge>
      ),
    },
    {
      accessorKey: 'timeout_sec',
      header: 'Timeout',
      cell: ({ row }) => {
        const timeout = row.getValue('timeout_sec') as number | null;
        return timeout ? `${timeout}s` : '-';
      },
    },
    {
      accessorKey: 'param_schema',
      header: 'Param Schema',
      cell: ({ row }) => {
        const schema = row.getValue('param_schema');
        return schema ? (
          <Badge variant="outline" className="text-xs">
            Schema
          </Badge>
        ) : (
          '-'
        );
      },
    },
    {
      accessorKey: 'confirm_message',
      header: 'Message',
      cell: ({ row }) => {
        const message = row.getValue('confirm_message') as string | null;
        return message ? (
          <span className="text-sm truncate max-w-[150px] block">
            {message}
          </span>
        ) : (
          '-'
        );
      },
    },
    {
      accessorKey: 'updated_at',
      header: 'Updated',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.getValue('updated_at')), 'MMM d, yyyy')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleView(row.original)}>
              <Eye className="mr-2 h-4 w-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(row.original)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleToggleActive(row.original)}>
              <Power className="mr-2 h-4 w-4" />
              {row.original.active ? 'Disable' : 'Enable'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleHistory(row.original)}>
              <History className="mr-2 h-4 w-4" />
              History
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const handleView = (policy: CommandPolicy) => {
    console.log('View policy:', policy);
  };

  const handleEdit = (policy: CommandPolicy) => {
    setEditingPolicy(policy);
    setIsDrawerOpen(true);
  };

  const handleToggleActive = async (policy: CommandPolicy) => {
    try {
      const { error } = await supabase
        .from('command_policies')
        .update({ 
          active: !policy.active,
          updated_at: new Date().toISOString()
        })
        .eq('id', policy.id);

      if (error) {
        console.error('Error toggling policy:', error);
        toast({
          title: "Error",
          description: "Failed to update policy status",
          variant: "destructive",
        });
        return;
      }

      await fetchPolicies();
      
      // Invalidate KPI queries to update the cards
      queryClient.invalidateQueries({ queryKey: ['activeCommands'] });
      queryClient.invalidateQueries({ queryKey: ['confirmCommands'] });
      queryClient.invalidateQueries({ queryKey: ['forbidCommands'] });
      
      toast({
        title: "Success",
        description: `Policy ${policy.active ? 'disabled' : 'enabled'} successfully`,
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to update policy status",
        variant: "destructive",
      });
    }
  };

  const handleHistory = (policy: CommandPolicy) => {
    console.log('View history for policy:', policy);
  };

  const handleAddNew = () => {
    setEditingPolicy(null);
    setIsDrawerOpen(true);
  };

  const getFilteredPolicies = (mode: string) => {
    return policies.filter(policy => policy.mode === mode);
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Command Policies</h1>
            <p className="text-muted-foreground">
              Manage automated command execution policies
            </p>
          </div>
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Policy
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-primary border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary-foreground/80">Total Commands</p>
                  {activeCommands.isLoading ? (
                    <Skeleton className="h-8 w-16 bg-primary-foreground/20" />
                  ) : (
                    <p className="text-3xl font-bold text-primary-foreground">{activeCommands.data}</p>
                  )}
                </div>
                <Activity className="h-8 w-8 text-primary-foreground/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-secondary border-secondary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-foreground/80">Confirm Required</p>
                  {confirmCommands.isLoading ? (
                    <Skeleton className="h-8 w-16 bg-secondary-foreground/20" />
                  ) : (
                    <p className="text-3xl font-bold text-secondary-foreground">{confirmCommands.data}</p>
                  )}
                </div>
                <CheckSquare className="h-8 w-8 text-secondary-foreground/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-accent border-accent/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-accent-foreground/80">Forbid Policies</p>
                  {forbidCommands.isLoading ? (
                    <Skeleton className="h-8 w-16 bg-accent-foreground/20" />
                  ) : (
                    <p className="text-3xl font-bold text-accent-foreground">{forbidCommands.data}</p>
                  )}
                </div>
                <Shield className="h-8 w-8 text-accent-foreground/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-muted border-muted/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground/80">Success Rate</p>
                  {successRate.isLoading ? (
                    <Skeleton className="h-8 w-16 bg-foreground/20" />
                  ) : (
                    <p className="text-3xl font-bold text-foreground">{successRate.data}%</p>
                  )}
                </div>
                <Bot className="h-8 w-8 text-muted-foreground/60" />
              </div>
            </CardContent>
          </Card>
        </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Command policies control automatic execution behavior. Batches are still managed in the Batches tab.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="auto" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="auto" className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            Auto
          </TabsTrigger>
          <TabsTrigger value="confirm" className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            Confirm
          </TabsTrigger>
          <TabsTrigger value="forbid" className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            Forbid
          </TabsTrigger>
        </TabsList>

        <TabsContent value="auto" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading policies...</div>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={getFilteredPolicies('auto')}
              searchKeys={['policy_name', 'match_value']}
              searchPlaceholder="Search policies or commands..."
              defaultHiddenColumns={['match_type', 'os_whitelist', 'param_schema']}
            />
          )}
        </TabsContent>

        <TabsContent value="confirm" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading policies...</div>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={getFilteredPolicies('confirm')}
              searchKeys={['policy_name', 'match_value']}
              searchPlaceholder="Search policies or commands..."
              defaultHiddenColumns={['match_type', 'os_whitelist', 'param_schema']}
            />
          )}
        </TabsContent>

        <TabsContent value="forbid" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading policies...</div>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={getFilteredPolicies('forbid')}
              searchKeys={['policy_name', 'match_value']}
              searchPlaceholder="Search policies or commands..."
              defaultHiddenColumns={['match_type', 'os_whitelist', 'param_schema']}
            />
          )}
        </TabsContent>
      </Tabs>

      <PolicyDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        policy={editingPolicy}
        onSave={fetchPolicies}
      />
      </div>
    </TooltipProvider>
  );
}