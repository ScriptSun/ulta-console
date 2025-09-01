import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { MessageCircle, Copy, Settings, Send, Plus, ChevronDown, ChevronUp, CheckCircle, Play, FileText, Brain, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from 'next-themes';
import { TaskStatusCard } from '@/components/chat/TaskStatusCard';
import { InputForm } from '@/components/chat/InputForm';
import { PreflightBlockCard } from '@/components/chat/PreflightBlockCard';
import { ApiLogsViewer } from '@/components/chat/ApiLogsViewer';
import { CustomShellCard } from '@/components/chat/CustomShellCard';
import { ProposedBatchScriptCard } from '@/components/chat/ProposedBatchScriptCard';
import { QuickInputChips } from '@/components/chat/QuickInputChips';
import { RenderedResultCard } from '@/components/chat/RenderedResultCard';
import { ExecutionStatusCard } from '@/components/chat/ExecutionStatusCard';
import { RenderConfig } from '@/types/renderTypes';
import { useEventBus } from '@/hooks/useEventBus';
import { useWebSocketRouter } from '@/hooks/useWebSocketRouter';
import { useWebSocketExec } from '@/hooks/useWebSocketExec';

interface Agent {
  id: string;
  hostname: string;
  os: string;
  status: string;
  agent_type: string;
  customer_id: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  pending?: boolean;
  collapsed?: boolean;
  showInputsDelayed?: boolean;
  taskStatus?: {
    type: 'task_queued' | 'task_started' | 'task_progress' | 'task_succeeded' | 'task_failed' | 'done' | 'input_error';
    intent: string;
    runId?: string;
    batchId?: string;
    summary?: string;
    progress?: number;
    contract?: any;
    error?: string;
    duration?: number;
  };
  quickInputs?: string[];
  needsInputs?: {
    schema: any;
    defaults: Record<string, any>;
    missingParams: string[];
  };
  inputErrors?: Record<string, string>;
  preflightBlocked?: {
    details: Array<{
      check: string;
      status?: string;
      message?: string;
      [key: string]: any;
    }>;
  };
  decision?: {
    task: string;
    status?: string;
    batch_id?: string;
    params?: any;
    risk?: string;
    preflight?: string[];
    batch?: any;
    reason?: string;
  };
  preflightResult?: {
    preflight_ok: boolean;
    failed: string[];
  };
  executionResult?: {
    status: string;
    message?: string;
    reason?: string;
    script_id?: string;
    exit_code?: number;
    stdout_tail?: string;
    stderr_tail?: string;
  };
  adviceResult?: {
    message: string;
    suggested_fixes: string[];
  };
  renderConfig?: RenderConfig;
  executionStatus?: {
    run_id: string;
    status: 'queued' | 'running' | 'completed' | 'failed';
  };
  preflightStatus?: {
    agent_id: string;
    decision: any;
    streaming: boolean;
  };
}

const DEMO_ACTIONS = [
  { label: 'Install WordPress', action: 'install_wordpress' },
  { label: 'Check CPU', action: 'check_cpu' },
  { label: 'Check Disk', action: 'check_disk' },
  { label: 'Restart Nginx', action: 'restart_nginx' },
];

export default function Chat() {
  const { toast } = useToast();
  const { theme } = useTheme();
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedAgentDetails, setSelectedAgentDetails] = useState<Agent | null>(null);
  const [selectedAgentHeartbeat, setSelectedAgentHeartbeat] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [enableBadge, setEnableBadge] = useState(true);
  const [playSound, setPlaySound] = useState(false);
  const [compactDensity, setCompactDensity] = useState(false);
  const [enableRealTime, setEnableRealTime] = useState(true);
  const [autoClear, setAutoClear] = useState(false);
  const [showUnreadBadge, setShowUnreadBadge] = useState(true);
  const [conversationOnly, setConversationOnly] = useState(false);
  const [apiLogs, setApiLogs] = useState<any[]>([]);
  const [logViewerOpen, setLogViewerOpen] = useState(false);
  
  // Router streaming state
  const [routerPhase, setRouterPhase] = useState<string>('');
  const [streamingResponse, setStreamingResponse] = useState<string>('');
  const [candidateCount, setCandidateCount] = useState<number>(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sessionStartTime = useRef(Date.now());
  const routerTimeoutRef = useRef<NodeJS.Timeout>();
  
  // WebSocket router and event bus
  const { connect, disconnect, sendRequest, isConnected } = useWebSocketRouter();
  const { 
    connect: connectExec, 
    disconnect: disconnectExec, 
    sendRequest: sendExecRequest, 
    isConnected: isExecConnected 
  } = useWebSocketExec();
  const { emit, on, onRouter } = useEventBus();

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('chatDemoSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setEnableBadge(settings.enableBadge ?? true);
      setPlaySound(settings.playSound ?? false);
      setCompactDensity(settings.compactDensity ?? false);
      setConversationOnly(settings.conversationOnly ?? false);
    }

    const savedAgent = localStorage.getItem('chatDemoSelectedAgent');
    if (savedAgent) {
      setSelectedAgent(savedAgent);
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback(() => {
    localStorage.setItem('chatDemoSettings', JSON.stringify({
      enableBadge,
      playSound,
      compactDensity,
      conversationOnly
    }));
  }, [enableBadge, playSound, compactDensity, conversationOnly]);

  useEffect(() => {
    saveSettings();
  }, [saveSettings]);

  // Load agents
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const { data, error } = await supabase
          .from('agents')
          .select('id, hostname, os, status, agent_type, customer_id')
          .order('hostname');

        if (error) throw error;

        if (data && data.length > 0) {
          setAgents(data);
          if (!selectedAgent) {
            const demoAgent = data.find(a => a.hostname?.includes('Demo') || a.agent_type === 'demo') || data[0];
            setSelectedAgent(demoAgent.id);
          }
        } else {
          // Seed demo agent if none exists (dev mode only)
          if (import.meta.env.DEV) {
            await seedDemoAgent();
          }
        }
      } catch (error) {
        console.error('Error loading agents:', error);
        toast({
          title: "Error",
          description: "Failed to load agents",
          variant: "destructive",
        });
      }
    };

    loadAgents();
  }, [selectedAgent, toast]);

  // Seed demo agent for development
  const seedDemoAgent = async () => {
    try {
      const { data: customerRoles } = await supabase
        .from('user_roles')
        .select('customer_id')
        .limit(1);

      if (customerRoles && customerRoles.length > 0) {
        const customerId = customerRoles[0].customer_id;
        
          // Get current user ID
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          const { data: demoAgent, error } = await supabase
            .from('agents')
            .insert({
              customer_id: customerId,
              user_id: user.id,
              plan_key: 'free_plan',
              hostname: 'Ubuntu Demo Server',
              agent_type: 'demo',
              os: 'ubuntu',
              status: 'online',
              version: '1.0.0-demo'
            })
            .select()
            .single();

        if (error) throw error;

        setAgents([demoAgent]);
        setSelectedAgent(demoAgent.id);
        
        toast({
          title: "Demo Agent Created",
          description: "An Ubuntu demo agent has been created for testing WordPress installation",
        });
      }
    } catch (error) {
      console.error('Error seeding demo agent:', error);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectedAgentData = agents.find(a => a.id === selectedAgent);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">AI Chat Assistant</h1>
        <p className="text-muted-foreground">
          Chat with your AI assistant to manage servers and execute tasks
        </p>
      </div>

      <Card className="h-[calc(100vh-200px)] flex flex-col bg-background border shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold">AI Assistant</h3>
            {selectedAgentData && (
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  selectedAgentData.status === 'online' ? 'bg-success' : 'bg-muted-foreground'
                }`} />
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger className="w-40 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex items-center gap-2">
                          <span>{agent.hostname || `${agent.agent_type} Agent`}</span>
                          <Badge variant="outline" className="text-xs">
                            {agent.os}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setLogViewerOpen(true)}
              title="View API Logs"
            >
              <FileText className="w-4 h-4" />
              {apiLogs.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 text-xs">
                  {apiLogs.length}
                </Badge>
              )}
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-4">
                  <h4 className="font-medium">Chat Settings</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Real-time Updates</label>
                      <Switch
                        checked={enableRealTime}
                        onCheckedChange={setEnableRealTime}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Auto Clear</label>
                      <Switch
                        checked={autoClear}
                        onCheckedChange={setAutoClear}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Play sound</label>
                      <Switch
                        checked={playSound}
                        onCheckedChange={setPlaySound}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Compact density</label>
                      <Switch
                        checked={compactDensity}
                        onCheckedChange={setCompactDensity}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Chat without making edits</label>
                      <Switch
                        checked={conversationOnly}
                        onCheckedChange={setConversationOnly}
                      />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground">
              <p className="mb-2">👋 Welcome to AI Chat!</p>
              <p className="text-sm">
                {conversationOnly 
                  ? "I'm in conversation-only mode - I can chat and provide guidance without making any system changes."
                  : "Try asking me to install WordPress, check system resources, or manage services."
                }
              </p>
              {conversationOnly && (
                <div className="mt-2 p-2 bg-muted rounded-lg text-xs flex items-center justify-center gap-2">
                  <MessageCircle className="w-3 h-3" />
                  Chat without making edits to your project
                </div>
              )}
            </div>
          )}
          
          {/* Typing indicator with phases */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3 max-w-[80%]">
                <div className="flex items-center gap-2">
                  {routerPhase === 'Checking my ability' && (
                    <>
                      <Settings className="w-4 h-4 animate-spin text-purple-500" />
                      <span className="text-sm text-muted-foreground">Checking my ability</span>
                    </>
                  )}
                  {routerPhase === 'Analyzing server' && (
                    <>
                      <Search className="w-4 h-4 animate-pulse text-blue-500" />
                      <span className="text-sm text-muted-foreground">Analyzing server</span>
                      {candidateCount > 0 && (
                        <Badge variant="secondary" className="text-xs ml-2">
                          {candidateCount} matches
                        </Badge>
                      )}
                    </>
                  )}
                  {!routerPhase && (
                    <>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Footer */}
        <div className="p-4 border-t space-y-3">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message..."
              className="min-h-[40px] resize-none"
              rows={1}
            />
            <div className="flex items-center gap-1">
              <Button
                variant={conversationOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setConversationOnly(!conversationOnly)}
                title={conversationOnly ? "Chat mode active - no server actions" : "Click to enable chat-only mode"}
                className="px-2"
              >
                <MessageCircle className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => {}}
                disabled={!inputValue.trim() || isTyping}
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Quick Actions
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48">
                <div className="space-y-1">
                  {DEMO_ACTIONS.map((action) => (
                    <Button
                      key={action.action}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {}}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </Card>

      {/* API Logs Viewer */}
      <ApiLogsViewer
        open={logViewerOpen}
        onOpenChange={setLogViewerOpen}
        logs={apiLogs}
      />
    </div>
  );
}