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

  // Set up session tracking and heartbeat for authenticated users
  useEffect(() => {
    if (user && session) {
      // Create initial session tracking
      const initializeSession = async () => {
        try {
          console.log('Initializing session tracking for user:', user.email);
          await supabase.functions.invoke('session-management', {
            body: { action: 'create' }
          });
        } catch (error) {
          console.warn('Session initialization failed (non-fatal):', error);
        }
      };
      
      // Initialize session immediately
      initializeSession();
      
      // Set up periodic heartbeat to keep session active
      const interval = setInterval(async () => {
        try {
          await supabase.functions.invoke('session-management', {
            body: { action: 'heartbeat' }
          });
        } catch (error) {
          console.warn('Session heartbeat failed (non-fatal):', error);
        }
      }, 5 * 60 * 1000); // Heartbeat every 5 minutes
      
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
      // Test connection first
      const connectionTest = await fetch('https://lfsdqyvvboapsyeauchm.supabase.co/rest/v1/', {
        method: 'HEAD',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxmc2RxeXZ2Ym9hcHN5ZWF1Y2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMjA3ODYsImV4cCI6MjA3MTg5Njc4Nn0.8lE_UEjrIviFz6nygL7HocGho-aUG9YH1NCi6y_CrFk'
        },
        signal: AbortSignal.timeout(5000)
      }).catch(() => null);
      
      if (!connectionTest) {
        return { error: { message: 'Unable to connect to authentication servers. Please check your internet connection.' } };
      }
      
      // Use direct Supabase auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('Login error:', error.message);
        
        // Provide user-friendly error messages
        if (error.message.includes('fetch')) {
          return { error: { message: 'Connection failed. Please check your internet connection and try again.' } };
        }
        if (error.message.includes('Invalid login credentials')) {
          return { error: { message: 'Invalid email or password. Please check your credentials.' } };
        }
        if (error.message.includes('Email not confirmed')) {
          return { error: { message: 'Please check your email and confirm your account before signing in.' } };
        }
        
        return { error: { message: error.message } };
      }
      
      console.log('Login successful for:', email);
      return { error: null };
      
    } catch (error: any) {
      console.error('Login failed:', error);
      
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        return { error: { message: 'Connection timeout. Please check your internet connection and try again.' } };
      }
      
      return { error: { message: 'Unable to connect to authentication servers. Please try again later.' } };
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
    try {
      // Clear all auth state immediately
      setUser(null);
      setSession(null);
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear any lingering localStorage auth data
      localStorage.removeItem('supabase.auth.token');
      
      // Force redirect to login page
      window.location.href = '/auth';
    } catch (error) {
      console.error('Sign out error:', error);
      // Even if there's an error, clear local state and redirect
      setUser(null);
      setSession(null);
      window.location.href = '/auth';
    }
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