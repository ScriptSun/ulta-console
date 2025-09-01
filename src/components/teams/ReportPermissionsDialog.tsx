import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart3, 
  Eye, 
  Download, 
  Settings,
  DollarSign,
  Brain,
  Users,
  AlertTriangle,
  Shield,
  TrendingUp
} from 'lucide-react';

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

interface Report {
  id: string;
  key: string;
  label: string;
  category: string;
  description?: string;
}

interface ReportPermission {
  report_key: string;
  can_view: boolean;
  can_export: boolean;
  can_configure: boolean;
}

interface ReportPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMember | null;
  currentUserRole: string;
}

export function ReportPermissionsDialog({
  open,
  onOpenChange,
  member,
  currentUserRole
}: ReportPermissionsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [permissions, setPermissions] = useState<Record<string, ReportPermission>>({});

  const canManage = ['Owner', 'Admin'].includes(currentUserRole);

  // Fetch available reports
  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['console-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('console_reports')
        .select('*')
        .order('category', { ascending: true });
      
      if (error) throw error;
      return data as Report[];
    },
    enabled: open && !!member
  });

  // Fetch current member permissions
  const { data: memberPermissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['console-member-report-perms', member?.id],
    queryFn: async () => {
      if (!member) return [];
      
      const { data, error } = await supabase
        .from('console_member_report_perms')
        .select('*')
        .eq('member_id', member.id);
      
      if (error) throw error;
      return data;
    },
    enabled: open && !!member
  });

  // Fetch role template permissions
  const { data: roleTemplatePermissions } = useQuery({
    queryKey: ['console-role-report-templates', member?.role],
    queryFn: async () => {
      if (!member) return [];
      
      const { data, error } = await supabase
        .from('console_role_report_templates')
        .select('*')
        .eq('role', member.role);
      
      if (error) throw error;
      return data;
    },
    enabled: open && !!member
  });

  // Initialize permissions when data loads
  useEffect(() => {
    if (reports && roleTemplatePermissions && memberPermissions) {
      const permissionsMap: Record<string, ReportPermission> = {};
      
      reports.forEach(report => {
        // Start with role template defaults
        const roleTemplate = roleTemplatePermissions.find(rt => rt.report_key === report.key);
        const memberOverride = memberPermissions.find(mp => mp.report_key === report.key);
        
        permissionsMap[report.key] = {
          report_key: report.key,
          can_view: memberOverride?.can_view ?? roleTemplate?.can_view ?? false,
          can_export: memberOverride?.can_export ?? roleTemplate?.can_export ?? false,
          can_configure: memberOverride?.can_configure ?? roleTemplate?.can_configure ?? false,
        };
      });
      
      setPermissions(permissionsMap);
    }
  }, [reports, roleTemplatePermissions, memberPermissions]);

  // Save permissions mutation
  const savePermissionsMutation = useMutation({
    mutationFn: async (newPermissions: Record<string, ReportPermission>) => {
      if (!member) throw new Error('No member selected');

      // Delete existing permissions for this member
      await supabase
        .from('console_member_report_perms')
        .delete()
        .eq('member_id', member.id);

      // Insert new permissions (only if different from role template)
      const permissionsToInsert = Object.values(newPermissions).filter(perm => {
        const roleTemplate = roleTemplatePermissions?.find(rt => rt.report_key === perm.report_key);
        return (
          perm.can_view !== (roleTemplate?.can_view ?? false) ||
          perm.can_export !== (roleTemplate?.can_export ?? false) ||
          perm.can_configure !== (roleTemplate?.can_configure ?? false)
        );
      });

      if (permissionsToInsert.length > 0) {
        const { error } = await supabase
          .from('console_member_report_perms')
          .insert(
            permissionsToInsert.map(perm => ({
              member_id: member.id,
              ...perm
            }))
          );

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Report permissions updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['console-member-report-perms'] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update report permissions.',
        variant: 'destructive',
      });
      console.error('Error updating report permissions:', error);
    },
  });

  const handlePermissionChange = (reportKey: string, permissionType: keyof ReportPermission, value: boolean) => {
    if (permissionType === 'report_key') return;
    
    setPermissions(prev => ({
      ...prev,
      [reportKey]: {
        ...prev[reportKey],
        [permissionType]: value
      }
    }));
  };

  const handleSave = () => {
    savePermissionsMutation.mutate(permissions);
  };

  const getReportIcon = (category: string) => {
    switch (category) {
      case 'financial': return DollarSign;
      case 'analytics': return BarChart3;
      case 'security': return Shield;
      case 'team': return Users;
      case 'dashboard': return TrendingUp;
      default: return BarChart3;
    }
  };

  const groupReportsByCategory = (reports: Report[]) => {
    return reports.reduce((acc, report) => {
      const category = report.category || 'other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(report);
      return acc;
    }, {} as Record<string, Report[]>);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'dashboard': 'Dashboard Reports',
      'financial': 'Financial Reports', 
      'analytics': 'Analytics Reports',
      'security': 'Security Reports',
      'team': 'Team Reports'
    };
    return labels[category] || category.charAt(0).toUpperCase() + category.slice(1);
  };

  if (!member) return null;

  const isLoading = reportsLoading || permissionsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Report Permissions for {member.admin_profiles?.full_name}
          </DialogTitle>
          <DialogDescription>
            Configure which reports this team member can access, export, and configure.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4 flex-shrink-0">
          <Badge variant="secondary">{member.role}</Badge>
          <span className="text-sm text-muted-foreground">
            {member.admin_profiles?.email}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 flex-1">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-6 pb-4">
              {reports && Object.entries(groupReportsByCategory(reports)).map(([category, categoryReports]) => {
              return (
                <div key={category} className="space-y-3">
                  <h3 className="text-lg font-semibold text-foreground">
                    {getCategoryLabel(category)}
                  </h3>
                  <div className="space-y-3">
                    {categoryReports.map((report) => {
                      const ReportIcon = getReportIcon(report.category);
                      const perm = permissions[report.key];
                      
                      if (!perm) return null;

                      return (
                        <div key={report.key} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <ReportIcon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                            <div className="flex-1">
                              <h4 className="font-medium">{report.label}</h4>
                              {report.description && (
                                <p className="text-sm text-muted-foreground">{report.description}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4">
                            <label className="flex items-center space-x-2">
                              <Switch
                                checked={perm.can_view}
                                onCheckedChange={(checked) => 
                                  handlePermissionChange(report.key, 'can_view', checked)
                                }
                                disabled={!canManage}
                              />
                              <div className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                <span className="text-sm">View</span>
                              </div>
                            </label>
                            
                            <label className="flex items-center space-x-2">
                              <Switch
                                checked={perm.can_export}
                                onCheckedChange={(checked) => 
                                  handlePermissionChange(report.key, 'can_export', checked)
                                }
                                disabled={!canManage || !perm.can_view}
                              />
                              <div className="flex items-center gap-1">
                                <Download className="h-3 w-3" />
                                <span className="text-sm">Export</span>
                              </div>
                            </label>
                            
                            <label className="flex items-center space-x-2">
                              <Switch
                                checked={perm.can_configure}
                                onCheckedChange={(checked) => 
                                  handlePermissionChange(report.key, 'can_configure', checked)
                                }
                                disabled={!canManage || !perm.can_view}
                              />
                              <div className="flex items-center gap-1">
                                <Settings className="h-3 w-3" />
                                <span className="text-sm">Configure</span>
                              </div>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {category !== Object.keys(groupReportsByCategory(reports)).slice(-1)[0] && (
                    <Separator />
                  )}
                </div>
              );
            })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t mt-4 bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {canManage && (
            <Button 
              onClick={handleSave} 
              disabled={savePermissionsMutation.isPending}
            >
              {savePermissionsMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}