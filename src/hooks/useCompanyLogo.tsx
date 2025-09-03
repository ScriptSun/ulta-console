import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface CompanyLogoSettings {
  id?: string;
  logo_light_url: string;
  logo_dark_url: string;
  email_logo_url?: string;
  favicon_source_url?: string;
  logo_width: number;
  logo_height: number;
  created_by?: string;
}

export function useCompanyLogo() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [logoSettings, setLogoSettings] = useState<CompanyLogoSettings>({
    logo_light_url: '',
    logo_dark_url: '',
    email_logo_url: '',
    favicon_source_url: '',
    logo_width: 120,
    logo_height: 40
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState({ light: false, dark: false, email: false, favicon: false });

  const loadLogoSettings = async () => {
    try {
      setLoading(true);
      console.log('Loading logo settings...');
      
      // Load public company logos - get the first active theme (for public display on login)
      const { data, error } = await supabase
        .from('company_themes')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('Logo query result:', { data, error });

      if (error && error.code !== 'PGRST116') {
        console.error('Database error:', error);
        // Don't throw on network errors, just log them
        if (!error.message?.includes('timeout') && !error.message?.includes('Network connection failed')) {
          throw error;
        }
        return;
      }

      if (data) {
        // Use type assertion since we know the migration will add these columns
        const themeData = data as any;
        console.log('Setting logo data:', themeData);
        setLogoSettings({
          id: themeData.id,
          logo_light_url: themeData.logo_light_url || '',
          logo_dark_url: themeData.logo_dark_url || '',
          email_logo_url: themeData.email_logo_url || '',
          favicon_source_url: themeData.favicon_source_url || '',
          logo_width: themeData.logo_width || 120,
          logo_height: themeData.logo_height || 40,
          created_by: themeData.created_by
        });
      } else {
        console.log('No active company theme found - creating default state');
        // Set default state if no data found
        setLogoSettings({
          logo_light_url: '',
          logo_dark_url: '',
          email_logo_url: '',
          favicon_source_url: '',
          logo_width: 120,
          logo_height: 40
        });
      }
    } catch (err: any) {
      console.error('Error loading logo settings:', err);
      // Show user-friendly error message
      toast({
        title: "Loading error",
        description: "Failed to load logos. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadLogo = async (file: File, theme: 'light' | 'dark' | 'email' | 'favicon') => {
    if (!user) return null;

    setUploading(prev => ({ ...prev, [theme]: true }));

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/logo-${theme}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err: any) {
      console.error(`Error uploading ${theme} logo:`, err);
      toast({
        title: "Upload failed",
        description: `Failed to upload ${theme} logo. Please try again.`,
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(prev => ({ ...prev, [theme]: false }));
    }
  };

  const saveLogoSettings = async (settings: Partial<CompanyLogoSettings>) => {
    if (!user) return false;

    setLoading(true);

    try {
      const settingsToSave = {
        name: 'Company Logo Settings',
        logo_light_url: settings.logo_light_url !== undefined ? settings.logo_light_url : logoSettings.logo_light_url,
        logo_dark_url: settings.logo_dark_url !== undefined ? settings.logo_dark_url : logoSettings.logo_dark_url,
        email_logo_url: settings.email_logo_url !== undefined ? settings.email_logo_url : logoSettings.email_logo_url,
        favicon_source_url: settings.favicon_source_url !== undefined ? settings.favicon_source_url : logoSettings.favicon_source_url,
        logo_width: settings.logo_width !== undefined ? settings.logo_width : logoSettings.logo_width,
        logo_height: settings.logo_height !== undefined ? settings.logo_height : logoSettings.logo_height,
        created_by: user.id,
        is_active: true,
        colors: {}
      };

      let query = supabase.from('company_themes');
      
      if (logoSettings.id) {
        const { data, error } = await query
          .update(settingsToSave)
          .eq('id', logoSettings.id)
          .select()
          .single();

        if (error) throw error;
        setLogoSettings(prev => ({ ...prev, ...settings }));
      } else {
        const { data, error } = await query
          .insert(settingsToSave)
          .select()
          .single();

        if (error) throw error;
        const newData = data as any;
        setLogoSettings(prev => ({ 
          ...prev, 
          id: newData.id,
          created_by: newData.created_by,
          ...settings 
        }));
      }

      toast({
        title: "Success",
        description: "Logo settings saved successfully.",
      });

      return true;
    } catch (err: any) {
      console.error('Error saving logo settings:', err);
      toast({
        title: "Save failed",
        description: "Failed to save logo settings. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removeLogo = async (theme: 'light' | 'dark') => {
    if (!user) return false;

    try {
      const fileName = `${user.id}/logo-${theme}`;
      
      // Try to remove from storage (ignore errors if file doesn't exist)
      await supabase.storage
        .from('company-logos')
        .remove([fileName]);

      // Update the settings
      const newSettings = {
        [`logo_${theme}_url`]: ''
      } as Partial<CompanyLogoSettings>;

      await saveLogoSettings(newSettings);
      return true;
    } catch (err: any) {
      console.error(`Error removing ${theme} logo:`, err);
      return false;
    }
  };

  useEffect(() => {
    // Load logo settings for public display (doesn't require authentication)
    loadLogoSettings();
  }, []);

  return {
    logoSettings,
    loading,
    uploading,
    loadLogoSettings,
    uploadLogo,
    saveLogoSettings,
    removeLogo
  };
}