import { useState } from 'react';
import { Navigate } from 'react-router-dom';
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

const Auth = () => {
  const { user, signIn, loading } = useAuth();
  const { toast } = useToast();
  const { logoSettings } = useCompanyLogo();
  const { theme } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Redirect if already authenticated
  if (user && !loading) {
    return <Navigate to="/dashboard" replace />;
  }

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

    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        title: 'Sign In Failed',
        description: error.message || 'Invalid email or password',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Welcome back!',
        description: 'You have been signed in successfully.',
      });
    }
    
    setIsSubmitting(false);
  };

  const handleForgotPassword = () => {
    toast({
      title: 'Feature Coming Soon',
      description: 'Password reset functionality will be available soon.',
    });
  };

  const logoUrl = theme === 'dark' ? logoSettings.logo_dark_url : logoSettings.logo_light_url;

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
                    className="h-16 w-16 object-contain rounded-2xl"
                  />
                ) : (
                  <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">A</span>
                  </div>
                )}
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">Welcome back,</h1>
            </div>

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
                onClick={handleForgotPassword}
                className="text-purple-600 hover:text-purple-800 text-sm font-medium"
              >
                Forgotten password?
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;