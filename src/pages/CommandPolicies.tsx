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
import { useToast } from '@/components/ui/use-toast';
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
        .from('command_confirmations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
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

  const highRiskCommands = useQuery({
    queryKey: ['highRiskCommands'],
    queryFn: async () => {
      const { data } = await supabase.from('view_high_risk_commands').select('count').single();
      return data?.count || 0;
    }
  });

  const successRate = useQuery({
    queryKey: ['successRate'],
    queryFn: async () => {
      const { data } = await supabase.from('view_success_rate_30d').select('percentage').single();
      return data?.percentage || 0;
    }
  });

  return { activeCommands, totalScripts, highRiskCommands, successRate };
};

export default function CommandPolicies() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<CommandPolicy | null>(null);
  const [policies, setPolicies] = useState<CommandPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeCommands, totalScripts, highRiskCommands, successRate } = useKPIData();

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
      case 'auto': return 'bg-green-400/30 text-white border-green-400/50';
      case 'confirm': return 'bg-yellow-400/30 text-white border-yellow-400/50';
      case 'forbid': return 'bg-red-400/30 text-white border-red-400/50';
      default: return 'bg-gray-400/30 text-white border-gray-400/50';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-blue-400/30 text-white border-blue-400/50';
      case 'medium': return 'bg-yellow-400/30 text-white border-yellow-400/50';
      case 'high': return 'bg-orange-400/30 text-white border-orange-400/50';
      case 'critical': return 'bg-red-400/30 text-white border-red-400/50';
      default: return 'bg-gray-400/30 text-white border-gray-400/50';
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
      queryClient.invalidateQueries({ queryKey: ['highRiskCommands'] });
      
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
          <Card className="bg-gradient-card border-card-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Commands
              </CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {activeCommands.isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-foreground">{activeCommands.data}</div>
              )}
              <p className="text-xs text-muted-foreground">
                Currently enabled
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-card-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Scripts
              </CardTitle>
              <Bot className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              {totalScripts.isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-foreground">{totalScripts.data}</div>
              )}
              <p className="text-xs text-muted-foreground">
                Available scripts
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-card-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                High Risk
              </CardTitle>
              <Shield className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              {highRiskCommands.isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-foreground">{highRiskCommands.data}</div>
              )}
              <p className="text-xs text-muted-foreground">
                High risk commands
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-card-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                Success Rate
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground/60" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Last 30 days</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <CheckSquare className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              {successRate.isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-foreground">{successRate.data}%</div>
              )}
              <p className="text-xs text-muted-foreground">
                Task success rate
              </p>
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
              searchKey="policy_name"
              searchPlaceholder="Search auto policies..."
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
              searchKey="policy_name"
              searchPlaceholder="Search confirm policies..."
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
              searchKey="policy_name"
              searchPlaceholder="Search forbid policies..."
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