import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Mail, Calendar, Eye, Edit, Trash2, Filter, CalendarDays } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
  agent_count?: number;
}

export default function Users() {
  const navigate = useNavigate();
  const [searchEmail, setSearchEmail] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [agentCountFilter, setAgentCountFilter] = useState('all');
  const { toast } = useToast();

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['users', searchEmail, dateFilter, agentCountFilter],
    queryFn: async () => {
      let query = supabase
        .from('users')
        .select(`
          *,
          agents!agents_user_id_fkey(count)
        `);
      
      if (searchEmail) {
        query = query.ilike('email', `%${searchEmail}%`);
      }
      
      // Apply date filter
      if (dateFilter !== 'all') {
        const now = new Date();
        let filterDate = new Date();
        
        switch (dateFilter) {
          case 'today':
            filterDate.setHours(0, 0, 0, 0);
            query = query.gte('created_at', filterDate.toISOString());
            break;
          case 'week':
            filterDate.setDate(now.getDate() - 7);
            query = query.gte('created_at', filterDate.toISOString());
            break;
          case 'month':
            filterDate.setMonth(now.getMonth() - 1);
            query = query.gte('created_at', filterDate.toISOString());
            break;
          case 'thismonth':
            // Start of current month
            filterDate = new Date(now.getFullYear(), now.getMonth(), 1);
            query = query.gte('created_at', filterDate.toISOString());
            break;
          case 'year':
            filterDate.setFullYear(now.getFullYear() - 1);
            query = query.gte('created_at', filterDate.toISOString());
            break;
          case 'thisyear':
            // Start of current year
            filterDate = new Date(now.getFullYear(), 0, 1);
            query = query.gte('created_at', filterDate.toISOString());
            break;
        }
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform the data to include agent count and apply agent count filter
      let transformedData = data?.map(user => ({
        ...user,
        agent_count: user.agents?.[0]?.count || 0
      })) || [];
      
      // Apply agent count filter
      if (agentCountFilter !== 'all') {
        transformedData = transformedData.filter(user => {
          switch (agentCountFilter) {
            case 'none':
              return user.agent_count === 0;
            case 'low':
              return user.agent_count >= 1 && user.agent_count <= 5;
            case 'medium':
              return user.agent_count >= 6 && user.agent_count <= 20;
            case 'high':
              return user.agent_count > 20;
            default:
              return true;
          }
        });
      }
      
      return transformedData;
    },
  });

  const handleViewProfile = (user: User) => {
    navigate(`/users/${user.id}`);
  };

  const handleEditUser = (user: User) => {
    // TODO: Implement edit functionality
    toast({
      title: 'Edit User',
      description: 'Edit functionality will be implemented',
    });
  };

  const handleDeleteUser = async (user: User) => {
    if (window.confirm(`Are you sure you want to delete user ${user.email}?`)) {
      try {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', user.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'User deleted successfully',
        });
        
        refetch();
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to delete user',
          variant: 'destructive',
        });
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage users and their access to agents and features
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="date-filter" className="text-sm font-medium">Date:</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[130px]" id="date-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Past Week</SelectItem>
                  <SelectItem value="month">Past Month</SelectItem>
                  <SelectItem value="thismonth">This Month</SelectItem>
                  <SelectItem value="year">Past Year</SelectItem>
                  <SelectItem value="thisyear">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="agent-filter" className="text-sm font-medium">Agents:</Label>
              <Select value={agentCountFilter} onValueChange={setAgentCountFilter}>
                <SelectTrigger className="w-[130px]" id="agent-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="none">No Agents</SelectItem>
                  <SelectItem value="low">1-5 Agents</SelectItem>
                  <SelectItem value="medium">6-20 Agents</SelectItem>
                  <SelectItem value="high">20+ Agents</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Agents</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <code 
                        className="text-xs bg-primary/10 text-primary-foreground px-2 py-1 rounded font-mono cursor-pointer hover:bg-primary/20 transition-colors"
                        onClick={() => handleViewProfile(user)}
                        title="Click to view user profile"
                      >
                        {user.id.slice(0, 8)}...
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{user.full_name || 'Unnamed User'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">
                        {user.agent_count} agent{user.agent_count !== 1 ? 's' : ''}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(user.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewProfile(user)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {users?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchEmail ? 'No users found matching your search.' : 'No users found. Create your first user to get started.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}