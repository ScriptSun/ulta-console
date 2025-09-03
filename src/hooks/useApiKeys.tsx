import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  status: 'active' | 'expired' | 'revoked';
  permissions: string[];
  last_used_at?: string;
  daily_request_count: number;
  request_count: number;
  created_at: string;
  expires_at?: string;
}

export interface NewApiKey {
  id: string;
  api_key: string;
  key_prefix: string;
}

export function useApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setApiKeys(data?.map(key => ({
        ...key,
        status: key.status as 'active' | 'expired' | 'revoked'
      })) || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast({
        title: "Error",
        description: "Failed to fetch API keys",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = async (name: string, permissions: string[] = ['read']): Promise<NewApiKey | null> => {
    try {
      // Get current user's customer ID - try multiple approaches
      let customerIdResult;
      
      // First try getting from user_roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('customer_id')
        .limit(1)
        .maybeSingle();

      if (userRoles?.customer_id) {
        customerIdResult = userRoles.customer_id;
      } else {
        // Fallback: try getting from console_team_members
        const { data: teamMembers, error: teamError } = await supabase
          .from('console_team_members')
          .select('team_id')
          .limit(1)
          .maybeSingle();
          
        if (teamMembers?.team_id) {
          customerIdResult = teamMembers.team_id;
        } else {
          // Last fallback: use a default customer ID or create one
          // For now, we'll use a default system customer ID
          customerIdResult = '22222222-2222-2222-2222-222222222222';
        }
      }

      console.log('Using customer ID for API key generation:', customerIdResult);

      const { data, error } = await supabase
        .rpc('generate_api_key', {
          _customer_id: customerIdResult,
          _name: name,
          _permissions: permissions
        });

      if (error) {
        console.error('RPC Error:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        throw new Error('No data returned from generate_api_key function');
      }

      const newKey = data[0];
      
      toast({
        title: "Success",
        description: "API key generated successfully",
      });

      // Refresh the list
      await fetchApiKeys();

      return newKey;
    } catch (error: any) {
      console.error('Error generating API key:', error);
      let errorMessage = "Failed to generate API key";
      
      if (error.message?.includes('customer')) {
        errorMessage = "Unable to determine customer context. Please ensure you're properly logged in.";
      } else if (error.message?.includes('permission')) {
        errorMessage = "Insufficient permissions to generate API keys.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    }
  };

  const revokeApiKey = async (keyId: string) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ status: 'revoked' })
        .eq('id', keyId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "API key revoked successfully",
      });

      // Refresh the list
      await fetchApiKeys();
    } catch (error) {
      console.error('Error revoking API key:', error);
      toast({
        title: "Error",
        description: "Failed to revoke API key",
        variant: "destructive",
      });
    }
  };

  const updateApiKey = async (keyId: string, updates: Partial<Pick<ApiKey, 'name' | 'permissions'>>) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update(updates)
        .eq('id', keyId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "API key updated successfully",
      });

      // Refresh the list
      await fetchApiKeys();
    } catch (error) {
      console.error('Error updating API key:', error);
      toast({
        title: "Error",
        description: "Failed to update API key",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  return {
    apiKeys,
    loading,
    generateApiKey,
    revokeApiKey,
    updateApiKey,
    refetch: fetchApiKeys
  };
}