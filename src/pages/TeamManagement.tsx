import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Users, UserPlus, Settings, Mail, X, Shield, Layout, Trash2, ChevronDown, ChevronUp, CheckCircle, XCircle, Bug } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CreateTeamDialog } from '@/components/teams/CreateTeamDialog';
import { AddMemberDialog } from '@/components/teams/AddMemberDialog';
import { ManageRolesDialog } from '@/components/teams/ManageRolesDialog';
import { InviteStaffDialog } from '@/components/teams/InviteStaffDialog';
import { PagePermissionsDialog } from '@/components/teams/PagePermissionsDialog';
import { WidgetScopeDialog } from '@/components/teams/WidgetScopeDialog';
import { TeamAuditTab } from '@/components/teams/TeamAuditTab';
import { RateLimitBanner } from '@/components/teams/RateLimitBanner';
import { useTeamRateLimits } from '@/hooks/useTeamRateLimits';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageGuard } from '@/components/auth/PageGuard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const ROLE_COLORS = {
  Owner: 'bg-gradient-to-r from-purple-600/10 to-violet-600/10 text-purple-100 border border-purple-500/30 shadow-lg shadow-purple-500/20 backdrop-blur-sm',
  Admin: 'bg-gradient-to-r from-red-600/10 to-pink-600/10 text-red-100 border border-red-500/30 shadow-lg shadow-red-500/20 backdrop-blur-sm',
  Developer: 'bg-gradient-to-r from-green-600/10 to-emerald-600/10 text-green-100 border border-green-500/30 shadow-lg shadow-green-500/20 backdrop-blur-sm',
  Analyst: 'bg-gradient-to-r from-blue-600/10 to-cyan-600/10 text-blue-100 border border-blue-500/30 shadow-lg shadow-blue-500/20 backdrop-blur-sm',
  ReadOnly: 'bg-gradient-to-r from-amber-600/10 to-yellow-600/10 text-amber-100 border border-amber-500/30 shadow-lg shadow-amber-500/20 backdrop-blur-sm',
};

const ROLE_DESCRIPTIONS = {
  Owner: 'Full access to all resources and can manage everything including team settings',
  Admin: 'Can manage team members and most resources within the team',
  Developer: 'Can create and modify development resources and configurations',
  Analyst: 'Can access analytics, reports and data analysis features',
  ReadOnly: 'Can view all resources but cannot make any changes',
};

