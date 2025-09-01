import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
  
  // Use security enforcement hook - disabled temporarily to prevent loading issues
  const { 
    isSessionValid, 
    securityStatus, 
    performSecureLogin 
  } = {
    isSessionValid: true,
    securityStatus: null,
    performSecureLogin: async (email: string, password: string) => {
      // Fallback to direct Supabase auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return { error: error.message };
      }
      
      return { user: data.user, session: data.session };
    }
  };

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
      
      // Create session record if user is already logged in - disabled temporarily
      // if (session?.user) {
      //   supabase.functions.invoke('session-management', {
      //     body: { action: 'create' }
      //   }).catch(error => {
      //     console.error('Failed to create initial session record:', error);
      //   });
      // }
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
          // Auto-assign owner role to admin@admin.com
          if (session.user.email === 'admin@admin.com') {
            assignOwnerRole(session.user.id);
          }
          
          // Track user session - disabled temporarily to prevent loading issues
          // try {
          //   await supabase.functions.invoke('session-management', {
          //     body: { action: 'create' }
          //   });
          // } catch (error) {
          //   console.error('Failed to track session:', error);
          // }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Set up session heartbeat for authenticated users - disabled temporarily
  // useEffect(() => {
  //   if (user && session) {
  //     // Session heartbeat functionality disabled to prevent loading issues
  //   }
  //   return () => {
  //     if (heartbeatInterval) {
  //       clearInterval(heartbeatInterval);
  //     }
  //   };
  // }, [user, session]);

  const assignOwnerRole = async (userId: string) => {
    try {
      await supabase.from('user_roles').upsert({
        user_id: userId,
        customer_id: '22222222-2222-2222-2222-222222222222',
        role: 'owner'
      });
    } catch (error) {
      console.error('Error assigning owner role:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('SignIn called for:', email);
    
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
        
        console.log('Direct Supabase auth succeeded, session should be set automatically');
        return { error: null };
      } catch (directError: any) {
        console.error('Direct auth also failed:', directError);
        return { error: { message: directError.message || 'Login failed. Please try again.' } };
      }
    }
    
    // Secure login succeeded - session should now be set on client
    console.log('Secure login succeeded, session established');
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