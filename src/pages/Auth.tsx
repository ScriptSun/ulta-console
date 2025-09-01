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
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 30%, #c084fc 70%, #a855f7 100%)',
      }}
    >
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.6'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3Ccircle cx='37' cy='37' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      
      <div className="w-full max-w-md relative z-10">
        <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
          <CardContent className="p-8">
            {/* Logo Section */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-6">
                {logoUrl ? (
                  <img
                    src={`${logoUrl}?t=${Date.now()}`}
                    alt="Company Logo"
                    className="h-16 w-auto object-contain"
                  />
                ) : (
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <ArrowLeft className="h-8 w-8 text-blue-600 rotate-180" />
                  </div>
                )}
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Login</h1>
              <p className="text-gray-600 text-sm">
                Enter your credentials to log back in
              </p>
            </div>

            <form onSubmit={handleSignIn} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="signin-email"
                    name="email"
                    type="email"
                    placeholder="Email"
                    required
                    className="pl-10 h-12 bg-gray-50 border-gray-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-blue-500"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="signin-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    required
                    className="pl-10 pr-10 h-12 bg-gray-50 border-gray-200 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-blue-500"
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

              {/* Remember Me and Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <Label htmlFor="remember" className="text-sm text-gray-600">
                    Remember me
                  </Label>
                </div>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  forgot password ?
                </button>
              </div>

              {/* Login Button */}
              <Button 
                type="submit" 
                className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  'login'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;