import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, Play, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProposedBatchScriptProps {
  data: {
    mode: "action";
    task: "proposed_batch_script";
    status: "unconfirmed";
    risk: "low" | "medium" | "high";
    script: {
      name: string;
      overview: string;
      commands: string[];
      post_checks: string[];
    };
    human: string;
  };
  agentId: string;
  tenantId: string;
}

interface PolicyStatus {
  allowed: boolean;
  commands_status: Array<{
    command: string;
    status: 'auto' | 'confirm' | 'forbid';
    reason?: string;
    policy_name?: string;
  }>;
  overall_status: 'auto' | 'confirm' | 'forbid';
  blocked_count: number;
  confirm_count: number;
}

export function ProposedBatchScriptCard({ data, agentId, tenantId }: ProposedBatchScriptProps) {
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
            commands: data.script.commands,
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
        description: "Unable to verify script safety",
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  };

  const executeScript = async () => {
    if (!policyStatus?.allowed) return;

    setIsExecuting(true);
    try {
      // TODO: Call execution endpoint for batch script
      toast({
        title: "Script Queued",
        description: "Batch script has been queued for execution",
      });
    } catch (error) {
      console.error('Execution failed:', error);
      toast({
        title: "Execution Failed",
        description: "Unable to execute script",
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

  const getPolicyStatusIcon = (status: string) => {
    switch (status) {
      case 'auto': return <Shield className="h-4 w-4 text-success" />;
      case 'confirm': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'forbid': return <X className="h-4 w-4 text-destructive" />;
    }
  };

  const getCommandStatusColor = (status: string) => {
    switch (status) {
      case 'auto': return 'text-success';
      case 'confirm': return 'text-warning';
      case 'forbid': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card className="border-l-4 border-l-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">{data.script.name}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{data.script.overview}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className={getRiskColor(data.risk)}>
              {data.risk} risk
            </Badge>
            {!isChecking && (
              <Badge variant="outline" className="gap-1">
                {getPolicyStatusIcon(policyStatus?.overall_status || 'auto')}
                {policyStatus?.overall_status}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Commands ({data.script.commands.length})</h4>
          <div className="space-y-2">
            {data.script.commands.map((command, index) => {
              const commandStatus = policyStatus?.commands_status?.[index];
              return (
                <div key={index} className="bg-muted/20 rounded-md p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-mono text-sm flex-1">{command}</div>
                    {!isChecking && commandStatus && (
                      <div className={`flex items-center gap-1 ${getCommandStatusColor(commandStatus.status)}`}>
                        {getPolicyStatusIcon(commandStatus.status)}
                        <span className="text-xs capitalize">{commandStatus.status}</span>
                      </div>
                    )}
                  </div>
                  {commandStatus?.reason && (
                    <p className="text-xs text-muted-foreground mt-1">{commandStatus.reason}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {data.script.post_checks.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Post-execution Checks</h4>
            <div className="space-y-1">
              {data.script.post_checks.map((check, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-3 w-3" />
                  <span className="font-mono">{check}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{data.human}</p>
          
          <Button
            onClick={executeScript}
            disabled={isChecking || !policyStatus?.allowed || isExecuting}
            className="gap-2"
            variant={policyStatus?.overall_status === 'confirm' ? 'outline' : 'default'}
          >
            <Play className="h-4 w-4" />
            {isExecuting ? 'Executing...' : 
             policyStatus?.overall_status === 'confirm' ? 'Confirm & Execute Batch' : 
             'Execute Batch'}
          </Button>
        </div>

        {policyStatus && !policyStatus.allowed && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            <p className="text-sm text-destructive-foreground">
              Script blocked by security policy ({policyStatus.blocked_count} forbidden commands)
            </p>
          </div>
        )}

        {policyStatus && policyStatus.allowed && policyStatus.confirm_count > 0 && (
          <div className="bg-warning/10 border border-warning/20 rounded-md p-3">
            <p className="text-sm text-warning-foreground">
              {policyStatus.confirm_count} commands require confirmation before execution
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}