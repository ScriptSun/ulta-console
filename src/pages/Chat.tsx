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
  showInputsDelayed?: boolean; // Flag to control input form visibility timing
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
  // New router decision fields
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
  // Execution tracking
  executionStatus?: {
    run_id: string;
    status: 'queued' | 'running' | 'completed' | 'failed';
  };
  // Preflight tracking
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

  // Bootstrap chat session
  const bootstrapChat = async () => {
    if (conversationId) return conversationId;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      const { data, error } = await supabase.functions.invoke('chat-api', {
        body: {
          action: 'start_conversation',
          agent_id: selectedAgent,
          session_start_time: sessionStartTime.current
        }
      });

      if (error) throw error;

      setConversationId(data.conversation_id);
      return data.conversation_id;
    } catch (error) {
      console.error('Error starting chat session:', error);
      toast({
        title: "Error", 
        description: "Failed to start chat session",
        variant: "destructive",
      });
      return null;
    }
  };

  // Send message using new router functionality
  const sendMessage = async (content: string, isAction = false) => {
    if (!content.trim() || !selectedAgent) return;

    const currentConversationId = await bootstrapChat();
    if (!currentConversationId) return;

    // Check if this is an execution command (JSON with inputs or confirm flags)
    let isExecutionCommand = false;
    let executionData: any = null;
    
    try {
      if (content.startsWith('{')) {
        executionData = JSON.parse(content);
        isExecutionCommand = true;
      }
    } catch (error) {
      // Not JSON, treat as normal message
    }

    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: isExecutionCommand ? 'Execute with provided inputs' : content.trim(),
      timestamp: new Date(),
      pending: false
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      // Handle execution commands (from InputForm submissions)
      if (isExecutionCommand && executionData?.inputs) {
        // Get the last decision from messages
        const lastDecision = messages.filter(m => m.decision).pop()?.decision;
        if (!lastDecision) {
          throw new Error('No previous decision found for execution');
        }

        // Call execution endpoint
        const { data: execData, error: execError } = await supabase.functions.invoke('ultaai-exec-run', {
          body: {
            agent_id: selectedAgent,
            decision: { ...lastDecision, params: executionData.inputs },
            confirm: true
          }
        });

        if (execError) throw execError;

        // Add execution result message
        const execMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: getExecutionMessage(execData),
          timestamp: new Date(),
          pending: false,
          executionResult: execData
        };

        setMessages(prev => [...prev, execMessage]);
        setIsTyping(false);
        return;
      }

      // Normal chat flow - use WebSocket router for streaming or conversation-only mode
      if (conversationOnly) {
        // Conversation-only mode - provide chat response without server actions
        const conversationResponse: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: generateConversationResponse(content.trim()),
          timestamp: new Date(),
          pending: false
        };
        
        setMessages(prev => [...prev, conversationResponse]);
        setIsTyping(false);
        return;
      }
      
      if (!isConnected) {
        throw new Error('WebSocket router not connected');
      }
      
      // Start thinking sequence first, then send API request
      setIsTyping(true);
      setRouterPhase('Checking my ability');
      
      // Wait 2 seconds, then show Analyzing server
      setTimeout(() => {
        setRouterPhase('Analyzing server');
        setCandidateCount(5);
        
        // After another 2 seconds, send the actual API request
        setTimeout(() => {
          sendRequest({
            agent_id: selectedAgent,
            user_request: content.trim()
          });
        }, 2000);
      }, 2000);
      
      // The response will be handled by the event listeners

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        pending: false
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsTyping(false);
    }
  };

  // Generate conversation-only responses
  const generateConversationResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    // WordPress installation
    if (input.includes('wordpress') || input.includes('wp')) {
      return "I'd be happy to help you with WordPress! In conversation-only mode, I can discuss installation steps, requirements, and best practices, but I won't actually install anything on your server. Would you like me to explain the WordPress installation process?";
    }
    
    // System monitoring
    if (input.includes('cpu') || input.includes('memory') || input.includes('disk')) {
      return "For system monitoring, I can explain various commands and tools. In conversation-only mode, I won't execute these commands, but I can guide you through checking CPU usage with `top` or `htop`, memory with `free -h`, and disk space with `df -h`. Would you like detailed explanations of any of these?";
    }
    
    // Service management
    if (input.includes('service') || input.includes('nginx') || input.includes('apache')) {
      return "I can help explain service management! In conversation-only mode, I can guide you through using `systemctl` commands to manage services like nginx or apache. For example, `systemctl status nginx` to check status, `systemctl restart nginx` to restart. What specific service would you like to learn about?";
    }
    
    // Default response
    return "I'm here to help! In conversation-only mode, I can provide guidance, explanations, and best practices without making changes to your system. What would you like to learn about or discuss?";
  };

  // Get execution message from result
  const getExecutionMessage = (result: any): string => {
    if (result.status === 'success') {
      return `✅ Task completed successfully!\n\n${result.message || 'Execution finished.'}`;
    } else if (result.status === 'error') {
      return `❌ Task failed: ${result.error || 'Unknown error occurred'}`;
    } else {
      return `📋 Task status: ${result.status}\n\n${result.message || 'Task is being processed.'}`;
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle textarea input
  const handleTextareaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  // Connect WebSocket when component mounts and agent is selected
  useEffect(() => {
    if (selectedAgent) {
      connect();
      connectExec();
    }
    
    return () => {
      disconnect();
      disconnectExec();
    };
  }, [selectedAgent, connect, disconnect, connectExec, disconnectExec]);

  const selectedAgentData = agents.find(a => a.id === selectedAgent);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">AI Chat Assistant</h1>
        <p className="text-muted-foreground">
          Chat with your AI assistant to manage servers and execute tasks
        </p>
      </div>

      {/* Agent Selection Section */}
      <div className="mb-6">
        <div className="bg-card border rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-foreground">Connected Agent</h3>
              {selectedAgentData && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      selectedAgentData.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                    <span className="text-sm font-medium text-muted-foreground">
                      {selectedAgentData.status === 'online' ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                    <SelectTrigger className="w-64 h-10 bg-background border-2 border-border hover:border-primary/50 focus:border-primary transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-2 border-border shadow-xl z-50">
                      {agents.map(agent => (
                        <SelectItem key={agent.id} value={agent.id} className="hover:bg-muted focus:bg-muted cursor-pointer">
                          <div className="flex items-center gap-3 py-1">
                            <div className={`w-2 h-2 rounded-full ${
                              agent.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                            }`} />
                            <div className="flex flex-col">
                              <span className="font-medium">{agent.hostname || `${agent.agent_type} Agent`}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {agent.os}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {agent.agent_type}
                                </span>
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setLogViewerOpen(true)}
                title="View API Logs"
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                <span>Logs</span>
                {apiLogs.length > 0 && (
                  <Badge variant="secondary" className="h-5 text-xs">
                    {apiLogs.length}
                  </Badge>
                )}
              </Button>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 bg-background border-2 border-border shadow-xl z-50">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg">Chat Settings</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Real-time Updates</label>
                        <Switch
                          checked={enableRealTime}
                          onCheckedChange={setEnableRealTime}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Auto Clear</label>
                        <Switch
                          checked={autoClear}
                          onCheckedChange={setAutoClear}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Play Sound</label>
                        <Switch
                          checked={playSound}
                          onCheckedChange={setPlaySound}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Compact Density</label>
                        <Switch
                          checked={compactDensity}
                          onCheckedChange={setCompactDensity}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Chat Only Mode</label>
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
        </div>
      </div>

      <Card className="h-[calc(100vh-280px)] flex flex-col bg-background border shadow-lg">
        {/* Simplified Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Chat Session</h3>
            {conversationOnly && (
              <Badge variant="secondary" className="text-xs">
                Chat Only Mode
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {isConnected ? (
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                Disconnected
              </span>
            )}
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
                  Chat without making server actions
                </div>
              )}
            </div>
          )}
          
          {/* Messages */}
          {messages.map((message) => (
            <div key={message.id} className={`group flex gap-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}>
              <div className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              } ${compactDensity ? 'p-2 text-sm' : ''}`}>
                <div className="whitespace-pre-wrap">
                  {typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}
                </div>
              </div>
            </div>
          ))}
          
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
              onKeyDown={handleTextareaKeyDown}
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
                onClick={() => sendMessage(inputValue)}
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
                      onClick={() => sendMessage(action.label, true)}
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