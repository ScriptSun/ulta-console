import { useState, useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useCompanyLogo } from '@/hooks/useCompanyLogo';
import { useTheme } from 'next-themes';
import { Loader2, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api-wrapper';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { logoSettings } = useCompanyLogo();
  const { theme } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [isValidating, setIsValidating] = useState(true);

  // Get tokens from URL - check both search params and hash fragments
  const getTokensFromUrl = () => {
    console.log('Current URL:', window.location.href);
    console.log('Hash:', window.location.hash);
    console.log('Search:', window.location.search);
    
    // First try hash fragments (this is where Supabase usually puts them)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    let accessToken = hashParams.get('access_token');
    let refreshToken = hashParams.get('refresh_token');
    let type = hashParams.get('type');

    console.log('Hash tokens:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type });

    // If not in hash, try search params as fallback
    if (!accessToken || !refreshToken) {
      accessToken = searchParams.get('access_token');
      refreshToken = searchParams.get('refresh_token');
      type = searchParams.get('type');
      console.log('Search param tokens:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type });
    }

    return { accessToken, refreshToken, type };
  };

  const { accessToken, refreshToken, type } = getTokensFromUrl();

  useEffect(() => {
    const validateResetToken = async () => {
      console.log('Validating reset tokens:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type });
      console.log('Full URL:', window.location.href);
      
      // Handle Supabase auth callback first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Current session:', session, 'Session error:', sessionError);
      
      // If we have a session from Supabase redirect, we're good to proceed
      if (session?.user) {
        console.log('Valid session found from Supabase redirect');
        setIsTokenValid(true);
        setIsValidating(false);
        toast({
          title: 'Reset Link Verified',
          description: 'Please enter your new password below.',
        });
        return;
      }
      
      // If no session, check for tokens in URL
      if (!accessToken || !refreshToken || type !== 'recovery') {
        console.log('No valid tokens found:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type });
        setIsValidating(false);
        setIsTokenValid(false);
        toast({
          title: 'Invalid Reset Link',
          description: 'This password reset link is invalid or has expired. Please request a new one.',
          variant: 'destructive',
        });
        return;
      }

      try {
        console.log('Setting session with tokens...');
        
        // Set the session using the tokens from the URL
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        console.log('Session set result:', { data, error });

        if (error) {
          throw error;
        }

        console.log('Reset link verified successfully');
        setIsTokenValid(true);
        toast({
          title: 'Reset Link Verified',
          description: 'Please enter your new password below.',
        });
      } catch (error: any) {
        console.error('Token validation error:', error);
        setIsTokenValid(false);
        toast({
          title: 'Invalid Reset Link',
          description: 'This password reset link is invalid or has expired. Please request a new one.',
          variant: 'destructive',
        });
      } finally {
        setIsValidating(false);
      }
    };

    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('Validation timeout reached');
      setIsValidating(false);
      setIsTokenValid(false);
      toast({
        title: 'Validation Timeout',
        description: 'The reset link validation timed out. Please request a new reset link.',
        variant: 'destructive',
      });
    }, 15000); // 15 second timeout

    validateResetToken().finally(() => {
      clearTimeout(timeoutId);
    });

    return () => {
      clearTimeout(timeoutId);
    };
  }, [accessToken, refreshToken, type, toast]);

  const handlePasswordReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: 'Passwords Do Not Match',
        description: 'Please make sure both passwords are identical.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Password Too Short',
        description: 'Password must be at least 6 characters long.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      setIsSuccess(true);
      toast({
        title: 'Password Reset Successful',
        description: 'Your password has been updated successfully. You can now sign in with your new password.',
      });

      // Sign out the user to ensure they use the new password
      await supabase.auth.signOut();

    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: 'Reset Failed',
        description: error.message || 'Failed to reset password. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const logoUrl = theme === 'dark' ? logoSettings.logo_dark_url : logoSettings.logo_light_url;

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (!isTokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-md border-0 shadow-lg bg-white">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Invalid Reset Link</h2>
            <p className="text-gray-600 mb-6">
              This password reset link is invalid, expired, or has already been used.
            </p>
            <Link to="/auth">
              <Button className="w-full bg-purple-600 hover:bg-purple-700">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-md border-0 shadow-lg bg-white">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Password Reset Successful!</h2>
            <p className="text-gray-600 mb-6">
              Your password has been updated successfully. You can now sign in with your new password.
            </p>
            <Link to="/auth">
              <Button className="w-full bg-purple-600 hover:bg-purple-700">
                Sign In Now
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md relative z-10">
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
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">Reset Your Password</h1>
              <p className="text-gray-600 text-sm mb-6">
                Enter your new password below to complete the reset process.
              </p>
            </div>

            <form onSubmit={handlePasswordReset} className="space-y-4">
              {/* New Password Field */}
              <div className="space-y-1">
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="New Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 bg-input border-input-border rounded-lg focus:bg-background focus:border-ring focus:ring-ring text-base pr-10"
                    disabled={isSubmitting}
                    minLength={6}
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

              {/* Confirm Password Field */}
              <div className="space-y-1">
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-12 bg-input border-input-border rounded-lg focus:bg-background focus:border-ring focus:ring-ring text-base pr-10"
                    disabled={isSubmitting}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="text-xs text-gray-500 space-y-1">
                <p>Password requirements:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li className={password.length >= 6 ? 'text-green-600' : ''}>
                    At least 6 characters
                  </li>
                  <li className={password === confirmPassword && password.length > 0 ? 'text-green-600' : ''}>
                    Passwords match
                  </li>
                </ul>
              </div>

              {/* Reset Button */}
              <Button 
                type="submit" 
                className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-base mt-6"
                disabled={isSubmitting || password !== confirmPassword || password.length < 6}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>

            {/* Back to Sign In */}
            <div className="text-center mt-6">
              <Link 
                to="/auth"
                className="text-purple-600 hover:text-purple-800 text-sm font-medium"
              >
                <ArrowLeft className="inline mr-1 h-4 w-4" />
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;