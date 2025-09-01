import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { MessageCircle, X, Copy, Settings, Send, Plus, ChevronDown, ChevronUp, CheckCircle, Play, FileText, Monitor, Smartphone } from 'lucide-react';
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
import { RenderConfig } from '@/types/renderTypes';
import { WidgetTheme, Widget } from '@/hooks/useWidgets';

// Interface definitions (from ChatDemo)
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
  // Router decision fields
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
}

interface EnhancedWidgetPreviewProps {
  widget: Widget | null;
  previewConfig?: {
    name: string;
    theme: WidgetTheme;
  };
}

// Utility function to generate CSS custom properties from theme
const generateThemeCSSProperties = (theme: WidgetTheme): React.CSSProperties => {
  return {
    '--widget-primary': theme.color_primary || '#007bff',
    '--widget-secondary': theme.color_secondary || '#6c757d',
    '--widget-background': theme.color_background || '#ffffff',
    '--widget-surface': theme.color_surface || '#f8f9fa',
    '--widget-muted': theme.color_muted || '#e9ecef',
    '--widget-text': theme.text_color || '#333333',
    '--widget-text-secondary': theme.text_color_secondary || '#6c757d',
    '--widget-border': theme.border_color || '#dee2e6',
    
    '--widget-font-family': theme.font_family || 'system-ui, -apple-system, sans-serif',
    '--widget-font-size': theme.font_size || '14px',
    '--widget-font-size-small': theme.font_size_small || '12px',
    '--widget-font-weight': theme.font_weight || '400',
    
    '--widget-border-radius': theme.border_radius || '8px',
    '--widget-spacing': theme.spacing || '16px',
    
    '--widget-user-bubble': theme.user_bubble_bg || theme.color_primary || '#007bff',
    '--widget-user-bubble-text': theme.user_bubble_text || '#ffffff',
    '--widget-assistant-bubble': theme.assistant_bubble_bg || theme.color_surface || '#f8f9fa',
    '--widget-assistant-bubble-text': theme.assistant_bubble_text || theme.text_color || '#333333',
    
    '--widget-button-primary': theme.button_primary_bg || theme.color_primary || '#007bff',
    '--widget-button-primary-text': theme.button_primary_text || '#ffffff',
    '--widget-button-secondary': theme.button_secondary_bg || theme.color_secondary || '#6c757d',
    '--widget-button-secondary-text': theme.button_secondary_text || '#ffffff',
    
    '--widget-header-bg': theme.header_bg || theme.color_surface || '#f8f9fa',
    '--widget-header-text': theme.header_text || theme.text_color || '#333333',
    
    '--widget-online': theme.online_indicator || '#28a745',
    '--widget-offline': theme.offline_indicator || '#dc3545',
    '--widget-typing': theme.typing_indicator || theme.color_primary || '#007bff',
    
    '--widget-shadow': theme.shadow_intensity === 'none' ? 'none' : 
                     theme.shadow_intensity === 'light' ? '0 2px 4px rgba(0,0,0,0.1)' :
                     theme.shadow_intensity === 'heavy' ? '0 8px 16px rgba(0,0,0,0.2)' :
                     '0 4px 8px rgba(0,0,0,0.15)',
    '--widget-animation-speed': theme.animation_speed || '0.2s',
  } as React.CSSProperties;
};

