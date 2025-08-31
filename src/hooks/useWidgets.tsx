import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Widget {
  id: string;
  site_key: string;
  name: string;
  allowed_domains: string[];
  theme: {
    color_primary?: string;
    text_color?: string;
    logo_url?: string;
    welcome_text?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface NewWidget {
  name: string;
  allowed_domains: string[];
  theme: {
    color_primary?: string;
    text_color?: string;
    logo_url?: string;
    welcome_text?: string;
  };
}

export function useWidgets() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchWidgets = async () => {
    try {
      // Get current user's API key for admin access
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('customer_id')
        .limit(1)
        .single();

      if (rolesError || !userRoles?.customer_id) {
        throw new Error('User customer not found');
      }

      // Get admin API key
      const { data: apiKeyData, error: keyError } = await supabase
        .from('api_keys')
        .select('key_prefix')
        .eq('customer_id', userRoles.customer_id)
        .contains('permissions', ['admin'])
        .limit(1)
        .single();

      if (keyError || !apiKeyData) {
        throw new Error('Admin API key not found');
      }

      // Call the widget admin API
      const response = await supabase.functions.invoke('widget-admin-api', {
        method: 'GET',
        headers: {
          'X-API-Key': `${apiKeyData.key_prefix}...` // This would be the full key in practice
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setWidgets(response.data || []);
    } catch (error) {
      console.error('Error fetching widgets:', error);
      toast({
        title: "Error",
        description: "Failed to fetch widgets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createWidget = async (widgetData: NewWidget): Promise<{ id: string; site_key: string } | null> => {
    try {
      // Get current user's API key for admin access
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('customer_id')
        .limit(1)
        .single();

      if (rolesError || !userRoles?.customer_id) {
        throw new Error('User customer not found');
      }

      // Get admin API key
      const { data: apiKeyData, error: keyError } = await supabase
        .from('api_keys')
        .select('key_prefix')
        .eq('customer_id', userRoles.customer_id)
        .contains('permissions', ['admin'])
        .limit(1)
        .single();

      if (keyError || !apiKeyData) {
        throw new Error('Admin API key not found');
      }

      // Call the widget admin API
      const response = await supabase.functions.invoke('widget-admin-api', {
        method: 'POST',
        headers: {
          'X-API-Key': `${apiKeyData.key_prefix}...`, // This would be the full key in practice
          'Content-Type': 'application/json'
        },
        body: widgetData
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Store the secret if returned (only on creation)
      if (response.data?.secret) {
        setCreatedSecret(response.data.secret);
      }

      toast({
        title: "Success",
        description: "Widget created successfully",
      });

      // Refresh the list
      await fetchWidgets();

      return response.data;
    } catch (error) {
      console.error('Error creating widget:', error);
      toast({
        title: "Error",
        description: "Failed to create widget",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateWidget = async (widgetId: string, updates: Partial<Pick<Widget, 'name' | 'allowed_domains' | 'theme'>>) => {
    try {
      // Get current user's API key for admin access
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('customer_id')
        .limit(1)
        .single();

      if (rolesError || !userRoles?.customer_id) {
        throw new Error('User customer not found');
      }

      // Get admin API key
      const { data: apiKeyData, error: keyError } = await supabase
        .from('api_keys')
        .select('key_prefix')
        .eq('customer_id', userRoles.customer_id)
        .contains('permissions', ['admin'])
        .limit(1)
        .single();

      if (keyError || !apiKeyData) {
        throw new Error('Admin API key not found');
      }

      // Call the widget admin API
      const response = await supabase.functions.invoke('widget-admin-api', {
        method: 'PATCH',
        headers: {
          'X-API-Key': `${apiKeyData.key_prefix}...`, // This would be the full key in practice
          'Content-Type': 'application/json'
        },
        body: updates
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "Success",
        description: "Widget updated successfully",
      });

      // Refresh the list
      await fetchWidgets();
    } catch (error) {
      console.error('Error updating widget:', error);
      toast({
        title: "Error",
        description: "Failed to update widget",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchWidgets();
  }, []);

  return {
    widgets,
    loading,
    createdSecret,
    setCreatedSecret,
    createWidget,
    updateWidget,
    refetch: fetchWidgets
  };
}