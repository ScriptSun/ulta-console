import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEnhancedSecurity } from '@/hooks/useEnhancedSecurity';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Shield, Lock, Eye, EyeOff, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function SecurityDemo() {
  const { validatePassword } = useEnhancedSecurity();
  const { user } = useAuth();
  const { toast } = useToast();
  const [testPassword, setTestPassword] = useState('');
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors: string[];
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Enhanced Security System Demo
          </CardTitle>
          <CardDescription>
            Test the password validation and security features that are now active in your system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>System Status:</strong> Enhanced security is now fully active! All login attempts, password validation, and account lockout policies are enforced based on your security settings.
            </AlertDescription>
          </Alert>

          {/* Password Validation Test */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-password">Test Password Validation</Label>
              <div className="relative">
                <Input
                  id="test-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter a password to test against security policies"
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
                onClick={handleTestPassword} 
                disabled={testing || !testPassword}
                className="flex items-center gap-2"
              >
                <Lock className="h-4 w-4" />
                {testing ? 'Testing...' : 'Test Password'}
              </Button>
              {validationResult && (
                <Button 
                  variant="outline" 
                  onClick={clearTest}
                >
                  Clear
                </Button>
              )}
            </div>

            {/* Validation Results */}
            {validationResult && (
              <Alert className={validationResult.valid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                {validationResult.valid ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription>
                  <div className={`font-medium ${validationResult.valid ? 'text-green-800' : 'text-red-800'}`}>
                    {validationResult.valid ? 'Password meets all security requirements!' : 'Password does not meet security requirements:'}
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
            <h4 className="font-medium text-blue-900">How to Test:</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Try passwords that are too short (less than 8 characters)</li>
              <li>Test passwords without special characters if required</li>
              <li>Attempt login with wrong credentials multiple times to trigger lockout</li>
              <li>Modify security settings and see immediate effects</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}