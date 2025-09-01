import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { User, Mail, Calendar, Bot, Activity, Globe } from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

interface UserProfileDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserProfileDialog({ user, open, onOpenChange }: UserProfileDialogProps) {
  const { data: userAgents, isLoading: agentsLoading } = useQuery({
    queryKey: ['user-agents', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: open,
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
      // Positive statuses - use Active design from Agents table
      online: { 
        variant: 'default' as const,
        className: 'bg-success/10 text-success border-success/20 hover:bg-success/20',
        dot: 'bg-success',
        label: 'Online'
      },
      active: { 
        variant: 'default' as const,
        className: 'bg-success/10 text-success border-success/20 hover:bg-success/20',
        dot: 'bg-success',
        label: 'Active'
      },
      // Warning statuses
      deploying: { 
        variant: 'secondary' as const,
        className: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20',
        dot: 'bg-warning',
        label: 'Deploying'
      },
      // Negative statuses
      offline: { 
        variant: 'destructive' as const,
        className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20',
        dot: 'bg-destructive',
        label: 'Offline'
      },
      error: { 
        variant: 'destructive' as const,
        className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20',
        dot: 'bg-destructive',
        label: 'Error'
      },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.offline;
    
    return (
      <Badge variant={config.variant} className={`${config.className} gap-1.5 font-medium`}>
        <div className={`w-2 h-2 rounded-full ${config.dot}`} />
        <span>{config.label}</span>
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Profile
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* User Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">User Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                  <p className="text-sm">{user.full_name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <p className="text-sm">{user.email}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Member Since</label>
                  <div className="flex items-center gap-2">
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
                      <TableHead>Agent</TableHead>
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
                          <div>
                            <div className="font-medium">{agent.hostname || 'Unknown'}</div>
                            <div className="text-sm text-muted-foreground">{agent.id}</div>
                          </div>
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
      </DialogContent>
    </Dialog>
  );
}