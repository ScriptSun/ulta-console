import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCompanyLogo } from '@/hooks/useCompanyLogo';
import { useTheme } from 'next-themes';
import { Loader2, Mail, Lock, Building, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const { user, signIn, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logoSettings } = useCompanyLogo();
  const { theme } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  // Force redirect for authenticated users
  useEffect(() => {
    if (user && !loading) {
      console.log('Authenticated user detected, redirecting to dashboard:', user.email);
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  // Additional redirect check for session
  useEffect(() => {
    const checkSessionAndRedirect = async () => {
      if (!loading) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log('Session found, redirecting to dashboard:', session.user.email);
          navigate('/dashboard', { replace: true });
        }
      }
    };
    
    checkSessionAndRedirect();
  }, [loading, navigate]);

  // Show "Go to Dashboard" button if user is authenticated but still on auth page
  const showDashboardButton = user && !loading;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    console.log('Attempting login for:', email);
    const { error } = await signIn(email, password);
    
    if (error) {
      console.log('Login failed:', error.message);
      toast({
        title: 'Sign In Failed',
        description: error.message || 'Invalid email or password',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    } else {
      console.log('Login successful! Attempting redirect...');
      
      // Show success message
      toast({
        title: 'Welcome back!',
        description: 'Redirecting to dashboard...',
      });
      
      // Try multiple redirect methods
      try {
        // Method 1: React Router navigate
        console.log('Trying React Router navigate...');
        navigate('/dashboard', { replace: true });
        
        // Method 2: Fallback with window.location (in case React Router fails)
        setTimeout(() => {
          if (window.location.pathname === '/auth') {
            console.log('React Router failed, using window.location...');
            window.location.href = '/dashboard';
          }
        }, 100);
        
      } catch (navError) {
        console.error('Navigation error:', navError);
        // Method 3: Direct window location as last resort
        window.location.href = '/dashboard';
      }
    }
  };

  const handleForgotPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!resetEmail) {
      toast({
        title: 'Email Required',
        description: 'Please enter your email address.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('password-reset', {
        body: {
          email: resetEmail,
          action: 'request'
        }
      });

      if (error) throw error;

      toast({
        title: 'Reset Link Sent',
        description: 'If this email exists, a password reset link has been sent to your email.',
      });
      
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: 'Reset Failed',
        description: error.message || 'Failed to send reset email. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });

      if (error) {
        console.error('Google OAuth error:', error);
        toast({
          title: 'Google Sign In Failed',
          description: error.message,
          variant: 'destructive',
        });
        setIsSubmitting(false);
      }
      // Don't set loading to false here for OAuth - it will redirect
    } catch (err: any) {
      console.error('Google OAuth exception:', err);
      toast({
        title: 'Google Sign In Failed',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  const logoUrl = theme === 'dark' ? logoSettings.logo_dark_url : logoSettings.logo_light_url;
  
  console.log('Theme:', theme, 'Logo settings:', logoSettings, 'Logo URL:', logoUrl);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-sm relative z-10">
        <Card className="border-0 shadow-lg bg-white">
          <CardContent className="p-8">
            {/* Logo Section */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-6">
                {logoUrl ? (
                  <img
                    src={`${logoUrl}?t=${Date.now()}`}
                    alt="Company Logo"
                    className="h-24 w-24 object-contain rounded-2xl"
                  />
                ) : (
                  <div className="w-24 h-24 bg-purple-600 rounded-2xl flex items-center justify-center">
                    <span className="text-white text-3xl font-bold">A</span>
                  </div>
                )}
              </div>
              
              {showForgotPassword ? (
                <div>
                  <div className="flex items-center mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowForgotPassword(false)}
                      className="p-0 h-auto text-purple-600 hover:text-purple-700"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Sign In
                    </Button>
                  </div>
                  <h1 className="text-2xl font-semibold text-gray-900 mb-2">Reset Password</h1>
                  <p className="text-gray-600 text-sm mb-6">
                    Enter your email address and we'll send you a reset link.
                  </p>
                </div>
              ) : (
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 mb-2">Welcome back,</h1>
                  <p className="text-gray-600 text-sm mb-6">
                    Don't have an account?{' '}
                    <a href="#" className="text-purple-600 hover:text-purple-700 font-medium">
                      Sign up here
                    </a>
                  </p>
                </div>
              )}
            </div>

            {showForgotPassword ? (
              /* Forgot Password Form */
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-1">
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="Enter your email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    className="h-12 bg-gray-50 border-gray-200 rounded-lg focus:bg-white focus:border-purple-500 focus:ring-purple-500 text-base"
                    disabled={isSubmitting}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-base mt-6"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Reset Link...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </form>
            ) : (
              /* Login Form */
              <div>
                {/* Show manual dashboard access if user is authenticated */}
                {showDashboardButton && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                    <p className="text-green-700 text-sm mb-3">
                      You're already signed in! Click below to access your dashboard.
                    </p>
                    <Button
                      onClick={() => navigate('/dashboard')}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      Go to Dashboard
                    </Button>
                  </div>
                )}

                {!showDashboardButton && (
                  <>
                    {/* Google Auth Button */}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 mb-4 border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium"
                      onClick={handleGoogleSignIn}
                      disabled={isSubmitting}
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continue with Google
                    </Button>

                    {/* Divider */}
                    <div className="text-center text-gray-500 text-sm mb-4">Or</div>

                    <form onSubmit={handleSignIn} className="space-y-4">
                      {/* Email Field */}
                      <div className="space-y-1">
                        <Input
                          id="signin-email"
                          name="email"
                          type="email"
                          placeholder="Email"
                          required
                          className="h-12 bg-gray-50 border-gray-200 rounded-lg focus:bg-white focus:border-purple-500 focus:ring-purple-500 text-base"
                          disabled={isSubmitting}
                        />
                      </div>

                      {/* Password Field */}
                      <div className="space-y-1">
                        <div className="relative">
                          <Input
                            id="signin-password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Password"
                            required
                            className="h-12 bg-gray-50 border-gray-200 rounded-lg focus:bg-white focus:border-purple-500 focus:ring-purple-500 text-base pr-10"
                            disabled={isSubmitting}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Login Button */}
                      <Button 
                        type="submit" 
                        className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-base mt-6"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing In...
                          </>
                        ) : (
                          'Login'
                        )}
                      </Button>
                    </form>

                    {/* Forgot Password */}
                    <div className="text-center mt-6">
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                      >
                        Forgotten password?
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;