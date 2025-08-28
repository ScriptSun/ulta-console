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
  Lock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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

export function DeployAgentModal({ isOpen, onClose }: DeployAgentModalProps) {
  const [token, setToken] = useState<DeploymentToken | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [sshDeploying, setSshDeploying] = useState(false);
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
    if (isOpen && !token) {
      generateToken();
    }
  }, [isOpen]);

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
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('agent-deploy', {
        body: { action: 'generate_token' }
      });

      if (error) throw error;

      setToken(data);
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
      const { data, error } = await supabase.functions.invoke('agent-deploy', {
        body: { 
          action: 'deploy_ssh',
          token: token.token,
          ssh: sshForm
        }
      });

      if (error) throw error;

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
            Follow these steps to deploy a new agent to your infrastructure.
          </DialogDescription>
        </DialogHeader>

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
                  {timeLeft <= 0 && (
                    <div className="text-center py-4">
                      <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                      <p className="text-sm text-destructive mb-3">Token has expired</p>
                      <Button onClick={generateToken} disabled={loading} size="sm">
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
                    disabled={sshDeploying || !token || timeLeft <= 0}
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
                      <Button onClick={generateToken} disabled={loading} size="sm">
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

            {/* Manual Setup Section */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-primary bg-primary flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-primary-foreground"></div>
                    </div>
                    <h3 className="font-medium">Manual Setup — I will install the agent using the command</h3>
                    <Copy className="w-4 h-4 text-muted-foreground ml-auto" />
                  </div>
                  
                  {token && timeLeft > 0 && (
                    <>
                      <div className="bg-muted rounded-lg p-4">
                        <code className="text-sm font-mono break-all text-foreground">
                          {installCommand}
                        </code>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        This token is unique to your VPS and expires in {formatTime(timeLeft)}.
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

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