import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, User, Mail, Calendar, Bot, Activity } from 'lucide-react';

export default function UserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const { data: user, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      console.log('Fetching user data for ID:', userId);
      
      // Create a demo user for now since we don't have real user data
      return {
        id: userId || '1',
        email: 'demo@example.com',
        full_name: 'Demo User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    },
    enabled: !!userId,
  });

  const { data: userAgents, isLoading: agentsLoading } = useQuery({
    queryKey: ['user-agents', userId],
    queryFn: async () => {
      console.log('Fetching agents for user ID:', userId);
      
      // Return mock data for demo
      return [
        {
          id: '1',
          hostname: 'demo-server-01',
          status: 'active',
          plan_key: 'premium',
          os: 'ubuntu',
          last_seen: new Date().toISOString(),
          created_at: new Date().toISOString()
        },
        {
          id: '2', 
          hostname: 'demo-server-02',
          status: 'offline',
          plan_key: 'standard',
          os: 'centos',
          last_seen: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString()
        }
      ];
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
        <Badge variant="secondary" className="bg-red-500/10 text-red-400 border-red-500/20">
          Offline
        </Badge>
      );
    }
    
    if (status === 'active' || status === 'online') {
      return (
        <Badge variant="default" className="bg-green-500/10 text-green-400 border-green-500/20">
          Active
        </Badge>
      );
    }
    
    return (
      <Badge variant="secondary">
        {status}
      </Badge>
    );
  };

  if (userLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading user details...</span>
        </div>
      </div>
    );
  }

  if (userError) {
    console.error('User loading error:', userError);
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold mb-2 text-destructive">Error Loading User</h2>
          <p className="text-muted-foreground mb-4">
            Failed to load user details. This is a demo - showing sample data instead.
          </p>
          <Button onClick={() => navigate('/users')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
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
                <span>{user.email}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Full Name</label>
              <div className="flex items-center gap-2 mt-1">
                <User className="h-4 w-4" />
                <span>{user.full_name || 'Not provided'}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Member Since</label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(user.created_at)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Agents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            User Agents ({userAgents?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {agentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="ml-2">Loading agents...</span>
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