import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { MessageCircle, X, Copy, Settings, Send, Plus, ChevronDown, ChevronUp, CheckCircle, Play, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from 'next-themes';
import { TaskStatusCard } from './TaskStatusCard';
import { QuickInputChips } from './QuickInputChips';
import { InputForm } from './InputForm';
import { PreflightBlockCard } from './PreflightBlockCard';
import { ApiLogsViewer } from './ApiLogsViewer';
import { CustomShellCard } from './CustomShellCard';
import { ProposedBatchScriptCard } from './ProposedBatchScriptCard';

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
  const [selectedAgentDetails, setSelectedAgentDetails] = useState<Agent | null>(null);
  const [selectedAgentHeartbeat, setSelectedAgentHeartbeat] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [unreadBadge, setUnreadBadge] = useState(false);
  const [enableBadge, setEnableBadge] = useState(true);
  const [playSound, setPlaySound] = useState(false);
  const [compactDensity, setCompactDensity] = useState(false);
  const [isDemoEnabled, setIsDemoEnabled] = useState(true);
  const [enableRealTime, setEnableRealTime] = useState(true);
  const [autoClear, setAutoClear] = useState(false);
  const [showUnreadBadge, setShowUnreadBadge] = useState(true);
  const [apiLogs, setApiLogs] = useState<any[]>([]);
  const [logViewerOpen, setLogViewerOpen] = useState(false);
  
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
              hostname: 'Ubuntu Demo Server',
              agent_type: 'demo',
              os: 'ubuntu', // Explicitly set to ubuntu for test case
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

  // Load agent details and heartbeat when selectedAgent changes
  useEffect(() => {
    if (selectedAgent && shouldShowDemo) {
      fetchAgentDetailsAndHeartbeat(selectedAgent);
    }
  }, [selectedAgent, shouldShowDemo]);

  // Set up WebSocket listener for task updates and real-time chat events
  useEffect(() => {
    if (!selectedAgent || !conversationId) return;

    // Listen to chat events for real-time task updates
    const eventsChannel = supabase
      .channel('chat-events-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_events',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('Real-time chat event:', payload.new);
          
          const event = payload.new;
          if (['task_queued', 'task_started', 'task_succeeded', 'task_failed'].includes(event.type)) {
            // Update the last assistant message with the new task status
            setMessages(prev => {
              const updated = [...prev];
              // Find the last assistant message
              for (let i = updated.length - 1; i >= 0; i--) {
                const msg = updated[i];
                if (msg.role === 'assistant' && !msg.taskStatus) {
                  // Add or update task status
                  msg.taskStatus = {
                    type: event.type as any,
                    intent: event.payload?.intent || 'unknown',
                    runId: event.ref_id,
                    batchId: event.payload?.batch_id,
                    summary: event.payload?.batch_name || 'Task in progress',
                    progress: event.payload?.progress,
                    contract: event.payload?.contract,
                    error: event.payload?.error,
                    duration: event.payload?.duration_sec
                  };
                  break;
                } else if (msg.role === 'assistant' && msg.taskStatus?.runId === event.ref_id) {
                  // Update existing task status
                  msg.taskStatus = {
                    ...msg.taskStatus,
                    type: event.type as any,
                    progress: event.payload?.progress || msg.taskStatus.progress,
                    contract: event.payload?.contract || msg.taskStatus.contract,
                    error: event.payload?.error || msg.taskStatus.error,
                    duration: event.payload?.duration_sec || msg.taskStatus.duration
                  };
                  break;
                }
              }
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventsChannel);
    };
  }, [selectedAgent, conversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch agent details and heartbeat when agent is selected
  const fetchAgentDetailsAndHeartbeat = async (agentId: string) => {
    try {
      console.log('Fetching agent details and heartbeat for:', agentId);
      
      // Fetch complete agent details including heartbeat
      const { data: agentDetails, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (agentError) {
        console.error('Error fetching agent details:', agentError);
        toast({
          title: "Error",
          description: "Failed to fetch agent details",
          variant: "destructive",
        });
        return;
      }

      if (agentDetails) {
        console.log('Agent details fetched:', agentDetails);
        setSelectedAgentDetails(agentDetails);
        setSelectedAgentHeartbeat(agentDetails.heartbeat);

        // Send agent info and heartbeat to ChatGPT to start new conversation
        if (agentDetails.heartbeat && Object.keys(agentDetails.heartbeat).length > 0) {
          const agentInfoMessage = `New agent selected: ${agentDetails.hostname || agentDetails.agent_type} (${agentDetails.os}). Current status: ${agentDetails.status}. Latest heartbeat data: ${JSON.stringify(agentDetails.heartbeat, null, 2)}`;
          
          // Add system message about agent selection
          const systemMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `🔄 Connected to agent: **${agentDetails.hostname || agentDetails.agent_type}**\n\n📊 **System Info:**\n- OS: ${agentDetails.os}\n- Status: ${agentDetails.status}\n- Type: ${agentDetails.agent_type}\n- Last seen: ${agentDetails.last_heartbeat ? new Date(agentDetails.last_heartbeat).toLocaleString() : 'Never'}\n\n💓 **Latest Heartbeat:**\n\`\`\`json\n${JSON.stringify(agentDetails.heartbeat, null, 2)}\n\`\`\`\n\nHow can I help you manage this system?`,
            timestamp: new Date(),
            pending: false
          };

          setMessages([systemMessage]);
          
          // Send heartbeat data to router for context
          console.log('Sending agent context to ChatGPT:', agentInfoMessage);
        } else {
          // If no heartbeat, just show basic agent info
          const basicInfoMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `🔄 Connected to agent: **${agentDetails.hostname || agentDetails.agent_type}**\n\n📊 **System Info:**\n- OS: ${agentDetails.os}\n- Status: ${agentDetails.status}\n- Type: ${agentDetails.agent_type}\n\n⚠️ No recent heartbeat data available.\n\nHow can I help you manage this system?`,
            timestamp: new Date(),
            pending: false
          };

          setMessages([basicInfoMessage]);
        }
      }
    } catch (error) {
      console.error('Error in fetchAgentDetailsAndHeartbeat:', error);
      toast({
        title: "Error",
        description: "Failed to fetch agent information",
        variant: "destructive",
      });
    }
  };

  // Handle agent selection
  const handleAgentChange = async (agentId: string) => {
    setSelectedAgent(agentId);
    localStorage.setItem('chatDemoSelectedAgent', agentId);
    
    // Reset conversation when agent changes
    setConversationId(null);
    setMessages([]);
    
    // Fetch new agent details and heartbeat, then send to ChatGPT
    if (agentId) {
      await fetchAgentDetailsAndHeartbeat(agentId);
    }
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

      console.log('Starting chat bootstrap for agent:', selectedAgent);

      // Create conversation directly using Supabase client instead of edge function
      // First, get user's customer IDs
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('customer_id')
        .eq('user_id', session.user.id);

      if (rolesError || !userRoles || userRoles.length === 0) {
        throw new Error('No tenant access found');
      }

      const tenantId = userRoles[0].customer_id;
      
      // Validate agent access
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('id, customer_id, hostname, status')
        .eq('id', selectedAgent)
        .single();

      if (agentError || !agent) {
        throw new Error('Agent not found');
      }

      if (agent.customer_id !== tenantId) {
        throw new Error('Agent not accessible');
      }

      console.log('Agent validated:', agent);

      // Check for existing demo conversation (within last 30 minutes)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: existingConversation } = await supabase
        .from('chat_conversations')
        .select('id, created_at')
        .eq('agent_id', selectedAgent)
        .eq('tenant_id', tenantId)
        .eq('user_id', session.user.id)
        .eq('source', 'dashboard_demo')
        .gte('created_at', thirtyMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let newConversationId;

      if (existingConversation) {
        newConversationId = existingConversation.id;
        console.log('Reusing existing conversation:', newConversationId);
      } else {
        // Create new conversation
        const { data: newConversation, error: convError } = await supabase
          .from('chat_conversations')
          .insert({
            tenant_id: tenantId,
            agent_id: selectedAgent,
            user_id: session.user.id,
            source: 'dashboard_demo',
            status: 'open',
            started_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (convError) {
          console.error('Failed to create conversation:', convError);
          throw new Error('Failed to create conversation: ' + convError.message);
        }

        newConversationId = newConversation.id;
        console.log('Created new conversation:', newConversationId);
      }

      setConversationId(newConversationId);
      sessionStartTime.current = Date.now();

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
    setIsTyping(true);

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

      // Normal chat flow - call router/decide
      const { data, error: decisionError } = await supabase.functions.invoke('ultaai-router-decide', {
        body: {
          agent_id: selectedAgent,
          user_request: content.trim()
        }
      });

      if (decisionError) throw decisionError;

      console.log('Router response:', data);

      // Handle dual-mode response
      if (data.mode === 'chat') {
        // Chat mode: add plain text response
        const chatMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.text || 'Hello, how can I help you?',
          timestamp: new Date(),
          pending: false
        };
        setMessages(prev => [...prev, chatMessage]);
        
        // Show unread badge if window is closed
        if (!isOpen && enableBadge) {
          setUnreadBadge(true);
          if (playSound) {
            const audio = new Audio('/notification.mp3');
            audio.play().catch(() => {});
          }
        }
        return;
      }

      // Action mode: process the action JSON
      const decision = data;

      // Extract debug logs if available
      if (decision._debug?.openai_logs) {
        const newLogs = [];
        
        // Add request log
        if (decision._debug.openai_logs.request) {
          newLogs.push({
            id: `${Date.now()}-request`,
            timestamp: decision._debug.openai_logs.request.timestamp || new Date().toISOString(),
            type: 'request',
            data: decision._debug.openai_logs.request,
            userMessage: content.trim()
          });
        }
        
        // Add response log
        if (decision._debug.openai_logs.response) {
          newLogs.push({
            id: `${Date.now()}-response`,
            timestamp: decision._debug.openai_logs.response.timestamp || new Date().toISOString(),
            type: 'response',
            data: decision._debug.openai_logs.response,
            userMessage: content.trim()
          });
        }
        
        // Add error log if exists
        if (decision._debug.openai_logs.error) {
          newLogs.push({
            id: `${Date.now()}-error`,
            timestamp: decision._debug.openai_logs.error.timestamp || new Date().toISOString(),
            type: 'error',
            data: decision._debug.openai_logs.error,
            userMessage: content.trim()
          });
        }
        
        // Store logs in state
        setApiLogs(prev => [...prev, ...newLogs]);
        
        console.log('📊 OpenAI API Logs captured:', newLogs);
      }

      // Store logs and clean decision for message
      const cleanDecision = { ...decision };
      delete cleanDecision._debug;

      // Show human message if available, then the action JSON
      if (data.human) {
        const humanMessage: Message = {
          id: (Date.now() + 0.5).toString(),
          role: 'assistant',
          content: data.human,
          timestamp: new Date(),
          pending: false
        };
        setMessages(prev => [...prev, humanMessage]);
      }

      // Add assistant message with decision (show raw JSON for debugging)
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: typeof cleanDecision === 'string' ? cleanDecision : JSON.stringify(cleanDecision, null, 2),
        timestamp: new Date(),
        pending: false,
        decision: cleanDecision
      };

      // If decision has missing_params, set up needsInputs for form rendering
      if (cleanDecision.status === 'unconfirmed' && cleanDecision.missing_params && cleanDecision.batch_id) {
        try {
          // Fetch batch schema to set up the input form
          const { data: batchData, error: batchError } = await supabase
            .from('script_batches')
            .select('inputs_schema, inputs_defaults')
            .eq('id', cleanDecision.batch_id)
            .single();

          if (!batchError && batchData) {
            assistantMessage.needsInputs = {
              schema: batchData.inputs_schema,
              defaults: (batchData.inputs_defaults as Record<string, any>) || {},
              missingParams: cleanDecision.missing_params
            };

            // Don't show additional message since the form handles its own messaging
            assistantMessage.content = '';
          }
        } catch (error) {
          console.error('Error fetching batch schema:', error);
        }
      }

      // Handle not_supported case - get advice
      if (cleanDecision.task === 'not_supported') {
        try {
          const { data: adviceData, error: adviceError } = await supabase.functions.invoke('ultaai-advice', {
            body: {
              reason: cleanDecision.reason || 'Request not supported',
              heartbeat_small: {} // Could get real heartbeat here
            }
          });

          if (!adviceError && adviceData) {
            assistantMessage.adviceResult = adviceData;
            assistantMessage.content = `${assistantMessage.content}\n\n💡 AI Suggestion: ${adviceData.message}`;
          }
        } catch (error) {
          console.error('Error getting advice:', error);
        }
      }

      setMessages(prev => [...prev, assistantMessage]);

      // Show unread badge if window is closed
      if (!isOpen && enableBadge) {
        setUnreadBadge(true);
        if (playSound) {
          const audio = new Audio('/notification.mp3');
          audio.play().catch(() => {});
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

  // Helper function to generate decision message content
  const getDecisionMessage = (decision: any): string => {
    switch (decision.task) {
      case 'not_supported':
        return `I'm not able to help with that request. ${decision.reason || 'This type of request is not supported.'}`;
      
      case 'custom_shell':
        return `I can run this command: \`${decision.params?.shell}\`\nThis will ${decision.params?.description || 'execute the command'}.`;
      
      case 'proposed_batch':
        return `I can create a new batch called "${decision.batch?.name}" to ${decision.batch?.description || 'handle your request'}. This is a ${decision.batch?.risk || 'medium'} risk operation.`;
      
      default:
        // Confirmed batch
        if (decision.status === 'confirmed') {
          return `I can help you with that! I found a suitable batch (${decision.task}) to handle your request. This is a ${decision.risk || 'medium'} risk operation.`;
        }
        return `I found a batch to handle your request: ${decision.task}`;
    }
  };

  // Helper function to generate execution message content
  const getExecutionMessage = (execResult: any): string => {
    switch (execResult.status) {
      case 'success':
        return `✅ Task completed successfully!`;
      case 'awaiting_confirm':
        return `⏳ ${execResult.message || 'Confirmation required before proceeding.'}`;
      case 'rejected':
        return `❌ Task rejected: ${execResult.reason || 'Operation not permitted.'}`;
      case 'error':
        return `🚨 Error: ${execResult.reason || 'An error occurred during execution.'}`;
      default:
        return `Status: ${execResult.status}`;
    }
  };

  // Handle preflight check
  const handlePreflightCheck = async (decision: any) => {
    if (!selectedAgent) return;

    setIsTyping(true);
    try {
      const { data: preflightData, error: preflightError } = await supabase.functions.invoke('ultaai-preflight-run', {
        body: {
          agent_id: selectedAgent,
          decision: decision
        }
      });

      if (preflightError) throw preflightError;

      // Add preflight result message
      const preflightMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: preflightData.preflight_ok 
          ? '✅ All preflight checks passed! You can proceed with execution.'
          : '❌ Some preflight checks failed. Please address the issues before proceeding.',
        timestamp: new Date(),
        pending: false,
        preflightResult: preflightData
      };

      setMessages(prev => [...prev, preflightMessage]);
    } catch (error) {
      console.error('Error running preflight:', error);
      toast({
        title: "Error",
        description: "Failed to run preflight checks",
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
    }
  };

  // Handle execution
  const handleExecution = async (decision: any, confirmFlag = false) => {
    if (!selectedAgent) return;

    setIsTyping(true);
    try {
      const { data: execData, error: execError } = await supabase.functions.invoke('ultaai-exec-run', {
        body: {
          agent_id: selectedAgent,
          decision: decision,
          confirm: confirmFlag
        }
      });

      if (execError) throw execError;

      // Add execution result message
      const execMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: getExecutionMessage(execData),
        timestamp: new Date(),
        pending: false,
        executionResult: execData
      };

      setMessages(prev => [...prev, execMessage]);
    } catch (error) {
      console.error('Error executing:', error);
      toast({
        title: "Error",
        description: "Failed to execute task",
        variant: "destructive",
      });
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
      case 'db_name':
        return ['wordpress', 'wp_blog', 'site_db'];
      case 'db_user':
        return ['wpuser', 'dbadmin', 'webapp'];
      case 'db_pass':
        return ['Generate secure password'];
      case 'php_version':
        return ['8.1', '8.2', '8.3'];
      case 'service_name':
        return ['nginx', 'apache2', 'mysql', 'php-fpm'];
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
    // Map field names from database schema to what chat API expects
    const mappedInputs = { ...inputs };
    
    // WordPress field name mappings
    if (mappedInputs.wp_admin_email) {
      mappedInputs.admin_email = mappedInputs.wp_admin_email;
      delete mappedInputs.wp_admin_email;
    }
    if (mappedInputs.wp_title) {
      mappedInputs.wp_title = mappedInputs.wp_title; // Keep as is
    }
    if (mappedInputs.wp_admin_user) {
      mappedInputs.wp_admin_user = mappedInputs.wp_admin_user; // Keep as is
    }
    
    console.log('Original inputs:', inputs);
    console.log('Mapped inputs for API:', mappedInputs);
    
    // Send synthetic message with mapped inputs
    const syntheticMessage = JSON.stringify({ inputs: mappedInputs });
    sendMessage(syntheticMessage);
  };

  // Handle task view - navigate to batch run detail page
  const handleViewTask = (runId: string) => {
    // Navigate to batch run detail page with conversation context
    window.open(`/scripts/batches/runs/${runId}?from=conversation`, '_blank');
  };

  if (!shouldShowDemo) {
    return null;
  }

  const selectedAgentData = agents.find(a => a.id === selectedAgent);

  return (
    <>
      {/* Backdrop Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setIsOpen(false)} />
      )}

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

      {/* Center Chat Popup */}
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl h-[80vh] flex flex-col bg-background border shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
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
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setLogViewerOpen(true)}
                  title="View OpenAI API Logs"
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
                          <label className="text-sm">Show Unread Badge</label>
                          <Switch
                            checked={showUnreadBadge}
                            onCheckedChange={setShowUnreadBadge}
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
                   {/* Only show chat message bubble if there's no input form needed */}
                   {!message.needsInputs && (
                     <div className={`group flex gap-3 ${
                       message.role === 'user' ? 'justify-end' : 'justify-start'
                     }`}>
                       <div className={`max-w-[80%] rounded-lg p-3 ${
                         message.role === 'user'
                           ? 'bg-primary text-primary-foreground'
                           : 'bg-muted'
                       } ${compactDensity ? 'p-2 text-sm' : ''}`}>
                      {typeof message.content === 'string' && message.content.split('\n').length > 10 && !message.collapsed ? (
                        <div>
                          <div className="flex items-start gap-2">
                            <div className="flex-1 whitespace-pre-wrap">
                              {message.content.split('\n').slice(0, 10).join('\n')}
                            </div>
                            
                            {/* Task Status Icon */}
                            {message.taskStatus && (
                              <div className="flex-shrink-0 ml-2">
                                {message.taskStatus.type === 'task_succeeded' ? (
                                  <div className="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center" title="Task completed successfully">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                  </div>
                                ) : message.taskStatus.type === 'task_failed' ? (
                                  <div className="w-3 h-3 bg-red-500 rounded-full flex items-center justify-center" title="Task failed">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                  </div>
                                ) : message.taskStatus.type === 'task_started' ? (
                                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" title="Task running">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full m-0.75"></div>
                                  </div>
                                ) : (
                                  <div className="w-3 h-3 bg-gray-400 rounded-full" title="Task status unknown">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full m-0.75"></div>
                                  </div>
                                )}
                              </div>
                            )}
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
                        <div className="flex items-start gap-2">
                          <div className="flex-1 whitespace-pre-wrap">
                            {typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}
                          </div>
                          
                          {/* Task Status Icon */}
                          {message.taskStatus && (
                            <div className="flex-shrink-0 ml-2">
                              {message.taskStatus.type === 'task_succeeded' ? (
                                <div className="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center" title="Task completed successfully">
                                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                </div>
                              ) : message.taskStatus.type === 'task_failed' ? (
                                <div className="w-3 h-3 bg-red-500 rounded-full flex items-center justify-center" title="Task failed">
                                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                </div>
                              ) : message.taskStatus.type === 'task_started' ? (
                                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" title="Task running">
                                  <div className="w-1.5 h-1.5 bg-white rounded-full m-0.75"></div>
                                </div>
                              ) : (
                                <div className="w-3 h-3 bg-gray-400 rounded-full" title="Task status unknown">
                                  <div className="w-1.5 h-1.5 bg-white rounded-full m-0.75"></div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {typeof message.content === 'string' && message.content.split('\n').length > 10 && (
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
                      
                      {/* Router Decision Action Buttons */}
                      {message.decision && message.role === 'assistant' && (
                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-muted/50">
                          {/* Confirmed batch actions */}
                          {message.decision.status === 'confirmed' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePreflightCheck(message.decision)}
                                disabled={isTyping}
                                className="text-xs"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Preflight
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleExecution(message.decision, true)}
                                disabled={isTyping}
                                className="text-xs"
                              >
                                <Play className="w-3 h-3 mr-1" />
                                Execute
                              </Button>
                            </>
                          )}
                          
                          {/* Custom shell or proposed batch actions */}
                          {(message.decision.task === 'custom_shell' || message.decision.task === 'proposed_batch') && (
                            <Button
                              size="sm"
                              onClick={() => handleExecution(message.decision, true)}
                              disabled={isTyping}
                              className="text-xs"
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Execute & Confirm
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Preflight Results Display */}
                      {message.preflightResult && (
                        <div className="mt-3 p-3 rounded-lg border border-success/20 bg-success/10 text-success-foreground">
                          <div className="text-sm font-medium mb-2">
                            Preflight Result: {message.preflightResult.preflight_ok ? '✅ Passed' : '❌ Failed'}
                          </div>
                          {message.preflightResult.failed && message.preflightResult.failed.length > 0 && (
                            <div className="space-y-1">
                              {message.preflightResult.failed.map((failure, index) => (
                                <div key={index} className="text-xs bg-red-100 dark:bg-red-900 px-2 py-1 rounded">
                                  {failure}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Execution Results Display */}
                      {message.executionResult && (
                        <div className="mt-3 p-3 rounded-lg border bg-muted/50">
                          <div className="text-sm font-medium mb-2">
                            Execution: {message.executionResult.status}
                          </div>
                          <pre className="text-xs bg-background p-2 rounded overflow-auto">
                            {JSON.stringify(message.executionResult, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* AI Advice Display */}
                      {message.adviceResult && (
                        <div className="mt-3 p-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200">
                          <div className="text-sm font-medium mb-2 text-yellow-900 dark:text-yellow-100">💡 AI Suggestions:</div>
                          {message.adviceResult.suggested_fixes.map((fix, index) => (
                            <div key={index} className="text-xs bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded mb-1 text-yellow-800 dark:text-yellow-200">
                              {fix}
                            </div>
                          ))}
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
                          onClick={() => copyMessage(typeof message.content === 'string' ? message.content : JSON.stringify(message.content))}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                       </div>
                     </div>
                   </div>
                   )}
                   
                   {/* Remove the large TaskStatusCard since we now show small icons */}
                  
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
                  
                   {/* Input Errors Display */}
                   {message.inputErrors && Object.keys(message.inputErrors).length > 0 && (
                     <div className="mt-4 relative overflow-hidden rounded-xl backdrop-blur-sm bg-gradient-to-br from-red-50/80 to-orange-50/80 dark:from-slate-800/90 dark:to-slate-900/90 border border-red-200/60 dark:border-red-500/30 shadow-lg shadow-red-100/50 dark:shadow-red-500/10 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                       <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-orange-500/5 dark:from-red-500/15 dark:to-orange-500/15"></div>
                       <div className="relative p-4">
                         <div className="flex items-start gap-3">
                           <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center mt-0.5">
                             <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                             </svg>
                           </div>
                           <div className="flex-1 min-w-0">
                             <h4 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-3 tracking-tight">
                               Please correct the following:
                             </h4>
                             <ul className="space-y-2.5">
                               {Object.entries(message.inputErrors).map(([field, error]) => (
                                 <li key={field} className="flex items-start gap-2 group">
                                   <div className="w-1.5 h-1.5 rounded-full bg-red-400 dark:bg-red-500 mt-2 flex-shrink-0 group-hover:scale-110 transition-transform duration-200"></div>
                                   <div className="flex-1">
                                     <span className="font-medium text-red-800 dark:text-red-200 text-sm">{field}:</span>
                                     <span className="text-red-700 dark:text-red-300 text-sm ml-1">{error}</span>
                                   </div>
                                 </li>
                               ))}
                             </ul>
                           </div>
                         </div>
                       </div>
                     </div>
                   )}
                   
                     {/* Input Form */}
                    {message.needsInputs && (
                      <div className="mt-2">
                        <InputForm
                          schema={message.needsInputs.schema}
                          defaults={message.needsInputs.defaults}
                          errors={message.inputErrors}
                          onSubmit={handleInputFormSubmit}
                          loading={isTyping}
                        />
                      </div>
                    )}

                    {/* Custom Shell Command Card */}
                    {message.decision?.task === 'custom_shell' && selectedAgentDetails && (
                      <div className="mt-2">
                        <CustomShellCard
                          data={message.decision as any}
                          agentId={selectedAgent}
                          tenantId={selectedAgentDetails.customer_id}
                        />
                      </div>
                    )}

                    {/* Proposed Batch Script Card */}
                    {message.decision?.task === 'proposed_batch_script' && selectedAgentDetails && (
                      <div className="mt-2">
                        <ProposedBatchScriptCard
                          data={message.decision as any}
                          agentId={selectedAgent}
                          tenantId={selectedAgentDetails.customer_id}
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
      
      {/* API Logs Viewer */}
      <ApiLogsViewer
        open={logViewerOpen}
        onOpenChange={setLogViewerOpen}
        logs={apiLogs}
      />
    </>
  );
};