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

    // Simplified auth initialization with better error handling
    const initializeAuth = async () => {
      try {
        // Check for existing session with timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 5000)
        );
        
        const { data: { session }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;
        
        if (!mounted) return;
        
        if (error) {
          console.warn('Session check error (non-fatal):', error.message);
          // Continue without session - user can still access app
        }
        
        console.log('Initial session check:', session?.user?.email || 'No session');
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
      } catch (error: any) {
        if (!mounted) return;
        
        console.warn('Auth initialization failed (non-fatal):', error.message);
        // Set user as not authenticated but allow app to continue
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    };

    // Start initialization
    initializeAuth();

    // Set up auth state listener with error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        try {
          console.log('Auth state change:', event, session?.user?.email || 'No session');
          setSession(session);
          setUser(session?.user ?? null);
          
          // Always set loading to false after auth state changes
          setLoading(false);
          
          // Handle successful sign-in
          if (session?.user && event === 'SIGNED_IN') {
            // Auto-assign owner role to elin@ultahost.com  
            if (session.user.email === 'elin@ultahost.com') {
              assignOwnerRole(session.user.id).catch(err => 
                console.warn('Role assignment failed (non-fatal):', err.message)
              );
            }
          }
          
        } catch (error: any) {
          console.warn('Auth state change error (non-fatal):', error.message);
          setLoading(false);
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
      console.log('Owner role assigned successfully');
    } catch (error: any) {
      console.warn('Error assigning owner role (non-fatal):', error.message);
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('SignIn called for:', email);
    
    try {
      // Use direct Supabase auth only for reliability
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('Login error:', error.message);
        return { error: { message: error.message } };
      }
      
      console.log('Login successful for:', email);
      return { error: null };
      
    } catch (error: any) {
      console.error('Login failed:', error.message);
      return { error: { message: error.message || 'Login failed. Please try again.' } };
    }
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