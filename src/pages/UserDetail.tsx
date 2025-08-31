import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, User, Mail, Calendar, Bot, Activity, Globe } from 'lucide-react';

export default function UserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: userAgents, isLoading: agentsLoading } = useQuery({
    queryKey: ['user-agents', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
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
    if (status === 'offline' || status === 'terminated') {
      return (
        <Badge className="bg-red-500/10 text-red-300 border-red-500/20 hover:bg-red-500/20 transition-colors">
          Offline
        </Badge>
      );
    }
    
    if (status === 'active' || status === 'online') {
      return (
        <Badge className="bg-green-500/10 text-green-300 border-green-500/20 hover:bg-green-500/20 transition-colors">
          Active
        </Badge>
      );
    }
    
    const statusConfig = {
      error: { variant: 'destructive', label: 'Error' },
      suspended: { variant: 'secondary', label: 'Suspended' },
      deploying: { variant: 'outline', label: 'Deploying' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { variant: 'secondary', label: status };
    
    return (
      <Badge variant={config.variant as any}>
        {config.label}
      </Badge>
    );
  };

  if (userLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested user could not be found.</p>
          <Button onClick={() => navigate('/users')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/users')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Details</h1>
          <p className="text-muted-foreground">
            Detailed information about {user.full_name || user.email}
          </p>
        </div>
      </div>

      {/* User Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground">User ID</label>
              <code className="block text-sm bg-muted px-2 py-1 rounded font-mono mt-1">
                {user.id}
              </code>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="h-4 w-4" />
                <p className="text-sm">{user.email}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Full Name</label>
              <p className="text-sm mt-1">{user.full_name || 'Not provided'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Member Since</label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4" />
                <p className="text-sm">{formatDate(user.created_at)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User's Agents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Agents ({userAgents?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {agentsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : userAgents && userAgents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent ID</TableHead>
                  <TableHead>Hostname</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>OS</TableHead>
                  <TableHead>Last Seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userAgents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <button 
                        onClick={() => navigate(`/agents/${agent.id}`)}
                        className="hover:bg-muted/50 rounded transition-colors cursor-pointer"
                      >
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-primary hover:text-primary/80">
                          {agent.id.slice(0, 8)}...
                        </code>
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{agent.hostname || 'Unknown'}</div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(agent.status)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {agent.plan_key || 'No Plan'}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {agent.os || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Activity className="h-3 w-3" />
                        {agent.last_seen ? formatDate(agent.last_seen) : 'Never'}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>This user has no agents yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}