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
import { 
  Copy, 
  Check, 
  Terminal, 
  Clock, 
  Download,
  AlertCircle,
  RefreshCw
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

        <div className="space-y-6">
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

          {/* Installation Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Installation Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium">Connect to your server</h4>
                    <p className="text-sm text-muted-foreground">
                      SSH into the server where you want to install the agent.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium">Run the installation command</h4>
                    <p className="text-sm text-muted-foreground">
                      Copy and paste the command above into your terminal. The installer will:
                    </p>
                    <ul className="text-sm text-muted-foreground mt-2 ml-4 space-y-1">
                      <li>• Download the latest agent binary</li>
                      <li>• Configure the agent with your token</li>
                      <li>• Set up system service for auto-start</li>
                      <li>• Generate security certificates</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium">Verify installation</h4>
                    <p className="text-sm text-muted-foreground">
                      The agent should appear in your dashboard within a few minutes. 
                      Check the status to ensure it's connected properly.
                    </p>
                  </div>
                </div>
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

          <div className="flex justify-end gap-3">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}