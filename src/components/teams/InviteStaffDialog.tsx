import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Mail, UserPlus } from 'lucide-react';

interface InviteStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: any;
  onInvite?: (email: string, role: string, teamId: string) => Promise<void>;
}

const ROLES = [
  { value: 'ReadOnly', label: 'ReadOnly', description: 'Can view all resources but cannot make changes' },
  { value: 'Analyst', label: 'Analyst', description: 'Can access analytics, reports and data analysis' },
  { value: 'Developer', label: 'Developer', description: 'Can create and modify development resources' },
  { value: 'Admin', label: 'Admin', description: 'Can manage team members and most resources' },
  { value: 'Owner', label: 'Owner', description: 'Full access to all resources and team settings' }
];

export function InviteStaffDialog({ open, onOpenChange, team, onInvite }: InviteStaffDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');

  const createInviteMutation = useMutation({
    mutationFn: async ({ teamId, email, role }: { teamId: string; email: string; role: string }) => {
      const url = `https://lfsdqyvvboapsyeauchm.supabase.co/functions/v1/console-invites`;
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          team_id: teamId,
          email: email.toLowerCase().trim(),
          role
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create invite');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: "The staff member has been invited to join the team.",
      });
      queryClient.invalidateQueries({ queryKey: ['console-invites'] });
      setEmail('');
      setRole('');
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send invitation",
        description: error.message || "There was an error sending the invitation.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !role || !team?.id) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    if (onInvite) {
      // Use the custom invite handler with rate limiting
      await onInvite(email, role, team.id);
      setEmail('');
      setRole('');
      onOpenChange(false);
    } else {
      // Fallback to the mutation
      createInviteMutation.mutate({ teamId: team.id, email, role });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setEmail('');
      setRole('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Staff Member
          </DialogTitle>
          <DialogDescription>
            Send an invitation to join {team?.name}. They will receive an email with instructions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((roleOption) => (
                  <SelectItem key={roleOption.value} value={roleOption.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{roleOption.label}</span>
                      <span className="text-xs text-muted-foreground">{roleOption.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createInviteMutation.isPending || !email || !role}
            >
              {createInviteMutation.isPending ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}