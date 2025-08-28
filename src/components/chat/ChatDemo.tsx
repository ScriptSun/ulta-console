import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { MessageCircle, X, Copy, Settings, Send, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from 'next-themes';
import { TaskStatusCard } from './TaskStatusCard';
import { QuickInputChips } from './QuickInputChips';
import { InputForm } from './InputForm';
import { PreflightBlockCard } from './PreflightBlockCard';

interface Agent {
  id: string;
  hostname: string;
  os: string;
  status: string;
  agent_type: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  pending?: boolean;
  collapsed?: boolean;
  taskStatus?: {
    type: 'task_queued' | 'task_started' | 'task_succeeded' | 'task_failed';
    intent: string;
    runId?: string;
    batchId?: string;
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
}

interface ChatDemoProps {
  currentRoute?: string;
}

const DEMO_ACTIONS = [
  { label: 'Install WordPress', action: 'install_wordpress' },
  { label: 'Check CPU', action: 'check_cpu' },
  { label: 'Check Disk', action: 'check_disk' },
  { label: 'Restart Nginx', action: 'restart_nginx' },
];

export const ChatDemo: React.FC<ChatDemoProps> = ({ currentRoute = '' }) => {
  const { toast } = useToast();
  const { theme } = useTheme();
  
  const [isOpen, setIsOpen] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [unreadBadge, setUnreadBadge] = useState(false);
  const [enableBadge, setEnableBadge] = useState(true);
  const [playSound, setPlaySound] = useState(false);
  const [compactDensity, setCompactDensity] = useState(false);
  const [isDemoEnabled, setIsDemoEnabled] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sessionStartTime = useRef(Date.now());

  // Check if current route should show chat demo
  const shouldShowDemo = isDemoEnabled && !currentRoute.includes('/admin') && !currentRoute.includes('/settings');

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('chatDemoSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setEnableBadge(settings.enableBadge ?? true);
      setPlaySound(settings.playSound ?? false);
      setCompactDensity(settings.compactDensity ?? false);
      setIsDemoEnabled(settings.isDemoEnabled ?? true);
    }

    const savedAgent = localStorage.getItem('chatDemoSelectedAgent');
    if (savedAgent) {
      setSelectedAgent(savedAgent);
    }

    const openState = sessionStorage.getItem(`chatDemo_${currentRoute}`);
    if (openState === 'true') {
      setIsOpen(true);
    }
  }, [currentRoute]);

  // Save settings to localStorage
  const saveSettings = useCallback(() => {
    localStorage.setItem('chatDemoSettings', JSON.stringify({
      enableBadge,
      playSound,
      compactDensity,
      isDemoEnabled
    }));
  }, [enableBadge, playSound, compactDensity, isDemoEnabled]);

  useEffect(() => {
    saveSettings();
  }, [saveSettings]);

  // Load agents
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const { data, error } = await supabase
          .from('agents')
          .select('id, hostname, os, status, agent_type')
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

    if (shouldShowDemo) {
      loadAgents();
    }
  }, [shouldShowDemo, selectedAgent, toast]);

  // Seed demo agent for development
  const seedDemoAgent = async () => {
    try {
      const { data: customerRoles } = await supabase
        .from('user_roles')
        .select('customer_id')
        .limit(1);

      if (customerRoles && customerRoles.length > 0) {
        const customerId = customerRoles[0].customer_id;
        
        const { data: demoAgent, error } = await supabase
          .from('agents')
          .insert({
            customer_id: customerId,
            hostname: 'Demo Server',
            agent_type: 'demo',
            os: 'linux',
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
          description: "A demo agent has been created for testing",
        });
      }
    } catch (error) {
      console.error('Error seeding demo agent:', error);
    }
  };

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'C') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, []);

  // Track open state per route
  useEffect(() => {
    sessionStorage.setItem(`chatDemo_${currentRoute}`, isOpen.toString());
  }, [isOpen, currentRoute]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle agent selection
  const handleAgentChange = (agentId: string) => {
    setSelectedAgent(agentId);
    localStorage.setItem('chatDemoSelectedAgent', agentId);
    // Reset conversation when agent changes
    setConversationId(null);
    setMessages([]);
  };

  // Bootstrap chat session with dashboard authentication
  const bootstrapChat = async () => {
    if (!selectedAgent) return;

    try {
      // Check if we have a recent conversation to reuse
      const timeSinceStart = Date.now() - sessionStartTime.current;
      const withinThirtyMinutes = timeSinceStart < 30 * 60 * 1000;
      
      if (conversationId && withinThirtyMinutes) {
        return conversationId;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      // Call the demo start endpoint using Supabase functions.invoke
      const { data, error } = await supabase.functions.invoke('chat-api', {
        body: {
          path: '/demo/start',
          agent_id: selectedAgent
        },
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      const newConversationId = data.conversation_id;
      setConversationId(newConversationId);
      sessionStartTime.current = Date.now();
      
      // Add welcome message if it's a new conversation
      if (data.created && messages.length === 0) {
        const welcomeMessage: Message = {
          id: 'welcome',
          role: 'assistant',
          content: '👋 Welcome to Chat Demo!\n\nTry asking me to install WordPress, check system resources, or manage services.',
          timestamp: new Date(),
          pending: false
        };
        setMessages([welcomeMessage]);
      }
      
      return newConversationId;
    } catch (error) {
      console.error('Error bootstrapping chat:', error);
      toast({
        title: "Error",
        description: "Failed to start chat session",
        variant: "destructive",
      });
      return null;
    }
  };

  // Send message using demo endpoints
  const sendMessage = async (content: string, isAction = false) => {
    if (!content.trim() || !selectedAgent) return;

    const currentConversationId = await bootstrapChat();
    if (!currentConversationId) return;

    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      pending: false
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      // Call the demo message endpoint using Supabase functions.invoke
      const { data, error } = await supabase.functions.invoke('chat-api', {
        body: {
          path: '/demo/message',
          conversation_id: currentConversationId,
          content: content.trim(),
          is_action: isAction
        },
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      // Add assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'Processing your request...',
        timestamp: new Date(),
        pending: false
      };

      // Handle task events
      if (data.event_type && ['task_queued', 'task_started', 'task_succeeded', 'task_failed'].includes(data.event_type)) {
        assistantMessage.taskStatus = {
          type: data.event_type,
          intent: data.intent || 'unknown',
          runId: data.run_id,
          batchId: data.batch_id
        };
      }

      // Handle preflight blocks
      if (data.state === 'preflight_block' && data.details) {
        assistantMessage.preflightBlocked = {
          details: data.details
        };
        assistantMessage.content = data.response || 'Preflight checks failed. Please address the issues and try again.';
      }

      // Handle needs inputs
      if (data.needs_inputs && data.inputs_schema) {
        assistantMessage.needsInputs = {
          schema: data.inputs_schema,
          defaults: data.inputs_defaults || {},
          missingParams: data.missing_params || []
        };
      } else if (data.needs_inputs && data.missing_param) {
        assistantMessage.quickInputs = getQuickInputsForParam(data.missing_param);
      }

      // Handle input errors
      if (data.state === 'input_error' && data.errors) {
        assistantMessage.inputErrors = data.errors;
        assistantMessage.content = data.message || 'Please correct the errors and try again.';
      }

      setMessages(prev => [...prev, assistantMessage]);

      // Show unread badge if window is closed
      if (!isOpen && enableBadge) {
        setUnreadBadge(true);
        if (playSound) {
          // Play notification sound
          const audio = new Audio('/notification.mp3');
          audio.play().catch(() => {}); // Ignore errors
        }
      }

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
    } finally {
      setIsTyping(false);
    }
  };

  // Get quick input suggestions for parameters
  const getQuickInputsForParam = (param: string): string[] => {
    switch (param) {
      case 'domain':
        return ['example.com', 'mysite.org', 'demo.app'];
      case 'admin_email':
        return ['admin@example.com', 'webmaster@mysite.org'];
      case 'service_name':
        return ['nginx', 'apache2', 'mysql', 'php-fpm'];
      case 'database_name':
        return ['wordpress', 'app_db', 'main_database'];
      default:
        return [];
    }
  };

  // Handle quick input selection
  const handleQuickInput = (input: string) => {
    sendMessage(input);
  };

  // Handle textarea input
  const handleTextareaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  // Copy message to clipboard
  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copied",
        description: "Message copied to clipboard",
      });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Toggle message collapse
  const toggleMessageCollapse = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, collapsed: !msg.collapsed } : msg
    ));
  };

  // Handle preflight retry
  const handlePreflightRetry = () => {
    // Get the last user message that triggered the preflight failure
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (lastUserMessage) {
      sendMessage(lastUserMessage.content);
    }
  };

  // Handle input form submission
  const handleInputFormSubmit = (inputs: Record<string, any>) => {
    // Send synthetic message with inputs
    const syntheticMessage = JSON.stringify({ inputs });
    sendMessage(syntheticMessage);
  };

  // Handle task view
  const handleViewTask = (runId: string) => {
    window.open(`/tasks?run_id=${runId}`, '_blank');
  };

  if (!shouldShowDemo) {
    return null;
  }

  const selectedAgentData = agents.find(a => a.id === selectedAgent);

  return (
    <>
      {/* Floating Launcher */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => {
            setIsOpen(true);
            setUnreadBadge(false);
          }}
          className="relative h-12 px-4 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all duration-200 hover:scale-105"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Chat Demo
          {unreadBadge && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 bg-destructive text-destructive-foreground">
              !
            </Badge>
          )}
        </Button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-full max-w-[420px] h-[560px] md:w-[420px] md:h-[560px] lg:relative lg:bottom-0 lg:right-0 lg:max-w-none">
          <Card className="w-full h-full flex flex-col bg-background border shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">Chat Demo</h3>
                {selectedAgentData && (
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      selectedAgentData.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                    <Select value={selectedAgent} onValueChange={handleAgentChange}>
                      <SelectTrigger className="w-32 h-7 text-xs">
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="space-y-4">
                      <h4 className="font-medium">Demo Settings</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm">Enable Chat Demo</label>
                          <Switch
                            checked={isDemoEnabled}
                            onCheckedChange={setIsDemoEnabled}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-sm">Enable unread badge</label>
                          <Switch
                            checked={enableBadge}
                            onCheckedChange={setEnableBadge}
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
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground">
                  <p className="mb-2">👋 Welcome to Chat Demo!</p>
                  <p className="text-sm">Try asking me to install WordPress, check system resources, or manage services.</p>
                </div>
              )}
              
              {messages.map((message) => (
                <div key={message.id}>
                  <div className={`group flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}>
                    <div className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    } ${compactDensity ? 'p-2 text-sm' : ''}`}>
                      {message.content.split('\n').length > 10 && !message.collapsed ? (
                        <div>
                          <div className="whitespace-pre-wrap">
                            {message.content.split('\n').slice(0, 10).join('\n')}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 h-6 px-2 text-xs"
                            onClick={() => toggleMessageCollapse(message.id)}
                          >
                            <ChevronDown className="w-3 h-3 mr-1" />
                            Show more
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <div className="whitespace-pre-wrap">{message.content}</div>
                          {message.content.split('\n').length > 10 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 h-6 px-2 text-xs"
                              onClick={() => toggleMessageCollapse(message.id)}
                            >
                              <ChevronUp className="w-3 h-3 mr-1" />
                              Show less
                            </Button>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs opacity-70">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 h-5 w-5 p-0"
                          onClick={() => copyMessage(message.content)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Task Status Card */}
                  {message.taskStatus && (
                    <div className="mt-2 ml-8">
                      <TaskStatusCard
                        type={message.taskStatus.type}
                        intent={message.taskStatus.intent}
                        runId={message.taskStatus.runId}
                        batchId={message.taskStatus.batchId}
                        error={message.taskStatus.error}
                        duration={message.taskStatus.duration}
                        onViewTask={handleViewTask}
                      />
                    </div>
                  )}
                  
                  {/* Preflight Block Card */}
                  {message.preflightBlocked && (
                    <div className="mt-2 ml-8">
                      <PreflightBlockCard
                        details={message.preflightBlocked.details}
                        onRetry={handlePreflightRetry}
                        loading={isTyping}
                      />
                    </div>
                  )}
                  
                  {/* Input Form */}
                  {message.needsInputs && (
                    <div className="mt-2 ml-8">
                      <InputForm
                        schema={message.needsInputs.schema}
                        defaults={message.needsInputs.defaults}
                        errors={message.inputErrors}
                        onSubmit={handleInputFormSubmit}
                        loading={isTyping}
                      />
                    </div>
                  )}
                  
                  {/* Quick Input Chips */}
                  {message.quickInputs && (
                    <div className="mt-2 ml-8">
                      <QuickInputChips
                        inputs={message.quickInputs}
                        onInputSelect={handleQuickInput}
                      />
                    </div>
                  )}
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
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
                <Button
                  onClick={() => sendMessage(inputValue)}
                  disabled={!inputValue.trim() || isTyping}
                  size="sm"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Actions
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
        </div>
      )}
    </>
  );
};