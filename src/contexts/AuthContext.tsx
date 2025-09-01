import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useSecurityEnforcement } from '@/hooks/useSecurityEnforcement';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, username?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isSessionValid: boolean;
  securityStatus: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Session heartbeat interval
  const [heartbeatInterval, setHeartbeatInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Use security enforcement hook
  const { 
    isSessionValid, 
    securityStatus, 
    performSecureLogin 
  } = useSecurityEnforcement(user);

  useEffect(() => {
    let mounted = true;

    // Check for existing session FIRST
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      
      if (error) {
        console.error('Session check error:', error);
      }
      
      console.log('Initial session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Create session record if user is already logged in
      if (session?.user) {
        supabase.functions.invoke('session-management', {
          body: { action: 'create' }
        }).catch(error => {
          console.error('Failed to create initial session record:', error);
        });
      }
    });

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state change:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Only set loading to false after initial session check
        if (event !== 'INITIAL_SESSION') {
          setLoading(false);
        }
        
        // Handle additional logic after auth state changes
        if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          // Auto-assign admin role to admin@admin.com
          if (session.user.email === 'admin@admin.com') {
            assignAdminRole(session.user.id);
          }
          
          // Track user session using session-management edge function
          try {
            await supabase.functions.invoke('session-management', {
              body: { action: 'create' }
            });
          } catch (error) {
            console.error('Failed to track session:', error);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Set up session heartbeat for authenticated users
  useEffect(() => {
    if (user && session) {
      // Clear existing interval
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      
      // Send heartbeat every 5 minutes to keep session alive
      const interval = setInterval(async () => {
        try {
          const { data, error } = await supabase.functions.invoke('session-management', {
            body: {
              action: 'heartbeat'
            }
          });
          
          // Check if our session is still active
          if (error || (data && !data.session?.is_active)) {
            console.log('Session inactive, forcing logout...');
            await supabase.auth.signOut();
          }
        } catch (error) {
          console.error('Failed to send session heartbeat:', error);
          // If heartbeat fails consistently, assume session is dead
          await supabase.auth.signOut();
        }
      }, 5 * 60 * 1000); // 5 minutes
      
      setHeartbeatInterval(interval);
    } else {
      // Clear heartbeat when user logs out
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        setHeartbeatInterval(null);
      }
    }

    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
    };
  }, [user, session]);

  const assignAdminRole = async (userId: string) => {
    try {
      await supabase.from('user_roles').upsert({
        user_id: userId,
        customer_id: '22222222-2222-2222-2222-222222222222',
        role: 'admin'
      });
    } catch (error) {
      console.error('Error assigning admin role:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    // Try secure login first
    const result = await performSecureLogin(email, password);
    
    if (result.error) {
      console.log('Secure login failed, trying direct Supabase auth:', result.error);
      
      // Fallback to direct Supabase auth if secure login fails
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) {
          return { error: { message: error.message } };
        }
        
        console.log('Direct Supabase auth succeeded');
        return { error: null };
      } catch (directError: any) {
        console.error('Direct auth also failed:', directError);
        return { error: { message: directError.message || 'Login failed. Please try again.' } };
      }
    }
    
    return { error: null };
  };

  const signUp = async (email: string, password: string, username?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username: username || email.split('@')[0],
          full_name: username || email.split('@')[0]
        }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    isSessionValid,
    securityStatus
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};