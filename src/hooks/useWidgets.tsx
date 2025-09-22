import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { buildApiUrl, apiEndpoints } from '@/lib/supabaseConfig';

export interface WidgetTheme {
  // Colors
  color_primary?: string;
  color_secondary?: string;
  color_background?: string;
  color_surface?: string;
  color_muted?: string;
  text_color?: string;
  text_color_secondary?: string;
  border_color?: string;
  
  // Typography  
  font_family?: string;
  font_size?: string;
  font_size_small?: string;
  font_weight?: string;
  
  // Layout & Spacing
  border_radius?: string;
  spacing?: string;
  
  // Chat specific
  user_bubble_bg?: string;
  user_bubble_text?: string;
  assistant_bubble_bg?: string;
  assistant_bubble_text?: string;
  
  // Interactive elements
  button_primary_bg?: string;
  button_primary_text?: string;
  button_secondary_bg?: string;
  button_secondary_text?: string;
  input_border?: string;
  input_focus_border?: string;
  
  // Header & Branding
  header_bg?: string;
  header_text?: string;
  logo_url?: string;
  welcome_text?: string;
  
  // Status indicators
  online_indicator?: string;
  offline_indicator?: string;
  typing_indicator?: string;
  
  // Advanced
  shadow_intensity?: string;
  animation_speed?: string;
  compact_mode?: boolean;
  
  // Widget Button
  widget_button_bg?: string;
  widget_button_icon_color?: string;
  widget_button_size?: string;
  widget_button_open_icon?: string;
  widget_button_close_icon?: string;
  widget_initial_state?: string; // 'open' | 'closed'
  widget_button_position?: string; // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
}

export interface Widget {
  id: string;
  site_key: string;
  name: string;
  allowed_domains: string[];
  theme: WidgetTheme;
  created_at: string;
  updated_at: string;
}

export interface NewWidget {
  name: string;
  allowed_domains: string[];
  theme: WidgetTheme;
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
      const response = await fetch(buildApiUrl(`${apiEndpoints.functions}/widget-admin-api/api/admin/widgets`), {
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
      const response = await fetch(buildApiUrl(`${apiEndpoints.functions}/widget-admin-api/api/admin/widgets`), {
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
      const response = await fetch(buildApiUrl(`${apiEndpoints.functions}/widget-admin-api/api/admin/widgets/${widgetId}`), {
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