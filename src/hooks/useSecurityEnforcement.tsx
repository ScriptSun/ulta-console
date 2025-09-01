import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/components/ui/use-toast';

interface SecurityStatus {
  is_banned: boolean;
  ban_reason?: string;
  failed_login_count: number;
  session_expires_at?: string;
}

interface UseSecurityEnforcementReturn {
  isSessionValid: boolean;
  securityStatus: SecurityStatus | null;
  checkSession: () => Promise<boolean>;
  checkBanStatus: () => Promise<SecurityStatus | null>;
  performSecureLogin: (email: string, password: string) => Promise<{ user?: User; session?: any; error?: string; }>;
  loading: boolean;
}

export function useSecurityEnforcement(user: User | null): UseSecurityEnforcementReturn {
  const [isSessionValid, setIsSessionValid] = useState(true);
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Check session validity and extend if valid
  const checkSession = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.functions.invoke('auth-security', {
        body: {
          action: 'check_session',
          user_id: user.id
        }
      });

      if (error) throw error;

      const isValid = data.valid;
      setIsSessionValid(isValid);

      if (!isValid) {
        if (data.is_banned) {
          toast({
            title: 'Account Banned',
            description: 'Your account has been banned due to security violations.',
            variant: 'destructive',
          });
        } else if (data.session_expired) {
          toast({
            title: 'Session Expired',
            description: 'Your session has expired. Please log in again.',
            variant: 'destructive',
          });
        }
        
        // Sign out user if session is invalid
        await supabase.auth.signOut();
      }

      return isValid;
    } catch (error) {
      console.error('Session check failed:', error);
      setIsSessionValid(false);
      return false;
    }
  }, [user, toast]);

  // Check user ban status
  const checkBanStatus = useCallback(async (): Promise<SecurityStatus | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase.functions.invoke('auth-security', {
        body: {
          action: 'check_ban_status',
          user_id: user.id
        }
      });

      if (error) throw error;

      const status = data.security_status;
      setSecurityStatus(status);
      return status;
    } catch (error) {
      console.error('Ban status check failed:', error);
      return null;
    }
  }, [user]);

  // Perform login with security checks
  const performSecureLogin = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      // Get client info for tracking
      const userAgent = navigator.userAgent;
      
      // Use edge function for secure login with tracking
      const { data, error } = await supabase.functions.invoke('auth-security', {
        body: {
          action: 'login',
          email,
          password,
          user_agent: userAgent
        }
      });

      if (error) throw error;

      if (data.error) {
        if (data.is_banned) {
          return { 
            error: `Account banned: ${data.ban_reason}` 
          };
        }
        
        const attemptsMsg = data.attempts_remaining > 0 
          ? ` ${data.attempts_remaining} attempts remaining.` 
          : ' Account will be banned after next failed attempt.';
          
        return { 
          error: `${data.error}.${attemptsMsg}` 
        };
      }

      // CRITICAL: Edge function succeeded, now set the session on the client
      if (data.success && data.user && data.session) {
        console.log('Edge function login successful, setting client session...');
        
        // Use Supabase's setSession to properly authenticate the client
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });
        
        if (sessionError) {
          console.error('Failed to set client session:', sessionError);
          return { error: 'Failed to establish session' };
        }
        
        return { 
          user: data.user, 
          session: data.session 
        };
      }

      return { error: 'Invalid response from authentication service' };
    } catch (error) {
      console.error('Secure login failed:', error);
      return { error: 'Login failed. Please try again.' };
    } finally {
      setLoading(false);
    }
  }, []);

  // Set up automatic session checking
  useEffect(() => {
    if (!user) return;

    // Initial checks
    checkSession();
    checkBanStatus();

    // Set up periodic session checking (every 5 minutes)
    const sessionInterval = setInterval(checkSession, 5 * 60 * 1000);

    return () => {
      clearInterval(sessionInterval);
    };
  }, [user, checkSession, checkBanStatus]);

  return {
    isSessionValid,
    securityStatus,
    checkSession,
    checkBanStatus,
    performSecureLogin,
    loading
  };
}