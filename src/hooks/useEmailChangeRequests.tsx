import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface EmailChangeRequest {
  id: string;
  user_id: string;
  current_email: string;
  new_email: string;
  requested_by: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reason?: string;
  approved_by?: string;
  approved_at?: string;
  rejected_reason?: string;
  created_at: string;
  updated_at: string;
  requester_profile?: {
    full_name: string;
    email: string;
  };
  approver_profile?: {
    full_name: string;
    email: string;
  };
}

export const useEmailChangeRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<EmailChangeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<EmailChangeRequest[]>([]);

  const fetchRequests = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch requests where current user is involved
      const { data, error } = await supabase
        .from('email_change_requests')
        .select('*')
        .or(`user_id.eq.${user.id},requested_by.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const processedData: EmailChangeRequest[] = (data || []).map(request => ({
        ...request,
        status: request.status as EmailChangeRequest['status'],
      }));
      
      setRequests(processedData);
      
      // Filter pending requests for approval
      const pending = processedData.filter(req => 
        req.status === 'pending' && req.requested_by !== user.id
      );
      setPendingRequests(pending);
      
    } catch (error) {
      console.error('Error fetching email change requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const createEmailChangeRequest = async (
    targetUserId: string,
    currentEmail: string,
    newEmail: string,
    reason?: string
  ) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('email_change_requests')
        .insert({
          user_id: targetUserId,
          current_email: currentEmail,
          new_email: newEmail,
          requested_by: user.id,
          reason: reason,
        });

      if (error) throw error;

      toast({
        title: 'Email Change Requested',
        description: 'Your email change request has been submitted for approval.',
      });

      await fetchRequests();
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to create email change request';
      toast({
        title: 'Request Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      return { success: false, error: errorMessage };
    }
  };

  const approveEmailChangeRequest = async (requestId: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('email_change_requests')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Request Approved',
        description: 'The email change request has been approved.',
      });

      await fetchRequests();
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to approve request';
      toast({
        title: 'Approval Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      return { success: false, error: errorMessage };
    }
  };

  const rejectEmailChangeRequest = async (requestId: string, rejectedReason: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('email_change_requests')
        .update({
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejected_reason: rejectedReason,
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Request Rejected',
        description: 'The email change request has been rejected.',
      });

      await fetchRequests();
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to reject request';
      toast({
        title: 'Rejection Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      return { success: false, error: errorMessage };
    }
  };

  const cancelEmailChangeRequest = async (requestId: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('email_change_requests')
        .update({
          status: 'cancelled',
        })
        .eq('id', requestId)
        .eq('requested_by', user.id);

      if (error) throw error;

      toast({
        title: 'Request Cancelled',
        description: 'Your email change request has been cancelled.',
      });

      await fetchRequests();
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to cancel request';
      toast({
        title: 'Cancellation Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      return { success: false, error: errorMessage };
    }
  };

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  return {
    requests,
    pendingRequests,
    loading,
    createEmailChangeRequest,
    approveEmailChangeRequest,
    rejectEmailChangeRequest,
    cancelEmailChangeRequest,
    refetch: fetchRequests,
  };
};