import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserPreferences {
  email_alerts: boolean;
  system_updates: boolean;
  security_alerts: boolean;
  agent_notifications: boolean;
  theme_preference: string;
}

const defaultPreferences: UserPreferences = {
  email_alerts: true,
  system_updates: true,
  security_alerts: true,
  agent_notifications: false,
  theme_preference: 'system',
};

export function useUserPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreferences = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences({
          email_alerts: data.email_alerts,
          system_updates: data.system_updates,
          security_alerts: data.security_alerts,
          agent_notifications: data.agent_notifications,
          theme_preference: data.theme_preference,
        });
      } else {
        // Create default preferences for new user
        await savePreferences(defaultPreferences);
      }
    } catch (err: any) {
      console.error('Error loading user preferences:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newPreferences: UserPreferences) => {
    if (!user) return false;

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          ...newPreferences,
        });

      if (error) throw error;

      setPreferences(newPreferences);
      return true;
    } catch (err: any) {
      console.error('Error saving user preferences:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    const newPreferences = { ...preferences, [key]: value };
    const success = await savePreferences(newPreferences);
    return success;
  };

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  return {
    preferences,
    setPreferences,
    loading,
    error,
    loadPreferences,
    savePreferences,
    updatePreference,
  };
}