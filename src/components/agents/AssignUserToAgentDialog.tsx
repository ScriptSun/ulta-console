import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { Loader2, User, Mail } from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

interface Agent {
  id: string;
  hostname?: string;
  user_id?: string;
  plan_key?: string;
}

interface AssignUserToAgentDialogProps {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AssignUserToAgentDialog({ agent, open, onOpenChange, onSuccess }: AssignUserToAgentDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const { data: users } = useQuery({
    queryKey: ['users-for-assignment'],
    queryFn: async () => {
      const response = await api.query('users', {
        select: '*',
        orderBy: { column: 'email', ascending: true }
      });
      
      if (!response.success) {
        throw new Error(response.error);
      }
      
      return response.data || [];
    },
    enabled: open,
  });

  const { data: plans } = useQuery({
    queryKey: ['plans-for-assignment'],
    queryFn: async () => {
      const response = await api.query('subscription_plans', {
        select: '*',
        orderBy: { column: 'price_cents', ascending: true }
      });
      
      if (!response.success) {
        throw new Error(response.error);
      }
      
      return response.data || [];
    },
    enabled: open,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agent || !selectedUserId) return;
    
    setIsLoading(true);

    try {
      const updateData: any = {
        user_id: selectedUserId,
      };
      
      if (selectedPlan) {
        updateData.plan_key = selectedPlan;
      }

      const response = await api.update('agents', 
        { id: agent.id }, 
        updateData
      );

      if (!response.success) {
        throw new Error(response.error);
      }

      toast({
        title: 'Success',
        description: 'User assigned to agent successfully',
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign user to agent',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open && agent) {
      setSelectedUserId(agent.user_id || '');
      setSelectedPlan(agent.plan_key || '');
    } else {
      setSelectedUserId('');
      setSelectedPlan('');
    }
  }, [open, agent]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign User to Agent</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Agent</Label>
            <div className="p-3 bg-muted rounded-lg">
              <div className="font-medium">{agent?.hostname || 'Unknown Agent'}</div>
              <div className="text-sm text-muted-foreground">{agent?.id}</div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user">Select User *</Label>
            <Select
              value={selectedUserId}
              onValueChange={setSelectedUserId}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a user" />
              </SelectTrigger>
              <SelectContent>
                {users?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-medium">{user.full_name || 'Unnamed User'}</div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan">Subscription Plan (Optional)</Label>
            <Select
              value={selectedPlan}
              onValueChange={setSelectedPlan}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a plan (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No Plan</SelectItem>
                {plans?.map((plan) => (
                  <SelectItem key={plan.id} value={plan.key}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{plan.name}</span>
                      <Badge variant="outline" className="text-xs">
                        ${(plan.price_cents / 100).toFixed(2)}/mo
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !selectedUserId}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Assign User
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}