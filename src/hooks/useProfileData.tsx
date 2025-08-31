import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileData {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  created_at: string;
}

export function useProfileData() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
      } else {
        // Create default profile for new user
        const newProfile = {
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
          avatar_url: '',
        };
        
        await saveProfile(newProfile);
      }
    } catch (err: any) {
      console.error('Error loading profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async (profileData: Partial<ProfileData>) => {
    if (!user) return false;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('admin_profiles')
        .upsert({
          id: user.id,
          email: user.email || '',
          ...profileData,
        })
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      return true;
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateAvatar = async (file: File) => {
    if (!user) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      const success = await saveProfile({ avatar_url: publicUrl });
      return success ? publicUrl : null;
    } catch (err: any) {
      console.error('Error updating avatar:', err);
      setError(err.message);
      return null;
    }
  };

  useEffect(() => {
    if (user) {
      loadProfile();
    } else {
      setProfile(null);
    }
  }, [user]);

  return {
    profile,
    loading,
    error,
    loadProfile,
    saveProfile,
    updateAvatar,
    setProfile,
  };
}