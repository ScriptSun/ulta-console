import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEnhancedSecurity } from '@/hooks/useEnhancedSecurity';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Shield, Lock, Eye, EyeOff, CheckCircle, AlertTriangle, Info, UserX, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { buildApiUrl, apiEndpoints } from '@/lib/supabaseConfig';

export function SecurityDemo() {
  const { validatePassword, performSecureLogin } = useEnhancedSecurity();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Password validation states
  const [testPassword, setTestPassword] = useState('');
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors: string[];
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  
  // Login test states
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [loginTestPassword, setLoginTestPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginTesting, setLoginTesting] = useState(false);
  const [loginResult, setLoginResult] = useState<any>(null);

  const handleTestLogin = async () => {
    if (!testEmail || !loginTestPassword) {
      toast({
        title: "Fields Required",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }

    setLoginTesting(true);
    try {
      const result = await performSecureLogin(testEmail, loginTestPassword);
      setLoginResult(result);
      
      if (result.error) {
        toast({
          title: "Login Test Result",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login Test Successful",
          description: "Test login succeeded!",
        });
      }
    } catch (error) {
      console.error('Login test error:', error);
      toast({
        title: "Test Error",
        description: "Failed to test login. Please try again.",
        variant: "destructive",
      });
    }
    setLoginTesting(false);
  };

  const handleResetAttempts = async () => {
    try {
      const session = await supabase.auth.getSession();
      const response = await fetch(buildApiUrl(`${apiEndpoints.functions}/auth-security-enhanced`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'reset_attempts',
          email: testEmail
        }),
      });

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: "Attempts Reset",
        description: "Failed login attempts have been cleared for this email.",
      });
      
      setLoginResult(null);
    } catch (error) {
      console.error('Reset attempts error:', error);
      toast({
        title: "Reset Error",
        description: "Failed to reset attempts. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTestPassword = async () => {
    if (!testPassword) {
      toast({
        title: "Password Required",
        description: "Please enter a password to test",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    try {
      const result = await validatePassword(testPassword);
      setValidationResult(result);
      
      if (result.valid) {
        toast({
          title: "Password Valid",
          description: "Password meets all security requirements!",
        });
      } else {
        toast({
          title: "Password Invalid",
          description: `Password fails ${result.errors.length} security requirement(s)`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Password validation error:', error);
      toast({
        title: "Validation Error",
        description: "Failed to validate password. Please try again.",
        variant: "destructive",
      });
    }
    setTesting(false);
  };

  const clearTest = () => {
    setTestPassword('');
    setValidationResult(null);
  };

  const clearLoginTest = () => {
    setLoginTestPassword('');
    setLoginResult(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Enhanced Security System Demo
          </CardTitle>
          <CardDescription>
            Test all security policies including password validation, login attempts, and account lockouts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>System Status:</strong> Enhanced security is now fully active! All policies from your security settings are enforced in real-time.
            </AlertDescription>
          </Alert>

          {/* Unified Security Testing */}
          <div className="space-y-4">
            <h4 className="font-medium text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Testing
            </h4>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="test-input">Test Password or Login (email:password format)</Label>
                <div className="relative">
                  <Input
                    id="test-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password OR email:password (e.g., test@example.com:wrongpass)"
                    value={testPassword}
                    onChange={(e) => setTestPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    if (testPassword.includes(':')) {
                      const [email, password] = testPassword.split(':');
                      setTestEmail(email);
                      setLoginTestPassword(password);
                      handleTestLogin();
                    } else {
                      handleTestPassword();
                    }
                  }} 
                  disabled={testing || loginTesting || !testPassword}
                  className="flex items-center gap-2"
                >
                  <Shield className="h-4 w-4" />
                  {testing || loginTesting ? 'Testing...' : 'Test Security'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleResetAttempts}
                  disabled={!testEmail}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset Attempts
                </Button>
                {(validationResult || loginResult) && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      clearTest();
                      clearLoginTest();
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Results */}
            {validationResult && (
              <Alert className={validationResult.valid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                {validationResult.valid ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription>
                  <div className={`font-medium ${validationResult.valid ? 'text-green-800' : 'text-red-800'}`}>
                    Password Policy: {validationResult.valid ? 'Valid ✓' : 'Invalid ✗'}
                  </div>
                  {!validationResult.valid && validationResult.errors.length > 0 && (
                    <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                      {validationResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {loginResult && (
              <Alert className={loginResult.error ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
                {loginResult.error ? (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
                <AlertDescription>
                  <div className={`font-medium ${loginResult.error ? 'text-red-800' : 'text-green-800'}`}>
                    Login Security: {loginResult.error ? 'Failed ✗' : 'Success ✓'}
                  </div>
                  {loginResult.error && (
                    <div className="mt-2 text-sm text-red-700">
                      <p>{loginResult.error}</p>
                      {typeof loginResult.attempts_remaining === 'number' && (
                        <p className="mt-1">
                          <strong>Attempts remaining:</strong> {loginResult.attempts_remaining}
                        </p>
                      )}
                      {loginResult.locked_until && (
                        <p className="mt-1">
                          <strong>Account locked until:</strong> {new Date(loginResult.locked_until).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Current Security Features */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700">Active Security Features:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" />
                Password Policy Enforcement
              </div>
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" />
                Failed Login Tracking
              </div>
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" />
                Account Lockout Protection
              </div>
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" />
                Session Timeout Management
              </div>
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" />
                Enhanced Login Security
              </div>
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" />
                Real-time Security Monitoring
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900">How to Test Security Policies:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
              <div>
                <p className="font-medium mb-2">Password Testing:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Try passwords shorter than required length</li>
                  <li>Test without special characters (if required)</li>
                  <li>Test without numbers (if required)</li>
                  <li>Check minimum length enforcement</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-2">Login Security Testing:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Use wrong password to trigger failed attempts</li>
                  <li>Exceed max attempts to test account lockout</li>
                  <li>Wait for lockout period to expire</li>
                  <li>Reset attempts to clear lockout</li>
                </ul>
              </div>
            </div>
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-blue-900">
                <strong>Note:</strong> All settings from your Security Settings page are applied here. Changes take effect immediately.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}