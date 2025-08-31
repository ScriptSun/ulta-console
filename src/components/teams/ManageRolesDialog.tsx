import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const ROLES = ['Owner', 'Admin', 'Developer', 'Analyst', 'ReadOnly'] as const;

type TeamMemberWithProfile = {
  id: string;
  team_id: string;
  admin_id: string;
  role: typeof ROLES[number];
  created_at: string;
  admin_profiles: {
    email: string;
    full_name: string | null;
  } | null;
};

const ROLE_COLORS = {
  Owner: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  Admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  Developer: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  Analyst: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  ReadOnly: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

interface ManageRolesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: any;
}

export function ManageRolesDialog({ open, onOpenChange, team }: ManageRolesDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch team members with admin profiles
  const { data: teamMembers, isLoading } = useQuery<TeamMemberWithProfile[]>({
    queryKey: ['console-team-members', team?.id],
    queryFn: async () => {
      if (!team?.id) return [];
      
      const { data, error } = await supabase
        .from('console_team_members')
        .select(`
          *,
          admin_profiles(email, full_name)
        `)
        .eq('team_id', team.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as any;
    },
    enabled: open && !!team?.id,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, newRole }: { memberId: string; newRole: typeof ROLES[number] }) => {
      const { error } = await supabase
        .from('console_team_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Member role updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['console-team-members'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update member role',
        variant: 'destructive',
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('console_team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
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

  const handleRoleChange = (memberId: string, newRole: typeof ROLES[number]) => {
    updateRoleMutation.mutate({ memberId, newRole });
  };

  const handleRemoveMember = (memberId: string) => {
    removeMemberMutation.mutate(memberId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Team Roles</DialogTitle>
          <DialogDescription>
            Manage roles and permissions for members of {team?.name}.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {teamMembers?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No members found in this team.
              </div>
            ) : (
              teamMembers?.map((member) => (
                <div 
                  key={member.id} 
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-muted rounded-full">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {member.admin_profiles?.full_name || member.admin_profiles?.email || 'Unnamed User'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Joined {new Date(member.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className={ROLE_COLORS[(member.role || 'ReadOnly') as keyof typeof ROLE_COLORS]}>
                      {member.role ? member.role : 'ReadOnly'}
                    </Badge>

                    <Select
                      value={member.role || 'ReadOnly'}
                       onValueChange={(newRole: typeof ROLES[number]) => handleRoleChange(member.id, newRole)}
                     >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            <span>{role}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove {member.admin_profiles?.full_name || member.admin_profiles?.email} from {team?.name}? 
                            This action cannot be undone.
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
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}