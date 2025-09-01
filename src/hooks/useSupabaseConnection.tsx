import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ConnectionStatus {
  isConnected: boolean;
  hasUserRoles: boolean;
  errorDetails: string | null;
  isLoading: boolean;
}

export function useSupabaseConnection() {
  const { user } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    hasUserRoles: false,
    errorDetails: null,
    isLoading: true
  });

  useEffect(() => {
    if (!user) {
      setStatus({
        isConnected: false,
        hasUserRoles: false,
        errorDetails: 'User not authenticated',
        isLoading: false
      });
      return;
    }

    testConnection();
  }, [user]);

  const testConnection = async () => {
    try {
      console.log('Testing Supabase connection...');
      
      // Test basic connection
      const { data: testData, error: testError } = await supabase
        .from('admin_profiles')
        .select('id')
        .limit(1);

      if (testError) {
        console.error('Connection test failed:', testError);
        setStatus({
          isConnected: false,
          hasUserRoles: false,
          errorDetails: `Connection failed: ${testError.message}`,
          isLoading: false
        });
        return;
      }

      console.log('Basic connection successful');

      // Test user roles
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user!.id);

      if (roleError) {
        console.warn('User roles check failed:', roleError);
        // Try to create basic user role
        await createDefaultUserRole();
      }

      const hasRoles = roleData && roleData.length > 0;
      console.log('User has roles:', hasRoles, roleData);

      setStatus({
        isConnected: true,
        hasUserRoles: hasRoles,
        errorDetails: hasRoles ? null : 'User roles missing - creating default role',
        isLoading: false
      });

    } catch (error) {
      console.error('Connection test error:', error);
      setStatus({
        isConnected: false,
        hasUserRoles: false,
        errorDetails: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isLoading: false
      });
    }
  };

  const createDefaultUserRole = async () => {
    try {
      console.log('Creating default user role...');
      
      // First ensure admin profile exists
      const { error: profileError } = await supabase
        .from('admin_profiles')
        .upsert({
          id: user!.id,
          email: user!.email!,
          full_name: user!.user_metadata?.full_name || user!.email!
        });

      if (profileError) {
        console.error('Failed to create admin profile:', profileError);
      }

      // Create default user role with owner access
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: user!.id,
          customer_id: '22222222-2222-2222-2222-222222222222', // Default customer
          role: 'owner'
        });

      if (roleError) {
        console.error('Failed to create user role:', roleError);
        return false;
      }

      console.log('Default user role created successfully');
      return true;
    } catch (error) {
      console.error('Error creating default user role:', error);
      return false;
    }
  };

  const retryConnection = () => {
    setStatus(prev => ({ ...prev, isLoading: true }));
    testConnection();
  };

  return {
    ...status,
    retryConnection,
    createDefaultUserRole
  };
}