export default function TeamManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for rate limit banners
  const [rateLimitBanners, setRateLimitBanners] = useState<Array<{
    id: string;
    limitType: 'invites' | 'role_changes';
    retryAfterSeconds: number;
  }>>([]);
  
  // Role update mutation with rate limiting and audit logging
  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, newRole }: { memberId: string; newRole: string }) => {
      // Check rate limit first
      const member = teamMembers?.find(m => m.id === memberId);
      const teamId = member?.team_id;
      
      if (teamId && user?.id) {
        const { data: rateCheck, error: rateError } = await supabase.rpc('check_and_increment_rate_limit', {
          _team_id: teamId,
          _user_id: user.id,
          _limit_type: 'role_changes',
          _max_count: 10
        });

        if (rateError) throw rateError;
        
        const rateLimit = rateCheck[0];
        if (!rateLimit.allowed) {
          // Log rate limit exceeded
          await supabase.rpc('log_team_audit_event', {
            _team_id: teamId,
            _actor_email: user.email,
            _action: 'rate.limit',
            _target: 'role_changes',
            _details: { 
              current_count: rateLimit.current_count,
              retry_after_seconds: rateLimit.retry_after_seconds
            }
          });

          // Show rate limit banner
          setRateLimitBanners(prev => [...prev, {
            id: Date.now().toString(),
            limitType: 'role_changes',
            retryAfterSeconds: rateLimit.retry_after_seconds
          }]);

          const error = new Error('Rate limit exceeded');
          (error as any).retryAfter = rateLimit.retry_after_seconds;
          throw error;
        }
      }

      // Update the member's role
      const { error: roleError } = await supabase
        .from('console_team_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (roleError) throw roleError;

      // Apply role template permissions for the new role
      const { error: templateError } = await supabase.rpc('apply_role_template_permissions', {
        _member_id: memberId,
        _role: newRole
      });

      if (templateError) throw templateError;

      // Log audit event
      if (member && user?.email) {
        await supabase.rpc('log_team_audit_event', {
          _team_id: member.team_id,
          _actor_email: user.email,
          _action: 'team.member.role.change',
          _target: `member:${member.admin_profiles?.email || member.admin_id}`,
          _details: { 
            old_role: member.role,
            new_role: newRole,
            member_id: memberId
          }
        });
      }
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Member role updated and permissions applied successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['console-team-members'] });
      queryClient.invalidateQueries({ queryKey: ['console-member-page-perms'] });
    },
    onError: (error: any) => {
      if (error.retryAfter) {
        toast({
          title: 'Rate limit exceeded',
          description: `Too many role changes. Please try again in ${Math.ceil(error.retryAfter / 60)} minutes.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: error.message || 'Failed to update member role',
          variant: 'destructive',
        });
      }
    },
  });

  // Remove member mutation with audit logging
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const member = teamMembers?.find(m => m.id === memberId);
      
      const { error } = await supabase
        .from('console_team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      // Log audit event
      if (member && user?.email) {
        await supabase.rpc('log_team_audit_event', {
          _team_id: member.team_id,
          _actor_email: user.email,
          _action: 'team.member.remove',
          _target: `member:${member.admin_profiles?.email || member.admin_id}`,
          _details: { 
            removed_role: member.role,
            member_id: memberId
          }
        });
      }
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Member removed from team successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['console-team-members'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove member from team',
        variant: 'destructive',
      });
    },
  });
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showManageRoles, setShowManageRoles] = useState(false);
  const [showInviteStaff, setShowInviteStaff] = useState(false);
  const [showPagePermissions, setShowPagePermissions] = useState(false);
  const [showWidgetScope, setShowWidgetScope] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);

  const dismissRateLimitBanner = (bannerId: string) => {
    setRateLimitBanners(prev => prev.filter(banner => banner.id !== bannerId));
  };

  // Fetch current user's teams
  const { data: currentUserTeams, isLoading: userTeamsLoading } = useQuery({
    queryKey: ['console-teams', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('console_team_members')
        .select(`
          team_id,
          role,
          console_teams!inner(*)
        `)
        .eq('admin_id', user.id);
      
      if (error) throw error;
      return data?.map(item => ({
        ...item.console_teams,
        userRole: item.role
      })) || [];
    },
    enabled: !!user?.id
  });

  // Fetch team members for user's teams
  const { data: teamMembers, isLoading: membersLoading } = useQuery({
    queryKey: ['console-team-members', user?.id],
    queryFn: async () => {
      if (!user?.id || !currentUserTeams?.length) return [];
      
      const teamIds = currentUserTeams.map(team => team.id);
      
      const { data, error } = await supabase
        .from('console_team_members')
        .select(`
          *,
          admin_profiles!inner(email, full_name),
          console_teams!inner(name)
        `)
        .in('team_id', teamIds)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!currentUserTeams?.length
  });

  // Fetch pending invites for user's teams
  const { data: pendingInvites, isLoading: invitesLoading } = useQuery({
    queryKey: ['console-invites', currentUserTeams?.map(t => t.id)],
    queryFn: async () => {
      if (!currentUserTeams?.length) return [];
      
      const allInvites = await Promise.all(
        currentUserTeams.map(async (team) => {
          const url = `https://lfsdqyvvboapsyeauchm.supabase.co/functions/v1/console-invites?team_id=${team.id}`;
          const { data: session } = await supabase.auth.getSession();
          
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${session.session?.access_token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) throw new Error('Failed to fetch invites');
          const data = await response.json();
          
          return (data || []).map((invite: any) => ({ ...invite, teamName: team.name }));
        })
      );
      
      return allInvites.flat();
    },
    enabled: !!currentUserTeams?.length
  });

  // RBAC Diagnostics - only for Owners
  const isOwnerAnywhere = currentUserTeams?.some(team => team.userRole === 'Owner');
  
  const { data: diagnosticsData } = useQuery({
    queryKey: ['rbac-diagnostics', user?.id],
    queryFn: async () => {
      if (!user?.id || !isOwnerAnywhere) return null;
      
      // Get console pages count
      const { data: pagesData, error: pagesError } = await supabase
        .from('console_pages')
        .select('key, label')
        .order('key');
      
      if (pagesError) throw pagesError;
      
      // Get role templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('console_role_templates')
        .select('role, page_key, can_view, can_edit, can_delete')
        .order('role, page_key');
      
      if (templatesError) throw templatesError;
      
      // Get user's detailed team memberships with permissions
      const { data: membershipData, error: membershipError } = await supabase
        .from('console_team_members')
        .select(`
          id,
          team_id,
          role,
          console_teams!inner(name),
          console_member_page_perms(page_key, can_view, can_edit, can_delete)
        `)
        .eq('admin_id', user.id);
      
      if (membershipError) throw membershipError;
      
      // Analyze role coverage
      const availableRoles = ['Owner', 'Admin', 'Developer', 'Analyst', 'ReadOnly'];
      const roleTemplatesCoverage = availableRoles.map(role => {
        const templatesForRole = templatesData?.filter(t => t.role === role) || [];
        const pagesWithTemplates = new Set(templatesForRole.map(t => t.page_key));
        const totalPages = pagesData?.length || 0;
        const coveredPages = pagesWithTemplates.size;
        
        return {
          role,
          hasTemplates: templatesForRole.length > 0,
          coveredPages,
          totalPages,
          coverage: totalPages > 0 ? (coveredPages / totalPages) * 100 : 0
        };
      });
      
      return {
        adminId: user.id,
        totalPages: pagesData?.length || 0,
        pages: pagesData || [],
        templates: templatesData || [],
        memberships: membershipData || [],
        roleTemplatesCoverage
      };
    },
    enabled: !!user?.id && !!isOwnerAnywhere
  });

  // Update the InviteStaffDialog to use the new edge function with rate limiting
  const handleInviteStaff = async (email: string, role: string, teamId: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch('https://lfsdqyvvboapsyeauchm.supabase.co/functions/v1/team-invites', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, role, teamId })
      });

      if (response.status === 429) {
        const errorData = await response.json();
        
        // Show rate limit banner
        setRateLimitBanners(prev => [...prev, {
          id: Date.now().toString(),
          limitType: 'invites',
          retryAfterSeconds: errorData.retry_after_seconds
        }]);

        toast({
          title: 'Rate limit exceeded',
          description: `Too many invites sent. Please try again in ${Math.ceil(errorData.retry_after_seconds / 60)} minutes.`,
          variant: 'destructive',
        });
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to send invite');
      }

      toast({
        title: 'Invitation sent',
        description: `Invitation sent to ${email} successfully.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['console-invites'] });
    } catch (error: any) {
      toast({
        title: 'Failed to send invitation',
        description: error.message || 'There was an error sending the invitation.',
        variant: 'destructive',
      });
    }
  };

  const cancelInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const url = `https://lfsdqyvvboapsyeauchm.supabase.co/functions/v1/team-invites/${inviteId}`;
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to cancel invite');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation canceled",
        description: "The invitation has been canceled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['console-invites'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to cancel invitation",
        description: error.message || "There was an error canceling the invitation.",
        variant: "destructive",
      });
    }
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
      case 'inviteStaff':
        setShowInviteStaff(true);
        break;
    }
  };

  const handleRoleChange = (memberId: string, newRole: string) => {
    updateRoleMutation.mutate({ memberId, newRole });
  };

  const handleRemoveMember = (memberId: string) => {
    removeMemberMutation.mutate(memberId);
  };

  const canEditMember = (member: any, team: any) => {
    const userRole = team.userRole;
    const isOwnerOrAdmin = ['Owner', 'Admin'].includes(userRole);
    
    // Can't edit yourself if you're the only Owner
    if (member.admin_id === user?.id) {
      const ownerCount = teamMembers?.filter(m => 
        m.team_id === team.id && m.role === 'Owner'
      ).length || 0;
      
      if (member.role === 'Owner' && ownerCount === 1) {
        return false;
      }
    }
    
    return isOwnerOrAdmin;
  };

  const canRemoveMember = (member: any, team: any) => {
    const userRole = team.userRole;
    const isOwnerOrAdmin = ['Owner', 'Admin'].includes(userRole);
    
    // Can't remove yourself if you're the only Owner
    if (member.admin_id === user?.id) {
      const ownerCount = teamMembers?.filter(m => 
        m.team_id === team.id && m.role === 'Owner'
      ).length || 0;
      
      if (member.role === 'Owner' && ownerCount === 1) {
        return false;
      }
    }
    
    // Can't remove the last Owner
    if (member.role === 'Owner') {
      const ownerCount = teamMembers?.filter(m => 
        m.team_id === team.id && m.role === 'Owner'
      ).length || 0;
      
      if (ownerCount === 1) {
        return false;
      }
    }
    
    return isOwnerOrAdmin;
  };

  if (userTeamsLoading || membersLoading) {
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
    <PageGuard pageKey="teams">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
            <p className="text-muted-foreground">
              Manage console admin teams and assign roles with our 5-tier permission system
            </p>
          </div>
          {/* Only show create team if user has no teams or is an owner/admin of at least one team  */}
          {(!currentUserTeams?.length || currentUserTeams?.some(team => ['Owner', 'Admin'].includes(team.userRole))) && (
            <Button onClick={() => setShowCreateTeam(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Team
            </Button>
          )}
        </div>

      {/* Rate Limit Banners */}
      {rateLimitBanners.map((banner) => (
        <RateLimitBanner
          key={banner.id}
          limitType={banner.limitType}
          retryAfterSeconds={banner.retryAfterSeconds}
          onDismiss={() => dismissRateLimitBanner(banner.id)}
        />
      ))}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Team Overview</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          
          {/* RBAC Diagnostics - Only for Owners */}
          {isOwnerAnywhere && diagnosticsData && (
            <Collapsible open={diagnosticsOpen} onOpenChange={setDiagnosticsOpen}>
              <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/30">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-amber-100/50 dark:hover:bg-amber-900/50 transition-colors">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bug className="h-5 w-5 text-amber-600" />
                        RBAC Diagnostics
                        <Badge variant="outline" className="text-xs">Owner Only</Badge>
                      </div>
                      {diagnosticsOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </CardTitle>
                    <CardDescription>
                      Debug role-based access control configuration and permissions
                    </CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-6">
                    {/* Current User Info */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Current Admin ID</h4>
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                            {diagnosticsData.adminId}
                          </code>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Console Pages</h4>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{diagnosticsData.totalPages} pages</span>
                          {diagnosticsData.totalPages > 0 ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Team Memberships */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground">Team Memberships</h4>
                      <div className="space-y-2">
                        {diagnosticsData.memberships.map((membership: any) => (
                          <div key={membership.id} className="flex items-center justify-between p-3 bg-card/50 border border-border/50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div>
                                <div className="font-medium">{membership.console_teams.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  Team ID: <code className="bg-muted px-1 rounded">{membership.team_id}</code>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={ROLE_COLORS[membership.role as keyof typeof ROLE_COLORS]}>
                                {membership.role}
                              </Badge>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </div>
                          </div>
                        ))}
                        {diagnosticsData.memberships.length === 0 && (
                          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="text-red-700">No team memberships found</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Role Templates Coverage */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground">Role Templates Coverage</h4>
                      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                        {diagnosticsData.roleTemplatesCoverage.map((roleCoverage: any) => (
                          <div key={roleCoverage.role} className="p-3 bg-card/50 border border-border/50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">{roleCoverage.role}</span>
                              {roleCoverage.hasTemplates ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {roleCoverage.coveredPages}/{roleCoverage.totalPages} pages covered
                            </div>
                            <div className="w-full bg-muted rounded-full h-2 mt-2">
                              <div 
                                className={`h-2 rounded-full transition-all ${
                                  roleCoverage.coverage === 100 ? 'bg-green-500' : 
                                  roleCoverage.coverage > 50 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${roleCoverage.coverage}%` }}
                              />
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {roleCoverage.coverage.toFixed(1)}% coverage
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pages List */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground">Available Pages</h4>
                      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                        {diagnosticsData.pages.map((page: any) => {
                          const hasTemplates = diagnosticsData.templates.some((t: any) => t.page_key === page.key);
                          return (
                            <div key={page.key} className="flex items-center justify-between p-2 bg-card/30 border border-border/30 rounded">
                              <div>
                                <div className="font-medium text-sm">{page.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  <code>{page.key}</code>
                                </div>
                              </div>
                              {hasTemplates ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

      {/* Role System Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Permission System Overview
          </CardTitle>
          <CardDescription>
            Five-tier role system for console admin staff
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(ROLE_DESCRIPTIONS).map(([role, description]) => (
              <div key={role} className="flex items-start gap-2 p-2 rounded-lg border border-border/50 bg-card/30 backdrop-blur-sm">
                <Badge className={`px-2 py-1 text-xs font-medium rounded-full ${ROLE_COLORS[role as keyof typeof ROLE_COLORS]}`}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Badge>
                <p className="text-xs text-muted-foreground flex-1 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Teams Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {currentUserTeams?.map((team) => {
          const members = teamMembers?.filter(member => member.team_id === team.id) || [];
          const memberCount = members.length;
          const roleDistribution = members.reduce((acc, member) => {
            acc[member.role] = (acc[member.role] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          const canManageTeam = team.userRole === 'Owner' || team.userRole === 'Admin';

          return (
            <Card key={team.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {team.name}
                  </span>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{memberCount} members</Badge>
                    <Badge className={ROLE_COLORS[team.userRole as keyof typeof ROLE_COLORS]}>
                      {team.userRole}
                    </Badge>
                  </div>
                </CardTitle>
                <CardDescription>Console team for staff collaboration</CardDescription>
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
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[role as keyof typeof ROLE_COLORS]}`}
                      >
                        {role}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Team Actions */}
                {canManageTeam && (
                  <div className="flex flex-wrap gap-2 pt-2">
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
                       onClick={() => handleTeamAction('inviteStaff', team)}
                       className="gap-1"
                     >
                       <Mail className="h-3 w-3" />
                       Invite Staff
                     </Button>
                  </div>
                )}
                
                {/* Member List */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Team Members</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {members.map((member) => {
                      const canEdit = canEditMember(member, team);
                      const canRemove = canRemoveMember(member, team);
                      
                      return (
                        <div key={member.id} className="flex items-center justify-between p-3 rounded bg-card/30 border border-border/50">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">
                                  {member.admin_profiles.full_name || member.admin_profiles.email}
                                </span>
                                {member.admin_id === user?.id && (
                                  <Badge variant="outline" className="text-xs">You</Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Joined {new Date(member.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            
                            {/* Role Dropdown */}
                            <Select
                              value={member.role}
                              onValueChange={(newRole) => handleRoleChange(member.id, newRole)}
                              disabled={!canEdit}
                            >
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-background border border-border shadow-md z-50">
                                <SelectItem value="Owner">Owner</SelectItem>
                                <SelectItem value="Admin">Admin</SelectItem>
                                <SelectItem value="Developer">Developer</SelectItem>
                                <SelectItem value="Analyst">Analyst</SelectItem>
                                <SelectItem value="ReadOnly">ReadOnly</SelectItem>
                              </SelectContent>
                            </Select>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1">
                              {canManageTeam && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedMember(member);
                                      setShowPagePermissions(true);
                                    }}
                                    className="h-8 px-2 text-xs gap-1"
                                  >
                                    <Shield className="h-3 w-3" />
                                    Pages
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedMember(member);
                                      setShowWidgetScope(true);
                                    }}
                                    className="h-8 px-2 text-xs gap-1"
                                  >
                                    <Layout className="h-3 w-3" />
                                    Widgets
                                  </Button>
                                </>
                              )}
                              
                              {/* Remove Button */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    disabled={!canRemove}
                                    className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to remove {member.admin_profiles?.full_name || member.admin_profiles?.email} from {team?.name}? 
                                      This action cannot be undone and will remove all their permissions and widget access.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleRemoveMember(member.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Remove Member
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pending Invites Section */}
      {currentUserTeams?.some(team => ['Owner', 'Admin'].includes(team.userRole)) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              Staff invitations that are waiting to be accepted
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invitesLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded"></div>
                ))}
              </div>
            ) : pendingInvites?.length ? (
              <div className="space-y-3">
                {pendingInvites.map((invite: any) => (
                  <div key={invite.id} className="flex items-center justify-between p-3 border border-border/50 rounded-lg bg-card/30">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{invite.email}</span>
                        <Badge className={ROLE_COLORS[invite.role as keyof typeof ROLE_COLORS]}>
                          {invite.role}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Invited to {invite.teamName} • Expires {new Date(invite.expires_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => cancelInviteMutation.mutate(invite.id)}
                      disabled={cancelInviteMutation.isPending}
                      className="gap-1"
                    >
                      <X className="h-3 w-3" />
                      Cancel
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No pending invitations
              </div>
            )}
          </CardContent>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          {currentUserTeams?.length ? (
            currentUserTeams.map((team) => (
              <TeamAuditTab key={team.id} teamId={team.id} />
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No teams found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

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
      
      <InviteStaffDialog 
        open={showInviteStaff} 
        onOpenChange={setShowInviteStaff}
        team={selectedTeam}
        onInvite={handleInviteStaff}
      />
      
      <PagePermissionsDialog 
        open={showPagePermissions} 
        onOpenChange={setShowPagePermissions}
        member={selectedMember}
        currentUserRole={currentUserTeams?.find(t => t.id === selectedMember?.team_id)?.userRole || 'ReadOnly'}
      />
      
      <WidgetScopeDialog 
        open={showWidgetScope} 
        onOpenChange={setShowWidgetScope}
        member={selectedMember}
        currentUserRole={currentUserTeams?.find(t => t.id === selectedMember?.team_id)?.userRole || 'ReadOnly'}
      />
    </div>
    </PageGuard>
  );
}