import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface SecurityStatus {
  is_banned: boolean;
  ban_reason?: string;
  banned_until?: string;
  failed_login_count: number;
  session_expires_at?: string;
  last_successful_login?: string;
  last_failed_login?: string;
}

interface LoginResult {
  user: User | null;
  session: Session | null;
  error?: string;
  attempts_remaining?: number;
  locked_until?: string;
  ban_reason?: string;
}

interface PasswordValidation {
  valid: boolean;
  errors: string[];
}

export function useEnhancedSecurity() {
  const [isSessionValid, setIsSessionValid] = useState<boolean>(true);
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [loading, setLoading] = useState(false);

  // Check session validity periodically
  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await checkSessionValidity(user.id);
      }
    };

    // Check immediately
    checkSession();

    // Check every 5 minutes
    const interval = setInterval(checkSession, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const checkSessionValidity = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('auth-security-enhanced', {
        body: {
          action: 'check_session',
          user_id: userId
        }
      });

      if (error) {
        console.error('Session check error:', error);
        return false;
      }

      const isValid = data?.valid === true;
      setIsSessionValid(isValid);

      if (!isValid) {
        if (data?.reason === 'banned' || data?.reason === 'session_expired') {
          await supabase.auth.signOut();
        }
      }

      return isValid;
    } catch (error) {
      console.error('Session validity check failed:', error);
      setIsSessionValid(false);
      return false;
    }
  };

  const checkBanStatus = async (userId: string): Promise<SecurityStatus | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('auth-security-enhanced', {
        body: {
          action: 'check_ban_status',
          user_id: userId
        }
      });

      if (error) {
        console.error('Ban status check error:', error);
        return null;
      }

      const status = data?.security_status;
      setSecurityStatus(status);
      return status;
    } catch (error) {
      console.error('Ban status check failed:', error);
      return null;
    }
  };

  const performSecureLogin = async (
    email: string, 
    password: string, 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<LoginResult> => {
    try {
      setLoading(true);

      console.log('Calling auth-security-enhanced function...');
      
      const response = await supabase.functions.invoke('auth-security-enhanced', {
        body: {
          action: 'login',
          email,
          password,
          ip_address: ipAddress,
          user_agent: userAgent || navigator.userAgent
        }
      }).catch(error => {
        console.error('Edge function call failed:', error);
        // If edge function fails, fallback to regular Supabase auth
        console.log('Falling back to regular Supabase auth...');
        return supabase.auth.signInWithPassword({ email, password });
      });

      console.log('=== COMPLETE RESPONSE DEBUG ===');
      console.log('Full response object:', response);
      console.log('Response type:', typeof response);
      console.log('Response keys:', Object.keys(response || {}));
      console.log('response.data:', response.data);
      console.log('response.data type:', typeof response.data);
      console.log('response.error:', response.error);
      console.log('=== END RESPONSE DEBUG ===');

      if (response.error) {
        console.error('Function invocation error:', response.error);
        return {
          user: null,
          session: null,
          error: response.error.message || 'Login failed'
        };
      }

      // Handle the case where data might be null/undefined
      let data = response.data;
      
      // If data is null but we have no error, there might be a parsing issue
      if (!data) {
        console.error('Response data is null/undefined despite no error');
        return {
          user: null,
          session: null,
          error: 'Invalid response format from authentication service'
        };
      }

      // Check if the response contains an error (business logic error)
      if (data.error) {
        console.log('Business logic error:', data.error);
        return {
          user: null,
          session: null,
          error: data.error,
          attempts_remaining: data.attempts_remaining,
          locked_until: data.locked_until,
          ban_reason: data.ban_reason
        };
      }

      // Comprehensive data validation
      console.log('=== DATA VALIDATION DEBUG ===');
      console.log('data:', data);
      console.log('data type:', typeof data);
      console.log('data is object:', typeof data === 'object' && data !== null);
      console.log('data keys:', data ? Object.keys(data) : 'NO DATA');
      
      // Check user
      console.log('data.user exists:', 'user' in (data || {}));
      console.log('data.user:', data?.user);
      console.log('data.user type:', typeof data?.user);
      
      // Check session
      console.log('data.session exists:', 'session' in (data || {}));
      console.log('data.session:', data?.session);
      console.log('data.session type:', typeof data?.session);
      
      if (data?.session) {
        console.log('session keys:', Object.keys(data.session));
        console.log('access_token exists:', 'access_token' in data.session);
        console.log('refresh_token exists:', 'refresh_token' in data.session);
        console.log('access_token:', data.session.access_token ? '[TOKEN PRESENT]' : 'MISSING');
        console.log('refresh_token:', data.session.refresh_token ? '[TOKEN PRESENT]' : 'MISSING');
      }
      console.log('=== END DATA VALIDATION DEBUG ===');

      // More robust validation
      const hasValidUser = data?.user && typeof data.user === 'object' && data.user.id;
      const hasValidSession = data?.session && typeof data.session === 'object';
      const hasAccessToken = data?.session?.access_token && typeof data.session.access_token === 'string' && data.session.access_token.length > 0;
      const hasRefreshToken = data?.session?.refresh_token && typeof data.session.refresh_token === 'string' && data.session.refresh_token.length > 0;

      console.log('Final validation results:', {
        hasValidUser,
        hasValidSession,
        hasAccessToken,
        hasRefreshToken
      });

      if (hasValidUser && hasValidSession && hasAccessToken && hasRefreshToken) {
        console.log('All validations passed - setting session...');

        const sessionResult = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });

        console.log('SetSession result:', sessionResult);

        if (sessionResult.error) {
          console.error('Failed to set session:', sessionResult.error);
          return {
            user: null,
            session: null,
            error: 'Failed to establish session: ' + sessionResult.error.message
          };
        }

        console.log('Session set successfully - login complete');
        return {
          user: data.user,
          session: data.session
        };
      }

      // Build detailed error message
      const missingItems = [];
      if (!hasValidUser) missingItems.push('valid user object');
      if (!hasValidSession) missingItems.push('valid session object');
      if (!hasAccessToken) missingItems.push('access_token');
      if (!hasRefreshToken) missingItems.push('refresh_token');

      const errorMsg = `Authentication data validation failed. Missing: ${missingItems.join(', ')}`;
      console.error(errorMsg);
      
      return {
        user: null,
        session: null,
        error: errorMsg
      };
    } catch (error) {
      console.error('Secure login exception:', error);
      return {
        user: null,
        session: null,
        error: 'Login failed due to an unexpected error: ' + (error as Error).message
      };
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = async (password: string): Promise<PasswordValidation> => {
    try {
      const { data, error } = await supabase.functions.invoke('auth-security-enhanced', {
        body: {
          action: 'validate_password',
          password
        }
      });

      if (error) {
        console.error('Password validation error:', error);
        return {
          valid: false,
          errors: ['Password validation failed']
        };
      }

      return data?.validation || {
        valid: false,
        errors: ['Unknown validation error']
      };
    } catch (error) {
      console.error('Password validation failed:', error);
      return {
        valid: false,
        errors: ['Password validation failed due to network error']
      };
    }
  };

  const unbanUser = async (userId: string, email: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('auth-security-enhanced', {
        body: {
          action: 'unban_user',
          user_id: userId,
          email
        }
      });

      if (error) {
        console.error('Unban user error:', error);
        return false;
      }

      return data?.success === true;
    } catch (error) {
      console.error('Unban user failed:', error);
      return false;
    }
  };

  return {
    isSessionValid,
    securityStatus,
    loading,
    checkSessionValidity,
    checkBanStatus,
    performSecureLogin,
    validatePassword,
    unbanUser
  };
}