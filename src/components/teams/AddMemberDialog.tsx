import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const ROLES = ['Owner', 'Admin', 'Developer', 'Analyst', 'ReadOnly'] as const;

const addMemberSchema = z.object({
  userId: z.string().min(1, 'Please select a user'),
  role: z.enum(ROLES, { required_error: 'Please select a role' }),
});

type AddMemberForm = z.infer<typeof addMemberSchema>;

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: any;
}

export function AddMemberDialog({ open, onOpenChange, team }: AddMemberDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AddMemberForm>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      userId: '',
      role: 'ReadOnly',
    },
  });

  // Fetch available admin profiles
  const { data: profiles, isLoading: profilesLoading } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .order('full_name', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch existing team members to exclude them
  const { data: existingMembers } = useQuery({
    queryKey: ['console-team-members', team?.id],
    queryFn: async () => {
      if (!team?.id) return [];
      
      const { data, error } = await supabase
        .from('console_team_members')
        .select('admin_id')
        .eq('team_id', team.id);
      
      if (error) throw error;
      return data.map(m => m.admin_id);
    },
    enabled: open && !!team?.id,
  });

  const addMemberMutation = useMutation({
    mutationFn: async (data: AddMemberForm) => {
      const { error } = await supabase
        .from('console_team_members')
        .insert({
          team_id: team.id,
          admin_id: data.userId,
          role: data.role,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Member added to team successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['console-team-members'] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add member to team',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: AddMemberForm) => {
    addMemberMutation.mutate(data);
  };

  const availableUsers = profiles?.filter(profile => 
    !existingMembers?.includes(profile.id)
  ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>
            Add a new member to {team?.name} and assign them a role.
          </DialogDescription>
        </DialogHeader>

        {profilesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select User</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a user to add" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableUsers.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>{profile.full_name || profile.email || 'Unnamed User'}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            <div className="flex items-center justify-between w-full">
                              <span className="capitalize">{role}</span>
                              <Badge variant="outline" className="ml-2 text-xs">
                                {role === 'Owner' && 'Full Access'}
                                {role === 'Admin' && 'Manage Team'}
                                {role === 'Developer' && 'Development'}
                                {role === 'Analyst' && 'Analytics'}
                                {role === 'ReadOnly' && 'Read Only'}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={addMemberMutation.isPending || availableUsers.length === 0}
                >
                  {addMemberMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Member
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}

        {availableUsers.length === 0 && !profilesLoading && (
          <div className="text-center py-4 text-muted-foreground">
            No available users to add to this team.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}