export function EnhancedWidgetPreview({ widget, previewConfig }: EnhancedWidgetPreviewProps) {
  const { toast } = useToast();
  const { theme } = useTheme();
  
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedAgentDetails, setSelectedAgentDetails] = useState<Agent | null>(null);
  const [selectedAgentHeartbeat, setSelectedAgentHeartbeat] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [apiLogs, setApiLogs] = useState<any[]>([]);
  const [logViewerOpen, setLogViewerOpen] = useState(false);
  const [compactDensity, setCompactDensity] = useState(false);
  const [playSound, setPlaySound] = useState(false);
  const [enableRealTime, setEnableRealTime] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sessionStartTime = useRef(Date.now());

  // Load agents from Supabase
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
          description: "An Ubuntu demo agent has been created for testing",
        });
      }
    } catch (error) {
      console.error('Error seeding demo agent:', error);
    }
  };

  // Load agent details and heartbeat when selectedAgent changes
  useEffect(() => {
    if (selectedAgent) {
      fetchAgentDetailsAndHeartbeat(selectedAgent);
    }
  }, [selectedAgent]);

  // Set up real-time listener for task updates
  useEffect(() => {
    if (!selectedAgent || !conversationId || !enableRealTime) return;

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
              for (let i = updated.length - 1; i >= 0; i--) {
                const msg = updated[i];
                if (msg.role === 'assistant' && !msg.taskStatus) {
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
  }, [selectedAgent, conversationId, enableRealTime]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch agent details and heartbeat when agent is selected
  const fetchAgentDetailsAndHeartbeat = async (agentId: string) => {
    try {
      console.log('Fetching agent details and heartbeat for:', agentId);
      
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

        // Send agent info and heartbeat to start new conversation
        if (agentDetails.heartbeat && Object.keys(agentDetails.heartbeat).length > 0) {
          const systemMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `🔄 Connected to agent: **${agentDetails.hostname || agentDetails.agent_type}**\n\n📊 **System Info:**\n- OS: ${agentDetails.os}\n- Status: ${agentDetails.status}\n- Type: ${agentDetails.agent_type}\n- Last seen: ${agentDetails.last_heartbeat ? new Date(agentDetails.last_heartbeat).toLocaleString() : 'Never'}\n\n💓 **Latest Heartbeat:**\n\`\`\`json\n${JSON.stringify(agentDetails.heartbeat, null, 2)}\n\`\`\`\n\nHow can I help you manage this system?`,
            timestamp: new Date(),
            pending: false
          };

          setMessages([systemMessage]);
        } else {
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
    
    // Reset conversation when agent changes
    setConversationId(null);
    setMessages([]);
    
    // Fetch new agent details and heartbeat
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

      // Create conversation directly using Supabase client
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
        .eq('source', 'widget_preview')
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
            source: 'widget_preview',
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

  // Send message using router functionality (from ChatDemo)
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

      // Add assistant message with decision
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
          // Fetch batch schema and render config to set up the input form
          const { data: batchData, error: batchError } = await supabase
            .from('script_batches')
            .select('inputs_schema, inputs_defaults, render_config')
            .eq('id', cleanDecision.batch_id)
            .single();

          if (!batchError && batchData) {
            assistantMessage.needsInputs = {
              schema: batchData.inputs_schema,
              defaults: (batchData.inputs_defaults as Record<string, any>) || {},
              missingParams: cleanDecision.missing_params
            };
            
            // Store render config for execution results
            assistantMessage.renderConfig = (batchData.render_config as unknown as RenderConfig) || { type: 'text' };

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
      // Get render config from the current batch if available
      let renderConfig: RenderConfig | undefined;
      if (decision.batch_id) {
        try {
          const { data: batchData, error: batchError } = await supabase
            .from('script_batches')
            .select('render_config')
            .eq('id', decision.batch_id)
            .single();
          
          if (!batchError && batchData?.render_config) {
            renderConfig = batchData.render_config as unknown as RenderConfig;
          }
        } catch (error) {
          console.error('Error fetching batch render config:', error);
        }
      }

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
        executionResult: execData,
        renderConfig: renderConfig || { type: 'text' }
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

  const handleSend = () => {
    if (inputValue.trim()) {
      sendMessage(inputValue);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied",
      description: "Message copied to clipboard",
    });
  };

  const toggleMessageCollapse = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, collapsed: !msg.collapsed } : msg
    ));
  };

  // Handle task view - navigate to batch run detail page
  const handleViewTask = (runId: string) => {
    window.open(`/scripts/batches/runs/${runId}?from=conversation`, '_blank');
  };

  if (!widget && !previewConfig) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Widget Preview</h3>
          <p className="text-muted-foreground">
            Configure your widget settings to see the interactive preview
          </p>
        </CardContent>
      </Card>
    );
  }

  const config = previewConfig || widget;
  if (!config) return null;

  const selectedAgentData = agents.find(a => a.id === selectedAgent);
  const themeStyles = generateThemeCSSProperties(config.theme);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Full Chat Widget Preview
            {widget && (
              <Badge variant="secondary" className="text-xs">
                {widget.name}
              </Badge>
            )}
            {previewConfig && !widget && (
              <Badge variant="outline" className="text-xs">
                Live Demo
              </Badge>
            )}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Complete ChatDemo functionality with real agent interactions and your custom theme
          </p>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'desktop' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('desktop')}
              className="h-8 px-3"
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'mobile' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('mobile')}
              className="h-8 px-3"
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Apply comprehensive theme customization */}
          <div
            style={themeStyles}
            className={`widget-themed relative transition-all duration-300 ${
              viewMode === 'desktop' 
                ? 'w-full h-[700px]' 
                : 'w-full h-[700px] max-w-[400px] mx-auto'
            }`}
          >
            {/* Full Chat Interface from ChatDemo */}
            <div className="flex flex-col h-full bg-[var(--widget-background)] border border-[var(--widget-border)] rounded-lg overflow-hidden shadow-[var(--widget-shadow)]">
              {/* Header with full theming */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--widget-border)] bg-[var(--widget-header-bg)]" style={{
                fontFamily: 'var(--widget-font-family)',
                fontSize: 'var(--widget-font-size)'
              }}>
                <div className="flex items-center gap-3">
                  {config.theme.logo_url && (
                    <img src={config.theme.logo_url} alt="Logo" className="h-6 w-6 rounded" />
                  )}
                  <h3 className="font-semibold text-[var(--widget-header-text)]" style={{
                    fontWeight: 'var(--widget-font-weight)'
                  }}>
                    Chat Widget
                  </h3>
                  {selectedAgentData && (
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full`} style={{
                        backgroundColor: selectedAgentData.status === 'online' ? 'var(--widget-online)' : 'var(--widget-offline)'
                      }} />
                      <Select value={selectedAgent} onValueChange={handleAgentChange}>
                        <SelectTrigger className="w-36 h-7 text-xs border-[var(--widget-border)]">
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
                    className="text-[var(--widget-header-text)]"
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
                      <Button variant="ghost" size="sm" className="text-[var(--widget-header-text)]">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64">
                      <div className="space-y-4">
                        <h4 className="font-medium">Demo Settings</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-sm">Real-time Updates</label>
                            <Switch
                              checked={enableRealTime}
                              onCheckedChange={setEnableRealTime}
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
                            <label className="text-sm">Play sound</label>
                            <Switch
                              checked={playSound}
                              onCheckedChange={setPlaySound}
                            />
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Messages Area - Full ChatDemo functionality */}
              <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-[var(--widget-background)]" style={{
                fontFamily: 'var(--widget-font-family)',
                fontSize: 'var(--widget-font-size)',
                padding: compactDensity ? 'var(--widget-spacing)' : 'calc(var(--widget-spacing) * 1.5)'
              }}>
                {/* Welcome Message */}
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <MessageCircle className="w-8 h-8 mx-auto mb-3 text-[var(--widget-text-secondary)]" />
                    <p className="text-[var(--widget-text)] mb-2" style={{
                      fontSize: 'var(--widget-font-size)'
                    }}>
                      {config.theme.welcome_text || '👋 Welcome to Chat Demo!'}
                    </p>
                    <p className="text-sm text-[var(--widget-text-secondary)]">
                      Try asking me to install WordPress, check system resources, or manage services.
                    </p>
                  </div>
                )}

                {/* Messages with Full ChatDemo Functionality */}
                {messages.map((message) => (
                  <div key={message.id}>
                    {/* Only show chat message bubble if there's no input form needed */}
                    {!message.needsInputs && (
                      <div className={`group flex gap-3 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}>
                        <div
                          className={`max-w-[80%] p-3 relative group`}
                          style={{
                            backgroundColor: message.role === 'user' 
                              ? 'var(--widget-user-bubble)' 
                              : 'var(--widget-assistant-bubble)',
                            color: message.role === 'user' 
                              ? 'var(--widget-user-bubble-text)' 
                              : 'var(--widget-assistant-bubble-text)',
                            borderRadius: 'var(--widget-border-radius)',
                            fontSize: 'var(--widget-font-size)',
                            fontFamily: 'var(--widget-font-family)',
                            boxShadow: 'var(--widget-shadow)',
                            transition: `all var(--widget-animation-speed) ease`
                          }}
                        >
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
                  <div className="w-3 h-3 bg-muted-foreground rounded-full" title="Task status unknown">
                    <div className="w-1.5 h-1.5 bg-background rounded-full m-0.75"></div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs opacity-70" style={{
                              fontSize: 'var(--widget-font-size-small)'
                            }}>
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyMessage(message.content)}
                                className="h-6 w-6 p-0"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                              {message.content.length > 100 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleMessageCollapse(message.id)}
                                  className="h-6 w-6 p-0"
                                >
                                  {message.collapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Full ChatDemo Message Components */}
                    {message.taskStatus && (
                      <div style={{ marginLeft: message.role === 'assistant' ? '0' : 'auto', maxWidth: '80%' }}>
                        <TaskStatusCard 
                          {...message.taskStatus}
                          onViewTask={message.taskStatus.runId ? () => handleViewTask(message.taskStatus.runId!) : undefined}
                        />
                      </div>
                    )}

                    {message.needsInputs && (
                      <div style={{ marginLeft: message.role === 'assistant' ? '0' : 'auto', maxWidth: '80%' }}>
                        <InputForm
                          schema={message.needsInputs.schema}
                          defaults={message.needsInputs.defaults}
                          errors={message.inputErrors}
                          onSubmit={handleInputFormSubmit}
                        />
                      </div>
                    )}

                    {message.preflightBlocked && (
                      <div style={{ marginLeft: message.role === 'assistant' ? '0' : 'auto', maxWidth: '80%' }}>
                        <PreflightBlockCard 
                          details={message.preflightBlocked.details}
                          onRetry={() => console.log('Retry preflight')}
                        />
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
                      <div className="mt-3">
                        <RenderedResultCard
                          data={message.executionResult}
                          renderConfig={message.renderConfig || { type: 'text' }}
                          title="Execution Result"
                        />
                      </div>
                    )}

                    {/* AI Advice Display */}
                    {message.adviceResult && (
                      <div className="mt-4 relative overflow-hidden rounded-xl backdrop-blur-sm bg-gradient-to-br from-accent/80 to-secondary/80 border border-accent-foreground/20 shadow-md shadow-primary/10">
                        <div className="relative p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mt-0.5">
                              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-foreground mb-2">💡 AI Suggestions</h4>
                              <p className="text-sm text-muted-foreground mb-3">{message.adviceResult.message}</p>
                              {message.adviceResult.suggested_fixes && message.adviceResult.suggested_fixes.length > 0 && (
                                <div className="space-y-2">
                                  <h5 className="text-xs font-medium text-foreground">Suggested Solutions:</h5>
                                  <div className="space-y-1">
                                    {message.adviceResult.suggested_fixes.map((fix, index) => (
                                      <div key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                                        <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                                        <span>{fix}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="p-3 rounded-lg" style={{
                      backgroundColor: 'var(--widget-assistant-bubble)',
                      borderRadius: 'var(--widget-border-radius)',
                      boxShadow: 'var(--widget-shadow)'
                    }}>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 rounded-full animate-bounce" style={{
                          backgroundColor: 'var(--widget-typing)',
                          animationDelay: '0s'
                        }}></div>
                        <div className="w-2 h-2 rounded-full animate-bounce" style={{
                          backgroundColor: 'var(--widget-typing)',
                          animationDelay: '0.1s'
                        }}></div>
                        <div className="w-2 h-2 rounded-full animate-bounce" style={{
                          backgroundColor: 'var(--widget-typing)',
                          animationDelay: '0.2s'
                        }}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-[var(--widget-border)] bg-[var(--widget-surface)]" style={{
                padding: compactDensity ? 'calc(var(--widget-spacing) * 0.75)' : 'var(--widget-spacing)'
              }}>
                <div className="flex gap-2">
                  <Textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="resize-none min-h-[40px] max-h-[120px] border-[var(--widget-border)] bg-[var(--widget-background)] text-[var(--widget-text)]"
                    style={{
                      borderRadius: 'var(--widget-border-radius)',
                      fontSize: 'var(--widget-font-size)',
                      fontFamily: 'var(--widget-font-family)'
                    }}
                    rows={compactDensity ? 1 : 2}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isTyping}
                    size="sm"
                    className="px-3"
                    style={{
                      backgroundColor: 'var(--widget-button-primary)',
                      color: 'var(--widget-button-primary-text)',
                      borderRadius: 'var(--widget-border-radius)',
                      transition: `all var(--widget-animation-speed) ease`
                    }}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Note */}
          <div className="p-4 bg-muted/50 rounded-b-lg border-t">
            <p className="text-sm text-muted-foreground">
              <strong>Full ChatDemo Integration:</strong> This preview includes complete real-time chat functionality with agent interactions, task execution, preflight checks, and all ChatDemo features. Your custom theme is applied to all interface elements.
            </p>
          </div>
        </CardContent>
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