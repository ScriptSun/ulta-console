import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, Play, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CustomShellProps {
  data: {
    mode: "action";
    task: "custom_shell";
    status: "unconfirmed";
    risk: "low" | "medium" | "high";
    params: {
      description: string;
      shell: string;
    };
    human: string;
  };
  agentId: string;
  tenantId: string;
}

interface PolicyStatus {
  allowed: boolean;
  overall_status: 'auto' | 'confirm' | 'forbid';
  blocked_count: number;
  confirm_count: number;
}

export function CustomShellCard({ data, agentId, tenantId }: CustomShellProps) {
  const [policyStatus, setPolicyStatus] = useState<PolicyStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkPolicy();
  }, []);

  const checkPolicy = async () => {
    try {
      const { data: policyResult, error } = await supabase.functions.invoke(
        'ultaai-policy-middleware',
        {
          body: {
            tenant_id: tenantId,
            commands: [data.params.shell],
            agent_os: 'linux' // TODO: Get from agent heartbeat
          }
        }
      );

      if (error) throw error;
      setPolicyStatus(policyResult);
    } catch (error) {
      console.error('Policy check failed:', error);
      toast({
        title: "Policy Check Failed",
        description: "Unable to verify command safety",
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  };

  const executeCommand = async () => {
    if (!policyStatus?.allowed) return;

    setIsExecuting(true);
    try {
      // TODO: Call execution endpoint
      toast({
        title: "Command Executed",
        description: "Command has been queued for execution",
      });
    } catch (error) {
      console.error('Execution failed:', error);
      toast({
        title: "Execution Failed",
        description: "Unable to execute command",
        variant: "destructive"
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-success/10 text-success-foreground border-success/20';
      case 'medium': return 'bg-warning/10 text-warning-foreground border-warning/20';
      case 'high': return 'bg-destructive/10 text-destructive-foreground border-destructive/20';
      default: return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const getPolicyStatusIcon = () => {
    if (!policyStatus) return null;
    
    switch (policyStatus.overall_status) {
      case 'auto': return <Shield className="h-4 w-4 text-success" />;
      case 'confirm': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'forbid': return <X className="h-4 w-4 text-destructive" />;
    }
  };

  return (
    <Card className="border-l-4 border-l-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Single Command</CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className={getRiskColor(data.risk)}>
              {data.risk} risk
            </Badge>
            {!isChecking && (
              <Badge variant="outline" className="gap-1">
                {getPolicyStatusIcon()}
                {policyStatus?.overall_status}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-2">{data.params.description}</p>
          <div className="bg-muted/20 rounded-md p-3 font-mono text-sm">
            {data.params.shell}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{data.human}</p>
          
          <Button
            onClick={executeCommand}
            disabled={isChecking || !policyStatus?.allowed || isExecuting}
            className="gap-2"
            variant={policyStatus?.overall_status === 'confirm' ? 'outline' : 'default'}
          >
            <Play className="h-4 w-4" />
            {isExecuting ? 'Executing...' : 
             policyStatus?.overall_status === 'confirm' ? 'Confirm & Execute' : 
             'Execute'}
          </Button>
        </div>

        {policyStatus && !policyStatus.allowed && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            <p className="text-sm text-destructive-foreground">
              Command blocked by security policy
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}