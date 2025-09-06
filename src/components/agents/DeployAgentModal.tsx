import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Copy, 
  Check, 
  Terminal, 
  Clock, 
  Download,
  AlertCircle,
  RefreshCw,
  Server,
  Key,
  Lock,
  User,
  CreditCard
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface DeployAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DeploymentToken {
  token: string;
  expires_at: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
}

interface Plan {
  id: string;
  name: string;
  key: string;
  monthly_ai_requests: number;
  monthly_server_events: number;
}

export function DeployAgentModal({ isOpen, onClose }: DeployAgentModalProps) {
  const [token, setToken] = useState<DeploymentToken | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [sshDeploying, setSshDeploying] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [loadingPrerequisites, setLoadingPrerequisites] = useState(true);
  const [sshForm, setSshForm] = useState({
    hostname: '',
    username: '',
    password: '',
    privateKey: '',
    port: '22',
    authMethod: 'password' as 'password' | 'key'
  });
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadPrerequisites();
    }
  }, [isOpen]);

  const loadPrerequisites = async () => {
    setLoadingPrerequisites(true);
    try {
      // Load users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .order('full_name');

      if (usersError) throw usersError;

      // Load subscription plans
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('id, name, key, monthly_ai_requests, monthly_server_events')
        .eq('active', true)
        .order('name');

      if (plansError) throw plansError;

      setUsers(usersData || []);
      setPlans(plansData || []);

      // Set default free plan if available
      const freePlan = plansData?.find(plan => 
        plan.name.toLowerCase().includes('free') || 
        plan.name.toLowerCase().includes('basic')
      );
      if (freePlan) {
        setSelectedPlanId(freePlan.id);
      }

    } catch (error) {
      console.error('Error loading prerequisites:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users and plans. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingPrerequisites(false);
    }
  };

  const canProceed = () => {
    return selectedUserId && selectedPlanId && !loadingPrerequisites;
  };

  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expiry = new Date(token.expires_at).getTime();
      const remaining = Math.max(0, expiry - now);
      
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        setToken(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [token]);

  const generateToken = async () => {
    if (!canProceed()) {
      toast({
        title: 'Missing Requirements',
        description: 'Please select a user and plan before generating deployment token.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.callFunction('agent-deploy', { 
        action: 'generate_token',
        user_id: selectedUserId,
        plan_key: plans.find(p => p.id === selectedPlanId)?.key || 'free_plan'
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      setToken(response.data);
    } catch (error) {
      console.error('Error generating token:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate deployment token',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: 'Copied',
        description: 'Installation command copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const deployViaSSH = async () => {
    if (!token || timeLeft <= 0) {
      toast({
        title: 'Error',
        description: 'Please generate a valid deployment token first',
        variant: 'destructive',
      });
      return;
    }

    if (!sshForm.hostname || !sshForm.username) {
      toast({
        title: 'Error',
        description: 'Please fill in hostname and username',
        variant: 'destructive',
      });
      return;
    }

    if (sshForm.authMethod === 'password' && !sshForm.password) {
      toast({
        title: 'Error',
        description: 'Please provide a password',
        variant: 'destructive',
      });
      return;
    }

    if (sshForm.authMethod === 'key' && !sshForm.privateKey) {
      toast({
        title: 'Error',
        description: 'Please provide a private key',
        variant: 'destructive',
      });
      return;
    }

    setSshDeploying(true);
    try {
      const response = await api.callFunction('agent-deploy', { 
        action: 'deploy_ssh',
        token: token.token,
        ssh: sshForm
      });

      if (!response.success) {
        throw new Error(response.error);
      }

      toast({
        title: 'Deployment Started',
        description: 'Agent deployment has been initiated via SSH. Check your agents list for the new agent.',
      });
      
      onClose();
    } catch (error) {
      console.error('Error deploying via SSH:', error);
      toast({
        title: 'Deployment Failed',
        description: 'Failed to deploy agent via SSH. Please check your credentials and try again.',
        variant: 'destructive',
      });
    } finally {
      setSshDeploying(false);
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const installCommand = token 
    ? `curl https://install.ultaai.com | bash -s -- --token=${token.token}`
    : '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Deploy New Agent
          </DialogTitle>
          <DialogDescription>
            Deploy a new agent to your infrastructure. Agent must be assigned to a user and plan.
          </DialogDescription>
        </DialogHeader>

        {/* Prerequisites Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Required Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingPrerequisites ? (
              <div className="text-center py-4">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading users and plans...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="user-select" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Assign to User *
                  </Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId} required>
                    <SelectTrigger id="user-select">
                      <SelectValue placeholder="Select a user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users.length === 0 ? (
                        <SelectItem value="" disabled>No users available</SelectItem>
                      ) : (
                        users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{user.full_name}</span>
                              <span className="text-xs text-muted-foreground">{user.email}</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="plan-select" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Select Plan *
                  </Label>
                  <Select value={selectedPlanId} onValueChange={setSelectedPlanId} required>
                    <SelectTrigger id="plan-select">
                      <SelectValue placeholder="Select a plan..." />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.length === 0 ? (
                        <SelectItem value="" disabled>No plans available</SelectItem>
                      ) : (
                        plans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{plan.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {plan.monthly_ai_requests} AI requests/month
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            {!canProceed() && !loadingPrerequisites && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Both user and plan selection are required before deploying an agent.
                </p>
              </div>
            )}

            {canProceed() && !token && (
              <div className="flex justify-center pt-2">
                <Button onClick={generateToken} disabled={loading} className="flex items-center gap-2">
                  {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
                  <Download className="h-4 w-4" />
                  Generate Deployment Token
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ssh" className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              SSH Installation
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Manual Installation
            </TabsTrigger>
          </TabsList>

          {/* SSH Installation Tab */}
          <TabsContent value="ssh" className="space-y-4 mt-6">
            {/* Token Status */}
            {token && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Deployment Token
                    </span>
                    <Badge 
                      variant={timeLeft > 300000 ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {timeLeft > 0 ? `Expires in ${formatTime(timeLeft)}` : 'Expired'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {timeLeft > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border">
                        <Terminal className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <input
                          type="text"
                          value={installCommand}
                          readOnly
                          className="flex-1 bg-transparent border-none outline-none text-sm font-mono"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(installCommand)}
                          className="h-8 w-8 p-0"
                        >
                          {copied ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This token will expire in {formatTime(timeLeft)}. 
                        Generate a new one if needed.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                      <p className="text-sm text-destructive mb-3">Token has expired</p>
                      <Button onClick={generateToken} disabled={loading || !canProceed()} size="sm">
                        <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                        Generate New Token
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {loading && !token && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Generating deployment token...</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* SSH Connection Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">SSH Connection Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hostname">Hostname/IP *</Label>
                    <Input
                      id="hostname"
                      placeholder="192.168.1.100"
                      value={sshForm.hostname}
                      onChange={(e) => setSshForm({ ...sshForm, hostname: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="port">Port</Label>
                    <Input
                      id="port"
                      placeholder="22"
                      value={sshForm.port}
                      onChange={(e) => setSshForm({ ...sshForm, port: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    placeholder="root"
                    value={sshForm.username}
                    onChange={(e) => setSshForm({ ...sshForm, username: e.target.value })}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Authentication Method</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="authMethod"
                        value="password"
                        checked={sshForm.authMethod === 'password'}
                        onChange={(e) => setSshForm({ ...sshForm, authMethod: e.target.value as 'password' | 'key' })}
                      />
                      <Lock className="h-4 w-4" />
                      Password
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="authMethod"
                        value="key"
                        checked={sshForm.authMethod === 'key'}
                        onChange={(e) => setSshForm({ ...sshForm, authMethod: e.target.value as 'password' | 'key' })}
                      />
                      <Key className="h-4 w-4" />
                      Private Key
                    </label>
                  </div>
                </div>

                {sshForm.authMethod === 'password' ? (
                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter password"
                      value={sshForm.password}
                      onChange={(e) => setSshForm({ ...sshForm, password: e.target.value })}
                    />
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="privateKey">Private Key *</Label>
                    <Textarea
                      id="privateKey"
                      placeholder="-----BEGIN OPENSSH PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
-----END OPENSSH PRIVATE KEY-----"
                      rows={6}
                      value={sshForm.privateKey}
                      onChange={(e) => setSshForm({ ...sshForm, privateKey: e.target.value })}
                      className="font-mono text-sm"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <Button 
                    onClick={deployViaSSH}
                    disabled={sshDeploying || !token || timeLeft <= 0 || !canProceed()}
                    className="flex items-center gap-2"
                  >
                    {sshDeploying && <RefreshCw className="h-4 w-4 animate-spin" />}
                    Deploy Agent via SSH
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manual Installation Tab */}
          <TabsContent value="manual" className="space-y-6 mt-6">
            {/* Token Status */}
            {token && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Deployment Token
                    </span>
                    <Badge 
                      variant={timeLeft > 300000 ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {timeLeft > 0 ? `Expires in ${formatTime(timeLeft)}` : 'Expired'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {timeLeft > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <Terminal className="h-4 w-4 flex-shrink-0" />
                        <code className="text-sm font-mono flex-1 break-all">
                          {installCommand}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(installCommand)}
                          className="flex-shrink-0"
                        >
                          {copied ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This token will expire in {formatTime(timeLeft)}. 
                        Generate a new one if needed.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                      <p className="text-sm text-destructive mb-3">Token has expired</p>
                      <Button onClick={generateToken} disabled={loading || !canProceed()} size="sm">
                        <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                        Generate New Token
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {loading && !token && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Generating deployment token...</p>
                  </div>
                </CardContent>
              </Card>
            )}


            {/* System Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">System Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium">Supported OS</h4>
                    <ul className="text-muted-foreground mt-1 space-y-1">
                      <li>• Ubuntu 20.04+</li>
                      <li>• CentOS 8+</li>
                      <li>• RHEL 8+</li>
                      <li>• Debian 11+</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium">Minimum Resources</h4>
                    <ul className="text-muted-foreground mt-1 space-y-1">
                      <li>• 1 CPU core</li>
                      <li>• 512 MB RAM</li>
                      <li>• 1 GB disk space</li>
                      <li>• Internet connection</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 mt-6">
          {token && timeLeft <= 0 && (
            <Button onClick={generateToken} disabled={loading} variant="outline">
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Generate New Token
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}