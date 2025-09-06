import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  Users, 
  Settings, 
  Eye, 
  Edit, 
  Trash2,
  Plus,
  Search,
  BarChart3,
  FileText
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PagePermissionsDialog } from '@/components/teams/PagePermissionsDialog';
import { ReportPermissionsDialog } from '@/components/teams/ReportPermissionsDialog';
import { InviteStaffDialog } from '@/components/teams/InviteStaffDialog';
import { AddMemberDialog } from '@/components/teams/AddMemberDialog';
import { useAuth } from '@/contexts/AuthContext';

interface TeamMember {
  id: string;
  role: string;
  admin_id: string;
  team_id: string;
  admin_profiles: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

interface PagePermission {
  id: string;
  key: string;
  label: string;
  category?: string;
  created_at?: string;
}

export default function AccessControl() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [reportPermissionsDialogOpen, setReportPermissionsDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');

  // Fetch team members
  const { data: teamMembers, isLoading: membersLoading } = useQuery({
    queryKey: ['console-team-members'],
    queryFn: async () => {
      const result = await api.select('console_team_members', `
        *,
        admin_profiles (
          full_name,
          email,
          avatar_url
        )
      `, { order: { column: 'role', ascending: false } });
      
      if (!result.success) throw new Error(result.error);
      return result.data as TeamMember[];
    }
  });

  // Fetch current user's role
  React.useEffect(() => {
    if (user && teamMembers) {
      const currentUserMember = teamMembers.find(m => m.admin_id === user.id);
      if (currentUserMember) {
        setCurrentUserRole(currentUserMember.role);
      }
    }
  }, [user, teamMembers]);

  // Fetch all pages for overview
  const { data: pages } = useQuery({
    queryKey: ['console-pages'],
    queryFn: async () => {
      const result = await api.select('console_pages', '*', { 
        order: { column: 'category', ascending: true } 
      });
      
      if (!result.success) throw new Error(result.error);
      // Sort by label within each category
      const sortedData = result.data?.sort((a, b) => a.label.localeCompare(b.label));
      return sortedData as PagePermission[];
    }
  });

  // Fetch role templates
  const { data: roleTemplates } = useQuery({
    queryKey: ['console-role-templates'],
    queryFn: async () => {
      const result = await api.select('console_role_templates', '*', { 
        order: { column: 'role', ascending: false } 
      });
      
      if (!result.success) throw new Error(result.error);
      return result.data;
    }
  });

  // Fetch report role templates
  const { data: reportRoleTemplates } = useQuery({
    queryKey: ['console-role-report-templates'],
    queryFn: async () => {
      const result = await api.select('console_role_report_templates', '*', { 
        order: { column: 'role', ascending: false } 
      });
      
      if (!result.success) throw new Error(result.error);
      return result.data;
    }
  });

  // Fetch available reports
  const { data: reports } = useQuery({
    queryKey: ['console-reports'],
    queryFn: async () => {
      const result = await api.select('console_reports', '*', { 
        order: { column: 'category', ascending: true } 
      });
      
      if (!result.success) throw new Error(result.error);
      return result.data;
    }
  });

  const canManageAccess = ['Owner', 'Admin'].includes(currentUserRole);
  const filteredMembers = teamMembers?.filter(member => 
    member.admin_profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.admin_profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditPagePermissions = (member: TeamMember) => {
    setSelectedMember(member);
    setPermissionsDialogOpen(true);
  };

  const handleEditReportPermissions = (member: TeamMember) => {
    setSelectedMember(member);
    setReportPermissionsDialogOpen(true);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Owner': return 'bg-gradient-to-r from-purple-600 to-pink-600 text-white';
      case 'Admin': return 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white';
      case 'Editor': return 'bg-gradient-to-r from-green-600 to-teal-600 text-white';
      case 'Viewer': return 'bg-gradient-to-r from-gray-600 to-slate-600 text-white';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const groupPagesByCategory = (pages: PagePermission[]) => {
    return pages?.reduce((acc, page) => {
      const category = page.category || 'core';
      if (!acc[category]) acc[category] = [];
      acc[category].push(page);
      return acc;
    }, {} as Record<string, PagePermission[]>);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'core': 'Core Features',
      'admin': 'Administration',
      'security': 'Security',
      'widgets': 'Widget Management',
      'scripts': 'Script Management', 
      'communication': 'Communication',
      'user': 'User Management',
      'development': 'Development',
      'dashboard-section': 'Dashboard Sections',
      'system-section': 'System Settings'
    };
    return labels[category] || category.charAt(0).toUpperCase() + category.slice(1);
  };

  if (membersLoading) {
    return (
      <div className="container mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Access Control</h1>
        <p className="text-muted-foreground">
          Manage team member permissions and page access controls.
        </p>
      </div>

      <Tabs defaultValue="members" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Members
          </TabsTrigger>
          <TabsTrigger value="pages" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Page & Tab Access
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Report Access
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Role Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
              <CardDescription>
                Manage individual member permissions and roles.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {canManageAccess && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setInviteDialogOpen(true)}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Invite Member
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setAddMemberDialogOpen(true)}
                      className="gap-2"
                    >
                      <Users className="h-4 w-4" />
                      Add Existing User
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {filteredMembers?.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg bg-card/30">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
                        {member.admin_profiles?.full_name?.charAt(0)?.toUpperCase() ||
                         member.admin_profiles?.email?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <h4 className="font-medium">
                          {member.admin_profiles?.full_name || 'Unknown User'}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {member.admin_profiles?.email}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge className={getRoleColor(member.role)}>
                        {member.role}
                      </Badge>
                      
                      {canManageAccess && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPagePermissions(member)}
                            className="gap-1"
                          >
                            <Shield className="h-3 w-3" />
                            Page Access
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditReportPermissions(member)}
                            className="gap-1"
                          >
                            <BarChart3 className="h-3 w-3" />
                            Report Access
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Page & Tab Access Overview
              </CardTitle>
              <CardDescription>
                Overview of all available pages and tabs with their permission structure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pages && (
                <div className="space-y-6">
                  {Object.entries(groupPagesByCategory(pages)).map(([category, categoryPages]) => (
                    <div key={category} className="space-y-3">
                      <h3 className="text-lg font-semibold text-foreground">
                        {getCategoryLabel(category)}
                      </h3>
                      <div className="grid gap-3">
                        {categoryPages.map((page) => (
                          <div key={page.id} className="flex items-center justify-between p-3 border rounded-lg bg-card/20">
                            <div>
                              <h4 className="font-medium">{page.label}</h4>
                              <p className="text-sm text-muted-foreground">Key: {page.key}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="gap-1">
                                <Eye className="h-3 w-3" />
                                View
                              </Badge>
                              <Badge variant="outline" className="gap-1">
                                <Edit className="h-3 w-3" />
                                Edit
                              </Badge>
                              <Badge variant="outline" className="gap-1">
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Report Access Overview
              </CardTitle>
              <CardDescription>
                Overview of all available reports and their permission structure.
              </CardDescription>
            </CardHeader>
            <CardContent>
               {reports && Array.isArray(reports) && (
                <div className="space-y-6">
                  {Object.entries(
                    reports.reduce((acc, report) => {
                      const category = report.category || 'other';
                      if (!acc[category]) acc[category] = [];
                      acc[category].push(report);
                      return acc;
                    }, {} as Record<string, any[]>)
                  ).map(([category, categoryReports]) => (
                    <div key={category} className="space-y-3">
                      <h3 className="text-lg font-semibold text-foreground">
                        {category.charAt(0).toUpperCase() + category.slice(1)} Reports
                      </h3>
                      <div className="grid gap-3">
                        {(categoryReports as any[]).map((report) => (
                          <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg bg-card/20">
                            <div>
                              <h4 className="font-medium">{report.label}</h4>
                              <p className="text-sm text-muted-foreground">
                                {report.description || `Key: ${report.key}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="gap-1">
                                <Eye className="h-3 w-3" />
                                View
                              </Badge>
                              <Badge variant="outline" className="gap-1">
                                <FileText className="h-3 w-3" />
                                Export
                              </Badge>
                              <Badge variant="outline" className="gap-1">
                                <Settings className="h-3 w-3" />
                                Configure
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Role Templates
              </CardTitle>
              <CardDescription>
                Default permission templates for each role type.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {['Owner', 'Admin', 'Editor', 'Viewer'].map((role) => {
                  const rolePerms = roleTemplates?.filter(rt => rt.role === role);
                  const reportPerms = reportRoleTemplates?.filter(rt => rt.role === role);
                  
                  const viewCount = rolePerms?.filter(p => p.can_view).length || 0;
                  const editCount = rolePerms?.filter(p => p.can_edit).length || 0;
                  const deleteCount = rolePerms?.filter(p => p.can_delete).length || 0;
                  
                  const reportViewCount = reportPerms?.filter(p => p.can_view).length || 0;
                  const reportExportCount = reportPerms?.filter(p => p.can_export).length || 0;
                  const reportConfigureCount = reportPerms?.filter(p => p.can_configure).length || 0;
                  
                  return (
                    <div key={role} className="p-4 border rounded-lg bg-card/30">
                      <div className="flex items-center justify-between mb-4">
                        <Badge className={getRoleColor(role)}>
                          {role}
                        </Badge>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Page & Tab Permissions
                          </h4>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="text-center">
                              <div className="font-medium text-xl text-green-600">{viewCount}</div>
                              <div className="text-muted-foreground">View</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-xl text-blue-600">{editCount}</div>
                              <div className="text-muted-foreground">Edit</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-xl text-red-600">{deleteCount}</div>
                              <div className="text-muted-foreground">Delete</div>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Report Access Permissions
                          </h4>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="text-center">
                              <div className="font-medium text-xl text-green-600">{reportViewCount}</div>
                              <div className="text-muted-foreground">View</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-xl text-blue-600">{reportExportCount}</div>
                              <div className="text-muted-foreground">Export</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-xl text-purple-600">{reportConfigureCount}</div>
                              <div className="text-muted-foreground">Configure</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PagePermissionsDialog
        open={permissionsDialogOpen}
        onOpenChange={setPermissionsDialogOpen}
        member={selectedMember}
        currentUserRole={currentUserRole}
      />
      
      <ReportPermissionsDialog
        open={reportPermissionsDialogOpen}
        onOpenChange={setReportPermissionsDialogOpen}
        member={selectedMember}
        currentUserRole={currentUserRole}
      />

      <InviteStaffDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        team={teamMembers?.[0] ? { id: teamMembers[0].team_id } : undefined}
        onInvite={async (email: string, role: string, teamId: string) => {
          queryClient.invalidateQueries({ queryKey: ['console-team-members'] });
          queryClient.invalidateQueries({ queryKey: ['console-invites'] });
        }}
      />

      <AddMemberDialog
        open={addMemberDialogOpen}
        onOpenChange={setAddMemberDialogOpen}
        team={teamMembers?.[0] ? { id: teamMembers[0].team_id } : undefined}
      />
    </div>
  );
}