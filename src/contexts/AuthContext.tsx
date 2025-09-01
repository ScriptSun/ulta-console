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
  
  // Use security enforcement hook
  const { 
    isSessionValid, 
    securityStatus, 
    performSecureLogin 
  } = useSecurityEnforcement(user);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Handle additional logic after auth state changes
        if (session?.user && event === 'SIGNED_IN') {
          setTimeout(async () => {
            // Auto-assign admin role to admin@admin.com
            if (session.user.email === 'admin@admin.com') {
              assignAdminRole(session.user.id);
            }
            
            // Track user session
            try {
              await supabase.rpc('track_user_session', {
                user_uuid: session.user.id,
                client_ip: null, // In production, you'd get this from request headers
                client_user_agent: navigator.userAgent
              });
            } catch (error) {
              console.error('Failed to track session:', error);
            }
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
    // Use secure login with attempt tracking and ban checking
    const result = await performSecureLogin(email, password);
    
    if (result.error) {
      return { error: { message: result.error } };
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