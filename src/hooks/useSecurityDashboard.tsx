import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SecurityDashboardData {
  activeSessions: number;
  apiKeys: number;
  failedLogins: number;
  securityScore: string;
  loading: boolean;
  error: string | null;
}

export function useSecurityDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<SecurityDashboardData>({
    activeSessions: 0,
    apiKeys: 0,
    failedLogins: 0,
    securityScore: 'A+',
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!user) return;
    
    fetchSecurityData();
  }, [user]);

  const fetchSecurityData = async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Fetch active sessions (last 24 hours)
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('user_sessions')
        .select('id')
        .eq('is_active', true)
        .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (sessionsError) throw sessionsError;

      // Fetch active API keys
      const { data: apiKeysData, error: apiKeysError } = await supabase
        .from('api_keys')
        .select('id')
        .eq('status', 'active');

      if (apiKeysError) throw apiKeysError;

      // Fetch failed login attempts (last 24 hours)
      const { data: failedLoginsData, error: failedLoginsError } = await supabase
        .from('user_login_attempts')
        .select('id')
        .eq('success', false)
        .gte('attempted_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (failedLoginsError) throw failedLoginsError;

      // Calculate security score based on various factors
      const activeSessions = sessionsData?.length || 0;
      const apiKeys = apiKeysData?.length || 0;
      const failedLogins = failedLoginsData?.length || 0;

      let securityScore = 'A+';
      let scorePoints = 100;

      // Deduct points for security concerns
      if (failedLogins > 10) scorePoints -= 20;
      else if (failedLogins > 5) scorePoints -= 10;
      
      if (apiKeys > 10) scorePoints -= 5; // Too many API keys might be a concern
      if (activeSessions > 50) scorePoints -= 5; // Too many active sessions

      // Determine letter grade
      if (scorePoints >= 95) securityScore = 'A+';
      else if (scorePoints >= 90) securityScore = 'A';
      else if (scorePoints >= 85) securityScore = 'A-';
      else if (scorePoints >= 80) securityScore = 'B+';
      else if (scorePoints >= 75) securityScore = 'B';
      else if (scorePoints >= 70) securityScore = 'B-';
      else if (scorePoints >= 65) securityScore = 'C+';
      else if (scorePoints >= 60) securityScore = 'C';
      else securityScore = 'D';

      setData({
        activeSessions,
        apiKeys,
        failedLogins,
        securityScore,
        loading: false,
        error: null,
      });

    } catch (error: any) {
      console.error('Error fetching security dashboard data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to fetch security data',
      }));
    }
  };

  const refreshData = () => {
    fetchSecurityData();
  };

  return { ...data, refreshData };
}