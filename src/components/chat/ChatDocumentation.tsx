import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  MessageSquare, 
  Settings, 
  Zap, 
  Network, 
  Database, 
  Shield, 
  Terminal, 
  Brain,
  GitBranch,
  Clock,
  Search,
  CheckCircle,
  AlertTriangle,
  Copy
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatDocumentationProps {
  children: React.ReactNode;
}

export const ChatDocumentation: React.FC<ChatDocumentationProps> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard", description: "Code snippet copied successfully" });
  };

  const CodeBlock: React.FC<{ code: string; title?: string }> = ({ code, title }) => (
    <div className="relative">
      {title && <p className="text-sm font-medium mb-2 text-muted-foreground">{title}</p>}
      <div className="relative bg-muted/50 rounded-lg p-4 font-mono text-sm overflow-x-auto">
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-8 w-8 p-0"
          onClick={() => copyToClipboard(code)}
        >
          <Copy className="h-4 w-4" />
        </Button>
        <pre className="text-foreground">{code}</pre>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-500" />
            Chat System Documentation
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-full">
          <div className="p-6 space-y-8">
            
            {/* System Overview */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold">System Architecture Overview</h2>
              </div>
              
              <Card>
                <CardContent className="p-6">
                  <p className="text-muted-foreground mb-4">
                    The chat system is a sophisticated AI-powered interface that enables users to interact with remote agents 
                    to execute commands, manage scripts, and perform system operations through natural language.
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Frontend Components
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                        <li>• React + TypeScript architecture</li>
                        <li>• WebSocket real-time communication</li>
                        <li>• Event-driven state management</li>
                        <li>• Dynamic form generation</li>
                      </ul>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        Backend Services
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                        <li>• Supabase edge functions</li>
                        <li>• OpenAI GPT integration</li>
                        <li>• PostgreSQL database</li>
                        <li>• Real-time subscriptions</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            <Tabs defaultValue="chat-flow" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="chat-flow">Chat Flow</TabsTrigger>
                <TabsTrigger value="websockets">WebSockets</TabsTrigger>
                <TabsTrigger value="router">Router System</TabsTrigger>
                <TabsTrigger value="edge-functions">Edge Functions</TabsTrigger>
              </TabsList>

              {/* Chat Flow Tab */}
              <TabsContent value="chat-flow" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GitBranch className="w-5 h-5" />
                      Complete Chat Flow Process
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                        <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                        <div>
                          <h4 className="font-semibold">User Input Processing</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            User types a message → Validated and sent via WebSocket to router → Agent selection verified
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                        <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                        <div>
                          <h4 className="font-semibold">Batch Candidate Retrieval</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            System queries script_batches table → Filters by OS and keywords → Returns matching commands
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                        <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
                        <div>
                          <h4 className="font-semibold">AI Decision Making</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            OpenAI analyzes request + available batches → Returns decision (chat/action/ai_draft_action)
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                        <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-sm">4</div>
                        <div>
                          <h4 className="font-semibold">Action Execution Pipeline</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            If action mode → Preflight checks → Input collection → Command execution → Result streaming
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div>
                      <h4 className="font-semibold mb-3">Decision Modes</h4>
                      <div className="grid gap-3">
                        <div className="flex items-center gap-3 p-3 border rounded-lg">
                          <Badge variant="secondary">chat</Badge>
                          <span className="text-sm">Simple conversational response, no action needed</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 border rounded-lg">
                          <Badge className="bg-blue-500">action</Badge>
                          <span className="text-sm">Execute existing script batch with parameters</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 border rounded-lg">
                          <Badge className="bg-purple-500">ai_draft_action</Badge>
                          <span className="text-sm">AI-generated command suggestion requiring approval</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* WebSockets Tab */}
              <TabsContent value="websockets" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Network className="w-5 h-5" />
                      WebSocket Communication Architecture
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    
                    <div>
                      <h4 className="font-semibold mb-3">useWebSocketRouter Hook</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Manages connection to ws-router edge function for routing decisions and streaming responses.
                      </p>
                      <CodeBlock 
                        title="Router WebSocket Usage"
                        code={`const { connect, disconnect, sendRequest, isConnected } = useWebSocketRouter();

// Send user request for routing
sendRequest({
  agent_id: selectedAgent,
  user_request: messageText
});

// Listen to router events
onRouter((eventType, data) => {
  switch (eventType) {
    case 'router.start': // Router processing started
    case 'router.retrieved': // Batch candidates found
    case 'router.token': // Streaming AI decision
    case 'router.selected': // Final decision made
    case 'router.done': // Process complete
  }
});`}
                      />
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-3">useWebSocketExec Hook</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Handles connection to ws-exec edge function for command execution monitoring.
                      </p>
                      <CodeBlock 
                        title="Execution WebSocket Usage"
                        code={`const { connect, disconnect, sendRequest } = useWebSocketExec();

// Start preflight check
sendRequest({
  mode: 'preflight',
  agent_id: agentId,
  decision: routerDecision
});

// Monitor execution
sendRequest({
  mode: 'execution', 
  run_id: runId,
  agent_id: agentId
});

// Real-time execution events via EventBus
emit('exec.started', { run_id });
emit('exec.progress', { progress: 50 });
emit('exec.finished', { status: 'completed' });`}
                      />
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-3">Event Bus System</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Centralized event management for component communication across the application.
                      </p>
                      <CodeBlock 
                        title="Event Bus Pattern"
                        code={`// EventBusContext provides global event handling
const { emit, on, onRouter, onExec } = useEventBus();

// Emit events
emit('router.status', { phase: 'thinking' });

// Subscribe to specific event patterns
onRouter((type, data) => handleRouterEvent(type, data));
onExec((type, data) => handleExecEvent(type, data));

// Generic event subscription
const unsubscribe = on('custom.event', (data) => {
  console.log('Custom event received:', data);
});`}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Router System Tab */}
              <TabsContent value="router" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="w-5 h-5" />
                      Router System & AI Decision Engine
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    
                    <div>
                      <h4 className="font-semibold mb-3">Batch Candidate Retrieval</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        The system intelligently finds relevant script batches based on user requests and agent capabilities.
                      </p>
                      <CodeBlock 
                        title="Batch Query Logic"
                        code={`// Query script_batches table
SELECT sb.*, sbv.sha256, sbv.version 
FROM script_batches sb
JOIN script_batch_variants sbv ON sb.id = sbv.batch_id 
WHERE sbv.active = true 
  AND sbv.os = $agent_os
  AND (
    sb.key ILIKE '%' || $search_terms || '%' OR
    sb.description ILIKE '%' || $search_terms || '%' OR
    sb.name ILIKE '%' || $search_terms || '%'
  )
ORDER BY sb.name
LIMIT 12;

// Example search terms from "install wordpress"
// -> "wordpress", "install", "setup", "deploy"`}
                      />
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-3">Command Policy Filtering</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Security policies are evaluated to ensure safe command execution and proper authorization.
                      </p>
                      <CodeBlock 
                        title="Policy Evaluation"
                        code={`// Command policies structure
interface CommandPolicy {
  id: string;
  category: string;        // 'system', 'network', 'security'
  command_pattern: string; // Regex pattern to match
  risk_level: 'low' | 'medium' | 'high';
  requires_approval: boolean;
  allowed_users?: string[];
  restrictions?: string[];
}

// Policy checking process
1. Extract commands from AI decision
2. Match against policy patterns  
3. Calculate combined risk level
4. Determine if approval required
5. Block or allow execution`}
                      />
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-3">AI Decision Types</h4>
                      <div className="space-y-4">
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">Mode: chat</Badge>
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          <CodeBlock 
                            code={`{
  "mode": "chat",
  "text": "WordPress is a popular content management system..."
}`}
                          />
                        </div>

                        <div className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-blue-500">Mode: action</Badge>
                            <Terminal className="w-4 h-4" />
                          </div>
                          <CodeBlock 
                            code={`{
  "mode": "action",
  "task": "wordpress_installer",
  "batch_id": "016b922f-4c90-4e44-8670-233ef6c7e607",
  "status": "confirmed", // or "unconfirmed"
  "params": {},
  "missing_params": [],
  "risk": "medium",
  "human": "Confirm to start WordPress installation."
}`}
                          />
                        </div>

                        <div className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-purple-500">Mode: ai_draft_action</Badge>
                            <Zap className="w-4 h-4" />
                          </div>
                          <CodeBlock 
                            code={`{
  "mode": "ai_draft_action",
  "task": "install_wordpress",
  "summary": "Install WordPress with dependencies",
  "status": "unconfirmed",
  "risk": "medium",
  "suggested": {
    "kind": "commands",
    "commands": [
      "sudo apt update",
      "sudo apt install apache2 mysql-server php"
    ]
  },
  "notes": ["Requires sudo access", "May restart services"]
}`}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Edge Functions Tab */}
              <TabsContent value="edge-functions" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="w-5 h-5" />
                      Supabase Edge Functions Architecture
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <Card className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">ws-router</CardTitle>
                          <p className="text-sm text-muted-foreground">WebSocket Router & Coordinator</p>
                        </CardHeader>
                        <CardContent>
                          <ul className="text-sm space-y-1">
                            <li>• Handles WebSocket connections</li>
                            <li>• Calls batches-retrieve function</li>
                            <li>• Invokes ultaai-router-decide</li>
                            <li>• Streams AI tokens to client</li>
                            <li>• Fetches batch details</li>
                          </ul>
                        </CardContent>
                      </Card>

                      <Card className="border-l-4 border-l-green-500">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">batches-retrieve</CardTitle>
                          <p className="text-sm text-muted-foreground">Script Batch Finder</p>
                        </CardHeader>
                        <CardContent>
                          <ul className="text-sm space-y-1">
                            <li>• Queries script_batches table</li>
                            <li>• Filters by OS compatibility</li>
                            <li>• Searches by keywords</li>
                            <li>• Returns candidates with metadata</li>
                          </ul>
                        </CardContent>
                      </Card>

                      <Card className="border-l-4 border-l-purple-500">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">ultaai-router-decide</CardTitle>
                          <p className="text-sm text-muted-foreground">AI Decision Engine</p>
                        </CardHeader>
                        <CardContent>
                          <ul className="text-sm space-y-1">
                            <li>• Processes with OpenAI GPT</li>
                            <li>• Analyzes user intent</li>
                            <li>• Matches to best batch</li>
                            <li>• Streams decision tokens</li>
                            <li>• Returns structured decision</li>
                          </ul>
                        </CardContent>
                      </Card>

                      <Card className="border-l-4 border-l-orange-500">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">ws-exec</CardTitle>
                          <p className="text-sm text-muted-foreground">Execution Monitor</p>
                        </CardHeader>
                        <CardContent>
                          <ul className="text-sm space-y-1">
                            <li>• Manages execution WebSockets</li>
                            <li>• Runs preflight checks</li>
                            <li>• Monitors batch_runs table</li>
                            <li>• Streams stdout/progress</li>
                            <li>• Handles completion events</li>
                          </ul>
                        </CardContent>
                      </Card>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-3">Function Call Flow</h4>
                      <CodeBlock 
                        title="Edge Function Interaction"
                        code={`1. User sends message via WebSocket to ws-router
   ↓
2. ws-router → batches-retrieve(agent_id, user_request)
   Returns: { candidates: [...], agent_os: "ubuntu" }
   ↓
3. ws-router → ultaai-router-decide(user_request, candidates, policies)  
   Streams: AI tokens → client via WebSocket
   Returns: RouterDecision object
   ↓
4. If action mode → ws-router → batch-details(batch_id)
   Returns: Complete batch information with schema
   ↓
5. Client collects inputs → ws-exec preflight/execution
   ↓
6. ws-exec monitors batch_runs & agent_logs tables
   Streams: Real-time progress → client`}
                      />
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-3">Database Tables Used</h4>
                      <div className="grid gap-3">
                        <div className="flex items-center gap-3 p-3 border rounded-lg">
                          <Database className="w-4 h-4 text-blue-500" />
                          <div className="flex-1">
                            <span className="font-medium">script_batches</span>
                            <p className="text-sm text-muted-foreground">Available commands and scripts</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 border rounded-lg">
                          <Database className="w-4 h-4 text-green-500" />
                          <div className="flex-1">
                            <span className="font-medium">agents</span>
                            <p className="text-sm text-muted-foreground">Remote agent information and heartbeat</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 border rounded-lg">
                          <Database className="w-4 h-4 text-purple-500" />
                          <div className="flex-1">
                            <span className="font-medium">command_policies</span>
                            <p className="text-sm text-muted-foreground">Security and authorization rules</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 border rounded-lg">
                          <Database className="w-4 h-4 text-orange-500" />
                          <div className="flex-1">
                            <span className="font-medium">batch_runs</span>
                            <p className="text-sm text-muted-foreground">Execution status and results</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 border rounded-lg">
                          <Database className="w-4 h-4 text-red-500" />
                          <div className="flex-1">
                            <span className="font-medium">agent_logs</span>
                            <p className="text-sm text-muted-foreground">Real-time execution output</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Input Processing & Security */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <h2 className="text-2xl font-bold">Input Processing & Security</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Dynamic Form Generation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      Forms are generated dynamically from JSON schemas defined in script batch configurations.
                    </p>
                    <CodeBlock 
                      title="Input Schema Example"
                      code={`{
  "type": "object",
  "required": ["domain", "wp_admin_user"],
  "properties": {
    "domain": {
      "type": "string", 
      "description": "WordPress site domain"
    },
    "wp_admin_user": {
      "type": "string",
      "minLength": 3,
      "maxLength": 60,
      "description": "Admin username"
    },
    "wp_admin_email": {
      "type": "string",
      "format": "email"
    }
  }
}`}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Preflight Safety Checks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      Before execution, comprehensive safety validations ensure system readiness and security compliance.
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>Agent connectivity & heartbeat</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>Disk space & system resources</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>Command policy compliance</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>Input parameter validation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        <span>Risk assessment & approval flow</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* State Management */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <Settings className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <h2 className="text-2xl font-bold">State Management & Real-time Updates</h2>
              </div>

              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Message State Structure</h4>
                      <CodeBlock 
                        code={`interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  pending?: boolean;
  
  // Router decision from AI
  decision?: RouterDecision;
  
  // Input collection state  
  needsInputs?: {
    schema: any;
    defaults: Record<string, any>;
    missingParams: string[];
  };
  
  // Execution tracking
  executionStatus?: {
    run_id: string;
    status: 'preparing' | 'queued' | 'running' | 'completed' | 'failed';
    contract?: any;
    stdout?: string;
  };
  
  // Preflight results
  preflightResult?: {
    preflight_ok: boolean;
    failed: string[];
  };
}`}
                      />
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-2">Real-time Subscription Pattern</h4>
                      <CodeBlock 
                        code={`// Listen to database changes for live updates
const eventsChannel = supabase
  .channel('batch-runs-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public', 
    table: 'batch_runs',
    filter: \`id=eq.\${run_id}\`
  }, (payload) => {
    // Update execution status in real-time
    updateMessageExecutionStatus(payload.new);
  })
  .subscribe();

// Agent logs for stdout streaming  
const logsChannel = supabase
  .channel('agent-logs')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'agent_logs',
    filter: \`run_id=eq.\${run_id}\`
  }, (payload) => {
    // Stream command output live
    appendToStdout(payload.new.message);
  })
  .subscribe();`}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Developer Tips */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <Terminal className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold">Developer Implementation Notes</h2>
              </div>

              <div className="grid gap-4">
                <Card className="border-l-4 border-l-green-500">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      Best Practices
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li>• Always validate WebSocket connections before sending requests</li>
                      <li>• Implement proper error handling for all async operations</li>
                      <li>• Use TypeScript interfaces for all data structures</li>
                      <li>• Subscribe to real-time events for better UX</li>
                      <li>• Clean up WebSocket connections and subscriptions on unmount</li>
                      <li>• Handle edge cases like network timeouts and agent disconnection</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-yellow-500">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      Common Pitfalls to Avoid
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li>• Don't forget to handle WebSocket reconnection logic</li>
                      <li>• Avoid blocking the UI during long-running operations</li>
                      <li>• Never trust client-side validation alone - validate on server</li>
                      <li>• Don't ignore preflight check failures</li>
                      <li>• Be careful with memory leaks from event listeners</li>
                      <li>• Handle partial JSON responses during streaming</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Footer */}
            <footer className="border-t pt-6">
              <p className="text-center text-sm text-muted-foreground">
                This documentation covers the complete chat system architecture. For specific implementation details, 
                refer to the source code in <code>src/components/chat/</code> and <code>supabase/functions/</code>.
              </p>
            </footer>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};