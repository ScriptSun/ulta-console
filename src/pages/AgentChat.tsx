import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Play, CheckCircle, XCircle, Clock, Bot, User } from "lucide-react";

interface Message {
  id: string;
  type: 'user' | 'system' | 'decision' | 'preflight' | 'execution' | 'advice';
  content: any;
  timestamp: Date;
}

interface AgentHeartbeat {
  heartbeat: any;
  last_heartbeat: string;
}

interface Decision {
  task: string;
  status?: string;
  batch_id?: string;
  params?: any;
  risk?: string;
  preflight?: string[];
  batch?: any;
  reason?: string;
}

export default function AgentChat() {
  const { agentId } = useParams<{ agentId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [heartbeat, setHeartbeat] = useState<AgentHeartbeat | null>(null);
  const [currentDecision, setCurrentDecision] = useState<Decision | null>(null);
  const [confirmEnabled, setConfirmEnabled] = useState(false);

  // Load agent heartbeat on mount
  useEffect(() => {
    if (agentId) {
      loadAgentHeartbeat();
    }
  }, [agentId]);

  const loadAgentHeartbeat = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('heartbeat, last_heartbeat')
        .eq('id', agentId)
        .single();

      if (error) throw error;

      setHeartbeat(data);
      addMessage('system', {
        type: 'heartbeat',
        data: data.heartbeat,
        timestamp: data.last_heartbeat
      });
    } catch (error) {
      console.error('Error loading heartbeat:', error);
      toast.error('Failed to load agent heartbeat');
    }
  };

  const addMessage = (type: Message['type'], content: any) => {
    const message: Message = {
      id: crypto.randomUUID(),
      type,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || !agentId) return;

    const userMessage = userInput.trim();
    setUserInput("");
    setLoading(true);

    // Add user message
    addMessage('user', userMessage);

    try {
      // Call router/decide endpoint
      const { data, error } = await supabase.functions.invoke('ultaai-router-decide', {
        body: {
          agent_id: agentId,
          user_request: userMessage
        }
      });

      if (error) throw error;

      const decision: Decision = data;
      setCurrentDecision(decision);
      
      // Add decision message
      addMessage('decision', decision);

      // Handle not_supported case - get advice
      if (decision.task === 'not_supported') {
        await getAdvice(decision.reason || 'Request not supported', heartbeat?.heartbeat || {});
      }

    } catch (error) {
      console.error('Error processing request:', error);
      toast.error('Failed to process request');
      addMessage('system', { error: 'Failed to process request' });
    } finally {
      setLoading(false);
    }
  };

  const getAdvice = async (reason: string, heartbeatSmall: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('ultaai-advice', {
        body: {
          reason,
          heartbeat_small: heartbeatSmall
        }
      });

      if (error) throw error;

      addMessage('advice', data);
    } catch (error) {
      console.error('Error getting advice:', error);
      toast.error('Failed to get advice');
    }
  };

  const runPreflight = async () => {
    if (!currentDecision || !agentId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ultaai-preflight-run', {
        body: {
          agent_id: agentId,
          decision: currentDecision
        }
      });

      if (error) throw error;

      addMessage('preflight', data);
    } catch (error) {
      console.error('Error running preflight:', error);
      toast.error('Failed to run preflight checks');
    } finally {
      setLoading(false);
    }
  };

  const executeDecision = async () => {
    if (!currentDecision || !agentId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ultaai-exec-run', {
        body: {
          agent_id: agentId,
          decision: currentDecision,
          confirm: confirmEnabled
        }
      });

      if (error) throw error;

      addMessage('execution', data);
      
      // Reset decision and confirm after execution
      setCurrentDecision(null);
      setConfirmEnabled(false);
    } catch (error) {
      console.error('Error executing decision:', error);
      toast.error('Failed to execute decision');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString();
  };

  const renderMessage = (message: Message) => {
    switch (message.type) {
      case 'user':
        return (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 max-w-[80%]">
                {message.content}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatTimestamp(message.timestamp)}
              </div>
            </div>
          </div>
        );

      case 'system':
        return (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <Card className="max-w-[80%]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">System Status</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <pre className="text-xs bg-muted/50 p-2 rounded overflow-auto">
                    {JSON.stringify(message.content, null, 2)}
                  </pre>
                  <div className="text-xs text-muted-foreground mt-2">
                    {formatTimestamp(message.timestamp)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'decision':
        const decision = message.content as Decision;
        return (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-secondary-foreground" />
            </div>
            <div className="flex-1">
              <Card className="max-w-[80%]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    Decision: {decision.task}
                    {decision.status && <Badge variant="secondary">{decision.status}</Badge>}
                    {decision.risk && <Badge variant={decision.risk === 'high' ? 'destructive' : decision.risk === 'medium' ? 'default' : 'secondary'}>{decision.risk}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <pre className="text-xs bg-muted/50 p-2 rounded overflow-auto mb-3">
                    {JSON.stringify(decision, null, 2)}
                  </pre>
                  
                  <div className="flex flex-wrap gap-2">
                    {/* Show Preflight button for confirmed decisions */}
                    {decision.status === 'confirmed' && (
                      <Button size="sm" variant="outline" onClick={runPreflight} disabled={loading}>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Preflight
                      </Button>
                    )}
                    
                    {/* Show Execute button for confirmed decisions */}
                    {decision.status === 'confirmed' && (
                      <Button size="sm" onClick={executeDecision} disabled={loading}>
                        <Play className="w-4 h-4 mr-1" />
                        Execute
                      </Button>
                    )}
                    
                    {/* Show Confirm toggle and Execute for custom_shell or proposed_batch */}
                    {(decision.task === 'custom_shell' || decision.task === 'proposed_batch') && (
                      <>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="confirm"
                            checked={confirmEnabled}
                            onCheckedChange={setConfirmEnabled}
                          />
                          <Label htmlFor="confirm" className="text-sm">Confirm</Label>
                        </div>
                        <Button size="sm" onClick={executeDecision} disabled={loading}>
                          <Play className="w-4 h-4 mr-1" />
                          Execute
                        </Button>
                      </>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground mt-2">
                    {formatTimestamp(message.timestamp)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'preflight':
        const preflightResult = message.content;
        return (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
              {preflightResult.preflight_ok ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
            </div>
            <div className="flex-1">
              <Card className="max-w-[80%]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    Preflight Check
                    <Badge variant={preflightResult.preflight_ok ? 'default' : 'destructive'}>
                      {preflightResult.preflight_ok ? 'Passed' : 'Failed'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {preflightResult.failed && preflightResult.failed.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-red-600">Failed Checks:</div>
                      {preflightResult.failed.map((failure: string, index: number) => (
                        <div key={index} className="text-xs bg-red-50 text-red-800 px-2 py-1 rounded">
                          {failure}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-2">
                    {formatTimestamp(message.timestamp)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'execution':
        const execResult = message.content;
        return (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
              <Play className="w-4 h-4 text-secondary-foreground" />
            </div>
            <div className="flex-1">
              <Card className="max-w-[80%]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    Execution Result
                    <Badge variant={execResult.status === 'success' ? 'default' : execResult.status === 'error' ? 'destructive' : 'secondary'}>
                      {execResult.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <pre className="text-xs bg-muted/50 p-2 rounded overflow-auto">
                    {JSON.stringify(execResult, null, 2)}
                  </pre>
                  <div className="text-xs text-muted-foreground mt-2">
                    {formatTimestamp(message.timestamp)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'advice':
        const advice = message.content;
        return (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-yellow-600" />
            </div>
            <div className="flex-1">
              <Card className="max-w-[80%] border-yellow-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-yellow-800">AI Advice</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm mb-3">{advice.message}</p>
                  {advice.suggested_fixes && advice.suggested_fixes.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Suggested Fixes:</div>
                      {advice.suggested_fixes.map((fix: string, index: number) => (
                        <div key={index} className="text-xs bg-yellow-50 text-yellow-800 px-2 py-1 rounded">
                          {fix}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-2">
                    {formatTimestamp(message.timestamp)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      <div className="border-b p-4">
        <h1 className="text-xl font-semibold">Agent Chat</h1>
        <p className="text-sm text-muted-foreground">Agent ID: {agentId}</p>
        {heartbeat?.last_heartbeat && (
          <div className="flex items-center gap-2 mt-1">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Last heartbeat: {new Date(heartbeat.last_heartbeat).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id}>
              {renderMessage(message)}
            </div>
          ))}
        </div>
      </ScrollArea>

      <Separator />

      <div className="p-4">
        <div className="flex gap-2">
          <Input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your request..."
            disabled={loading}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={loading || !userInput.trim()}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}