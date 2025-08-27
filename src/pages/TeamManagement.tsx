import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, UserPlus, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CreateTeamDialog } from '@/components/teams/CreateTeamDialog';
import { AddMemberDialog } from '@/components/teams/AddMemberDialog';
import { ManageRolesDialog } from '@/components/teams/ManageRolesDialog';

const ROLE_COLORS = {
  owner: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  approver: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  editor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  viewer: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  guest: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

const ROLE_DESCRIPTIONS = {
  owner: 'Full access to all resources and can manage everything',
  admin: 'Can manage users, teams, and most resources',
  approver: 'Can approve and activate changes made by editors',
  editor: 'Can create and modify content but cannot activate changes',
  viewer: 'Can view all resources but cannot make changes',
  guest: 'Limited read-only access to basic resources',
};

export default function TeamManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showManageRoles, setShowManageRoles] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Fetch teams
  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch team members with profiles
  const { data: teamMembers, isLoading: membersLoading } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          profiles!inner(username, full_name),
          teams!inner(name)
        `)
        .order('joined_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const handleTeamAction = (action: string, team: any) => {
    setSelectedTeam(team);
    switch (action) {
      case 'addMember':
        setShowAddMember(true);
        break;
      case 'manageRoles':
        setShowManageRoles(true);
        break;
    }
  };

  if (teamsLoading || membersLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground">
            Manage teams and assign roles with our 6-tier permission system
          </p>
        </div>
        <Button onClick={() => setShowCreateTeam(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Team
        </Button>
      </div>

      {/* Role System Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Permission System Overview
          </CardTitle>
          <CardDescription>
            Six-tier role system with granular permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(ROLE_DESCRIPTIONS).map(([role, description]) => (
              <div key={role} className="flex items-start gap-3 p-3 rounded-lg border">
                <Badge className={ROLE_COLORS[role as keyof typeof ROLE_COLORS]}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Badge>
                <p className="text-sm text-muted-foreground flex-1">{description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Teams Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {teams?.map((team) => {
          const members = teamMembers?.filter(member => member.team_id === team.id) || [];
          const memberCount = members.length;
          const roleDistribution = members.reduce((acc, member) => {
            acc[member.role] = (acc[member.role] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          return (
            <Card key={team.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {team.name}
                  </span>
                  <Badge variant="secondary">{memberCount} members</Badge>
                </CardTitle>
                <CardDescription>{team.description || 'No description'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Role Distribution */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Role Distribution</h4>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(roleDistribution).map(([role, count]) => (
                      <Badge 
                        key={role} 
                        variant="outline" 
                        className={`text-xs ${ROLE_COLORS[role as keyof typeof ROLE_COLORS]}`}
                      >
                        {role}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Team Actions */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleTeamAction('addMember', team)}
                    className="gap-1"
                  >
                    <UserPlus className="h-3 w-3" />
                    Add Member
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleTeamAction('manageRoles', team)}
                    className="gap-1"
                  >
                    <Settings className="h-3 w-3" />
                    Manage Roles
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialogs */}
      <CreateTeamDialog 
        open={showCreateTeam} 
        onOpenChange={setShowCreateTeam}
      />
      
      <AddMemberDialog 
        open={showAddMember} 
        onOpenChange={setShowAddMember}
        team={selectedTeam}
      />
      
      <ManageRolesDialog 
        open={showManageRoles} 
        onOpenChange={setShowManageRoles}
        team={selectedTeam}
      />
    </div>
  );
}