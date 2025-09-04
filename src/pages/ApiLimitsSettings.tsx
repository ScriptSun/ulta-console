import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { systemSettingsService } from '@/lib/systemSettingsService';
import { 
  Zap, 
  Clock, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Settings,
  ArrowLeft,
  Save,
  RotateCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ApiLimitsSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // API Rate Limits
  const [requestsPerMinute, setRequestsPerMinute] = useState('100');
  const [requestsPerHour, setRequestsPerHour] = useState('1000');
  const [requestsPerDay, setRequestsPerDay] = useState('10000');
  
  // Timeouts
  const [connectionTimeout, setConnectionTimeout] = useState('30');
  const [readTimeout, setReadTimeout] = useState('60');
  const [writeTimeout, setWriteTimeout] = useState('60');
  
  // Concurrent Limits
  const [maxConcurrentRequests, setMaxConcurrentRequests] = useState('50');
  const [maxConcurrentPerUser, setMaxConcurrentPerUser] = useState('10');
  
  // Features
  const [enableRateLimiting, setEnableRateLimiting] = useState(true);
  const [enableRequestLogging, setEnableRequestLogging] = useState(true);
  const [enableCircuitBreaker, setEnableCircuitBreaker] = useState(false);
  
  // Circuit Breaker Settings
  const [failureThreshold, setFailureThreshold] = useState('5');
  const [recoveryTimeout, setRecoveryTimeout] = useState('60');

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await systemSettingsService.getAPILimits();
        
        setRequestsPerMinute(settings.requests_per_minute.toString());
        setRequestsPerHour(settings.requests_per_hour.toString());
        setRequestsPerDay(settings.requests_per_day.toString());
        setConnectionTimeout(settings.connection_timeout.toString());
        setReadTimeout(settings.read_timeout.toString());
        setWriteTimeout(settings.write_timeout.toString());
        setMaxConcurrentRequests(settings.max_concurrent_requests.toString());
        setMaxConcurrentPerUser(settings.max_concurrent_per_user.toString());
        setEnableRateLimiting(settings.enable_rate_limiting);
        setEnableRequestLogging(settings.enable_request_logging);
        setEnableCircuitBreaker(settings.enable_circuit_breaker);
        setFailureThreshold(settings.failure_threshold.toString());
        setRecoveryTimeout(settings.recovery_timeout.toString());
      } catch (error) {
        console.error('Failed to load API settings:', error);
        toast({
          title: "Error",
          description: "Failed to load API settings. Using defaults.",
          variant: "destructive",
        });
      } finally {
        setInitialLoading(false);
      }
    };

    loadSettings();
  }, [toast]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const settings = {
        requests_per_minute: parseInt(requestsPerMinute) || 100,
        requests_per_hour: parseInt(requestsPerHour) || 1000,
        requests_per_day: parseInt(requestsPerDay) || 10000,
        connection_timeout: parseInt(connectionTimeout) || 30,
        read_timeout: parseInt(readTimeout) || 60,
        write_timeout: parseInt(writeTimeout) || 60,
        max_concurrent_requests: parseInt(maxConcurrentRequests) || 50,
        max_concurrent_per_user: parseInt(maxConcurrentPerUser) || 10,
        enable_rate_limiting: enableRateLimiting,
        enable_request_logging: enableRequestLogging,
        enable_circuit_breaker: enableCircuitBreaker,
        failure_threshold: parseInt(failureThreshold) || 5,
        recovery_timeout: parseInt(recoveryTimeout) || 60,
      };

      await systemSettingsService.setAPILimits(settings);
      
      toast({
        title: "Settings saved",
        description: "API limits and timeout settings have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setRequestsPerMinute('100');
    setRequestsPerHour('1000');
    setRequestsPerDay('10000');
    setConnectionTimeout('30');
    setReadTimeout('60');
    setWriteTimeout('60');
    setMaxConcurrentRequests('50');
    setMaxConcurrentPerUser('10');
    setEnableRateLimiting(true);
    setEnableRequestLogging(true);
    setEnableCircuitBreaker(false);
    setFailureThreshold('5');
    setRecoveryTimeout('60');
    
    toast({
      title: "Settings reset",
      description: "All settings have been reset to their default values.",
    });
  };

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/system-settings')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to System Settings
          </Button>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Zap className="h-8 w-8 text-orange-600" />
            API & Rate Limits
          </h1>
          <p className="text-muted-foreground">
            Loading API settings...
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate('/system-settings')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to System Settings
        </Button>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Zap className="h-8 w-8 text-orange-600" />
          API & Rate Limits
        </h1>
        <p className="text-muted-foreground">
          Configure API rate limits, timeouts, and concurrent request handling to optimize performance and prevent abuse.
        </p>
      </div>

      {/* Rate Limiting */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Shield className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Rate Limiting
                <Badge variant={enableRateLimiting ? "default" : "secondary"}>
                  {enableRateLimiting ? "Enabled" : "Disabled"}
                </Badge>
              </CardTitle>
              <CardDescription>
                Control the number of API requests allowed per time period
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Enable Rate Limiting</Label>
              <p className="text-sm text-muted-foreground">
                Protect your API from abuse and ensure fair usage
              </p>
            </div>
            <Switch
              checked={enableRateLimiting}
              onCheckedChange={setEnableRateLimiting}
            />
          </div>

          {enableRateLimiting && (
            <>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="rpm">Requests per Minute</Label>
                  <Input
                    id="rpm"
                    type="number"
                    value={requestsPerMinute}
                    onChange={(e) => setRequestsPerMinute(e.target.value)}
                    placeholder="100"
                  />
                  <p className="text-xs text-muted-foreground">
                    Short-term burst protection
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rph">Requests per Hour</Label>
                  <Input
                    id="rph"
                    type="number"
                    value={requestsPerHour}
                    onChange={(e) => setRequestsPerHour(e.target.value)}
                    placeholder="1000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Medium-term usage control
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rpd">Requests per Day</Label>
                  <Input
                    id="rpd"
                    type="number"
                    value={requestsPerDay}
                    onChange={(e) => setRequestsPerDay(e.target.value)}
                    placeholder="10000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Daily quota enforcement
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Timeout Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Timeout Configuration</CardTitle>
              <CardDescription>
                Set timeout values for API connections and operations
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="connection-timeout">Connection Timeout (s)</Label>
              <Input
                id="connection-timeout"
                type="number"
                value={connectionTimeout}
                onChange={(e) => setConnectionTimeout(e.target.value)}
                placeholder="30"
              />
              <p className="text-xs text-muted-foreground">
                Time to establish connection
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="read-timeout">Read Timeout (s)</Label>
              <Input
                id="read-timeout"
                type="number"
                value={readTimeout}
                onChange={(e) => setReadTimeout(e.target.value)}
                placeholder="60"
              />
              <p className="text-xs text-muted-foreground">
                Time to read response data
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="write-timeout">Write Timeout (s)</Label>
              <Input
                id="write-timeout"
                type="number"
                value={writeTimeout}
                onChange={(e) => setWriteTimeout(e.target.value)}
                placeholder="60"
              />
              <p className="text-xs text-muted-foreground">
                Time to send request data
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Concurrent Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Settings className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle>Concurrent Request Limits</CardTitle>
              <CardDescription>
                Control the number of simultaneous requests being processed
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="max-concurrent">Max Concurrent Requests</Label>
              <Input
                id="max-concurrent"
                type="number"
                value={maxConcurrentRequests}
                onChange={(e) => setMaxConcurrentRequests(e.target.value)}
                placeholder="50"
              />
              <p className="text-xs text-muted-foreground">
                Total concurrent requests across all users
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-per-user">Max per User</Label>
              <Input
                id="max-per-user"
                type="number"
                value={maxConcurrentPerUser}
                onChange={(e) => setMaxConcurrentPerUser(e.target.value)}
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground">
                Concurrent requests per individual user
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Circuit Breaker */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Circuit Breaker
                <Badge variant={enableCircuitBreaker ? "default" : "secondary"}>
                  {enableCircuitBreaker ? "Enabled" : "Disabled"}
                </Badge>
              </CardTitle>
              <CardDescription>
                Automatically disable failing services to prevent cascading failures
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Enable Circuit Breaker</Label>
              <p className="text-sm text-muted-foreground">
                Automatically stop sending requests to failing services
              </p>
            </div>
            <Switch
              checked={enableCircuitBreaker}
              onCheckedChange={setEnableCircuitBreaker}
            />
          </div>

          {enableCircuitBreaker && (
            <>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="failure-threshold">Failure Threshold</Label>
                  <Input
                    id="failure-threshold"
                    type="number"
                    value={failureThreshold}
                    onChange={(e) => setFailureThreshold(e.target.value)}
                    placeholder="5"
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of failures before opening circuit
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recovery-timeout">Recovery Timeout (s)</Label>
                  <Input
                    id="recovery-timeout"
                    type="number"
                    value={recoveryTimeout}
                    onChange={(e) => setRecoveryTimeout(e.target.value)}
                    placeholder="60"
                  />
                  <p className="text-xs text-muted-foreground">
                    Time before attempting to recover
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Additional Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Settings</CardTitle>
          <CardDescription>
            Extra configuration options for API behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Request Logging</Label>
              <p className="text-sm text-muted-foreground">
                Log all API requests for monitoring and debugging
              </p>
            </div>
            <Switch
              checked={enableRequestLogging}
              onCheckedChange={setEnableRequestLogging}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}