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
      console.log('Fetching widgets...');
      
      // Get current user's session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('User not authenticated');
      }

      // Call the widget admin API with proper API path
      const response = await fetch(`https://lfsdqyvvboapsyeauchm.supabase.co/functions/v1/widget-admin-api/api/admin/widgets`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Fetch widgets response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetch widgets data:', data);

      setWidgets(data || []);
    } catch (error) {
      console.error('Error fetching widgets:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch widgets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createWidget = async (widgetData: NewWidget): Promise<{ id: string; site_key: string } | null> => {
    try {
      console.log('Creating widget with data:', widgetData);
      
      // Get current user's session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('User not authenticated');
      }

      // Call the widget admin API with proper API path
      console.log('Calling widget-admin-api...');
      const response = await fetch(`https://lfsdqyvvboapsyeauchm.supabase.co/functions/v1/widget-admin-api/api/admin/widgets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(widgetData)
      });

      console.log('Widget admin API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Widget admin API error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('Widget creation successful:', data);

      // Store the secret if returned (only on creation)
      if (data?.secret) {
        setCreatedSecret(data.secret);
      }

      toast({
        title: "Success",
        description: "Widget created successfully",
      });

      // Refresh the list
      await fetchWidgets();

      return data;
    } catch (error) {
      console.error('Error creating widget:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create widget",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateWidget = async (widgetId: string, updates: Partial<Pick<Widget, 'name' | 'allowed_domains' | 'theme'>>) => {
    try {
      // Get current user's session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('User not authenticated');
      }

      // Call the widget admin API with proper API path  
      const response = await fetch(`https://lfsdqyvvboapsyeauchm.supabase.co/functions/v1/widget-admin-api/api/admin/widgets/${widgetId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
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
        description: error instanceof Error ? error.message : "Failed to update widget",
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