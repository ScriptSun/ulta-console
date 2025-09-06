import { useState, useEffect, useCallback } from 'react';
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

const CACHE_KEY = 'company_logo_settings';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export function useCompanyLogo() {
  const { user } = useAuth(); // user can be null on public pages
  const { toast } = useToast();
  const [logoSettings, setLogoSettings] = useState<CompanyLogoSettings>({
    logo_light_url: '',
    logo_dark_url: '',
    email_logo_url: '',
    favicon_source_url: '',
    logo_width: 120,
    logo_height: 40
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState({ light: false, dark: false, email: false, favicon: false });

  // Load cached data immediately
  const loadFromCache = useCallback(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_EXPIRY) {
          console.log('Loading logo settings from cache');
          setLogoSettings(data);
          setLoading(false);
          return true;
        }
      }
    } catch (err) {
      console.warn('Failed to load from cache:', err);
    }
    return false;
  }, []);

  // Save to cache
  const saveToCache = useCallback((data: CompanyLogoSettings) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.warn('Failed to save to cache:', err);
    }
  }, []);

  // Retry with exponential backoff
  const retryWithBackoff = useCallback(async (fn: () => Promise<any>, maxRetries = 3) => {
    let lastError: any;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on certain errors
        if (error.message?.includes('JWT') || error.code === 'PGRST116') {
          throw error;
        }
        
        if (attempt < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          console.log(`Retry attempt ${attempt + 1} in ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }, []);

  const loadLogoSettings = async (background = false) => {
    try {
      if (!background) {
        setLoading(true);
      }
      
      console.log('Loading logo settings from database...');
      
      const fetchData = async () => {
        // Use Promise.race for timeout instead of AbortController
        const queryPromise = supabase
          .from('company_themes')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout - slow network connection')), 15000);
        });

        return await Promise.race([queryPromise, timeoutPromise]) as any;
      };

      const { data, error } = await retryWithBackoff(fetchData);

      console.log('Logo query result:', { data, error });

      if (error && error.code !== 'PGRST116') {
        console.error('Database error:', error);
        
        // Show user-friendly error only if not background loading
        if (!background) {
          toast({
            title: "Connection issue",
            description: "Using cached logos. Will try to refresh in background.",
            variant: "default",
          });
        }
        return;
      }

      const logoData = data ? {
        id: data.id,
        logo_light_url: data.logo_light_url || '',
        logo_dark_url: data.logo_dark_url || '',
        email_logo_url: data.email_logo_url || '',
        favicon_source_url: data.favicon_source_url || '',
        logo_width: data.logo_width || 120,
        logo_height: data.logo_height || 40,
        created_by: data.created_by
      } : {
        logo_light_url: '',
        logo_dark_url: '',
        email_logo_url: '',
        favicon_source_url: '',
        logo_width: 120,
        logo_height: 40
      };

      console.log('Setting logo data:', logoData);
      setLogoSettings(logoData);
      saveToCache(logoData);

    } catch (err: any) {
      console.error('Error loading logo settings:', err);
      
      // Only show error if not background loading and no cache available
      if (!background && !loadFromCache()) {
        const isNetworkError = err.message?.includes('fetch') || 
                              err.message?.includes('network') || 
                              err.message?.includes('timeout');
        
        toast({
          title: isNetworkError ? "Network issue" : "Loading error",
          description: isNetworkError ? 
            "Slow connection detected. Using default logos." : 
            "Failed to load logos. Please refresh the page.",
          variant: "destructive",
        });
      }
    } finally {
      if (!background) {
        setLoading(false);
      }
    }
  };

  const uploadLogo = async (file: File, theme: 'light' | 'dark' | 'email' | 'favicon') => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to upload logos.",
        variant: "destructive",
      });
      return null;
    }

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
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to save logo settings.",
        variant: "destructive",
      });
      return false;
    }

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

      if (logoSettings.id) {
        const { data, error } = await supabase
          .from('company_themes')
          .update(settingsToSave)
          .eq('id', logoSettings.id)
          .select()
          .single();

        if (error) throw error;
        setLogoSettings(prev => ({ ...prev, ...settings }));
      } else {
        const { data, error } = await supabase
          .from('company_themes')
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
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to remove logos.",
        variant: "destructive",
      });
      return false;
    }

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
    // Load from cache first for immediate display
    const hasCachedData = loadFromCache();
    
    // Always try to load fresh data
    loadLogoSettings(hasCachedData);
    
    // Background refresh every 30 minutes
    const refreshInterval = setInterval(() => {
      loadLogoSettings(true);
    }, 30 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, [loadFromCache, retryWithBackoff, saveToCache]);

  const refreshLogoSettings = useCallback(() => {
    loadLogoSettings(true);
  }, []);

  return {
    logoSettings,
    loading,
    uploading,
    loadLogoSettings: refreshLogoSettings,
    uploadLogo,
    saveLogoSettings,
    removeLogo
  };
}