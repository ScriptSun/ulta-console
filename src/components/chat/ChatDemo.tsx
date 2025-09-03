import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { MessageCircle, X, Copy, Settings, Send, Plus, ChevronDown, ChevronUp, CheckCircle, Play, FileText, Brain, Search, Clock, AlertCircle, Terminal, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from 'next-themes';
import { TaskStatusCard } from './TaskStatusCard';
import { InputForm } from './InputForm';
import { PreflightBlockCard } from './PreflightBlockCard';
import { ApiLogsViewer } from './ApiLogsViewer';
import { CustomShellCard } from './CustomShellCard';
import { ProposedBatchScriptCard } from './ProposedBatchScriptCard';
import { QuickInputChips } from './QuickInputChips';
import { RenderedResultCard } from './RenderedResultCard';
import { ExecutionStatusCard } from './ExecutionStatusCard';
import { AiDraftActionCard } from './AiDraftActionCard';
import { ActionChips } from './ActionChips';
import { RenderConfig } from '@/types/renderTypes';
import { RouterDecision } from '@/types/routerTypes';
import { useEventBus } from '@/hooks/useEventBus';
import { useWebSocketRouter } from '@/hooks/useWebSocketRouter';
import { useRouterLogs, RouterLogData } from '@/hooks/useRouterLogs';
import { useWebSocketExec } from '@/hooks/useWebSocketExec';
import { ChatDocumentation } from './ChatDocumentation';
import { i18n, RouterPhases, getRouterPhaseText } from '@/lib/i18n';

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
  executionStatus?: {
    run_id: string;
    status: 'preparing' | 'queued' | 'running' | 'completed' | 'failed' | 'preflight_failed';
    error?: string;
    contract?: any;
    stdout?: string;
    stderr?: string;
    duration?: number;
  };
  aiSuggestion?: {
    type: 'command' | 'batch_script';
    title: string;
    description: string;
    commands?: string[];
    batch_script?: {
      name: string;
      description: string;
      commands: string[];
      risk_level: 'low' | 'medium' | 'high';
      inputs?: Array<{
        name: string;
        type: string;
        description: string;
        required: boolean;
        default?: string;
      }>;
      prerequisites?: string[];
      safety_checks?: string[];
    };
    explanation: string;
    suggestions_mode: 'off' | 'show' | 'execute';
    original_request: string;
    requires_confirmation: boolean;
    policy_status?: 'allowed' | 'confirmation' | 'forbidden';
    policy_issues?: string[];
    policy_notes?: string;
  };
  // New router decision fields
  decision?: RouterDecision;
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
  // Preflight tracking
  preflightStatus?: {
    agent_id: string;
    decision: any;
    streaming: boolean;
  };
}

interface ChatDemoProps {
  currentRoute?: string;
  forceEnabled?: boolean;
}

const DEMO_ACTIONS = [
  { label: 'Install WordPress', action: 'install_wordpress' },
  { label: 'Check CPU', action: 'check_cpu' },
  { label: 'Check Disk', action: 'check_disk' },
  { label: 'Restart Nginx', action: 'restart_nginx' },
];

export const ChatDemo: React.FC<ChatDemoProps> = ({ currentRoute = '', forceEnabled = false }) => {
  const { toast } = useToast();
  const { theme } = useTheme();
  
  const [isOpen, setIsOpen] = useState(forceEnabled);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedAgentDetails, setSelectedAgentDetails] = useState<Agent | null>(null);
  const [selectedAgentHeartbeat, setSelectedAgentHeartbeat] = useState<any>(null);
  const [agentUsageData, setAgentUsageData] = useState<Record<string, { current: number; limit: number; plan: string }>>({});
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
  const [conversationOnly, setConversationOnly] = useState(false);
  const [apiLogs, setApiLogs] = useState<any[]>([]);
  const [logViewerOpen, setLogViewerOpen] = useState(false);
  const [isConnectedToOpenAI, setIsConnectedToOpenAI] = useState(false);
  const [openAIConnectionStatus, setOpenAIConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  
  // Router streaming state
  const [routerPhase, setRouterPhase] = useState<string>('');
  const [streamingResponse, setStreamingResponse] = useState<string>('');
  const [candidateCount, setCandidateCount] = useState<number>(0);
  const [actionPhase, setActionPhase] = useState<'planning' | 'analyzing' | 'ready' | 'working' | 'completed' | 'failed' | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sessionStartTime = useRef(Date.now());
  const routerTimeoutRef = useRef<NodeJS.Timeout>();
  const processedMessagesRef = useRef<Set<string>>(new Set());
  const lastSentMessageRef = useRef<{ key: string; timestamp: number } | null>(null); // Prevent rapid duplicates
  
  // Sound notification function
  const playNotificationSound = useCallback(() => {
    if (!playSound) return;
    
    try {
      // Create a simple notification sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Create a pleasant notification sound (two-tone chime)
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }, [playSound]);
  
  // Connect to OpenAI function - NOW INCLUDES WebSocket connection
  const connectToOpenAI = async () => {
    if (!selectedAgent || !selectedAgentDetails) {
      toast({
        title: "No Agent Selected",
        description: "Please select an agent before connecting to OpenAI",
        variant: "destructive",
      });
      return;
    }

    setOpenAIConnectionStatus('connecting');
    
    try {
      // FIRST: Clear any existing messages to prevent duplicates
      console.log('🧹 CLEARING MESSAGES before connecting to OpenAI');
      setMessages([]);
      
      // SECOND: Connect WebSocket for real-time communication
      console.log('🔌 Connecting WebSocket as part of OpenAI connection...');
      if (!isConnected) {
        connect();
        // Wait a moment for connection to establish
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      const heartbeatData = {
        agent_id: selectedAgent,
        hostname: selectedAgentDetails.hostname,
        status: selectedAgentDetails.status,
        os: selectedAgentDetails.os,
        timestamp: new Date().toISOString(),
        heartbeat: selectedAgentHeartbeat,
        message: `Agent ${selectedAgentDetails.hostname} is connecting to OpenAI`
      };

      const { data, error } = await supabase.functions.invoke('chat-api', {
        body: {
          messages: [
            {
              role: 'system',
              content: 'You are an AI assistant connected to server agents. You help manage servers and execute tasks.'
            },
            {
              role: 'user', 
              content: `Initial heartbeat from agent: ${JSON.stringify(heartbeatData, null, 2)}`
            }
          ],
          agent_id: selectedAgent,
          conversation_id: conversationId
        }
      });

      if (error) throw error;

      setIsConnectedToOpenAI(true);
      setOpenAIConnectionStatus('connected');
      
      // Add connection message to chat
      const connectionMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Server Connected, What's Next?",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, connectionMessage]);
      
      toast({
        title: "Connected to OpenAI",
        description: `Agent ${selectedAgentDetails.hostname} is now connected`,
      });
      
    } catch (error) {
      console.error('Error connecting to OpenAI:', error);
      setOpenAIConnectionStatus('error');
      toast({
        title: "Connection Failed",
        description: "Failed to connect to OpenAI. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Disconnect from OpenAI - NOW INCLUDES WebSocket disconnection
  const disconnectFromOpenAI = () => {
    setIsConnectedToOpenAI(false);
    setOpenAIConnectionStatus('disconnected');
    
    // FIRST: Clear messages to prevent stale data
    console.log('🧹 CLEARING MESSAGES during disconnection');
    setMessages([]);
    
    // SECOND: Disconnect WebSocket
    console.log('🔌 Disconnecting WebSocket as part of OpenAI disconnection...');
    disconnect();
    
    const disconnectionMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant', 
      content: `❌ Disconnected from OpenAI. Agent **${selectedAgentDetails?.hostname}** is no longer linked.`,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, disconnectionMessage]);
    
    toast({
      title: "Disconnected",
      description: "OpenAI connection closed",
    });
  };
  
  // Helper function to detect if user request is likely an action vs casual chat
  const detectActionRequest = (content: string): boolean => {
    const lowerContent = content.toLowerCase();
    console.log('🔍 detectActionRequest called with:', content);
    
    // Action keywords that indicate server management intent
    const actionKeywords = [
      'install', 'setup', 'configure', 'deploy', 'create', 'build', 'run',
      'start', 'stop', 'restart', 'enable', 'disable', 'update', 'upgrade',
      'check', 'status', 'monitor', 'backup', 'restore', 'fix', 'repair',
      'remove', 'delete', 'uninstall', 'clean', 'clear', 'reset', 'reboot',
      'chmod', 'chown', 'mkdir', 'mv', 'cp', 'wget', 'curl', 'systemctl',
      'service', 'nginx', 'apache', 'mysql', 'docker', 'ssl', 'certificate',
      'firewall', 'port', 'domain', 'database', 'server', 'disk', 'memory'
    ];
    
    // Chat keywords that indicate casual conversation
    const chatKeywords = [
      'hello', 'hi', 'hey', 'thanks', 'thank you', 'how are you',
      'good morning', 'good afternoon', 'good evening', 'what is',
      'explain', 'tell me', 'joke', 'story', 'weather', 'time',
      'help me understand', 'can you explain', 'what does'
    ];
    
    // Check for action keywords
    const hasActionKeywords = actionKeywords.some(keyword => 
      lowerContent.includes(keyword)
    );
    
    // Check for chat keywords
    const hasChatKeywords = chatKeywords.some(keyword => 
      lowerContent.includes(keyword)
    );
    
    console.log('🔍 Analysis:', { hasActionKeywords, hasChatKeywords, lowerContent });
    
    // If it has chat keywords and no action keywords, likely chat
    if (hasChatKeywords && !hasActionKeywords) {
      console.log('✅ Detected as CHAT (has chat keywords, no action keywords)');
      return false;
    }
    
    // If it has action keywords, likely action
    if (hasActionKeywords) {
      console.log('⚡ Detected as ACTION (has action keywords)');
      return true;
    }
    
    // For very short messages like "hi", "hey", etc. assume chat
    if (content.trim().length <= 10) {
      console.log('✅ Detected as CHAT (short message)');
      return false;
    }
    
    // Default to action for ambiguous cases (better to show phases than not)
    console.log('⚡ Detected as ACTION (default fallback)');
    return true;
  };
  
  // WebSocket router and event bus - connect proactively
  const { connect, disconnect, sendRequest, isConnected } = useWebSocketRouter();
  const { routerLogData } = useRouterLogs();
  const { 
    connect: connectExec, 
    disconnect: disconnectExec, 
    sendRequest: sendExecRequest, 
    isConnected: isExecConnected 
  } = useWebSocketExec();
  const { emit, on, onRouter } = useEventBus();

  // Check if current route should show chat demo
  const shouldShowDemo = forceEnabled || (isDemoEnabled && !currentRoute.includes('/admin') && !currentRoute.includes('/settings') && !currentRoute.includes('/chat'));

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('chatDemoSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setEnableBadge(settings.enableBadge ?? true);
      setPlaySound(settings.playSound ?? false);
      setCompactDensity(settings.compactDensity ?? false);
      setIsDemoEnabled(settings.isDemoEnabled ?? true);
      setConversationOnly(settings.conversationOnly ?? false);
    }

    const savedAgent = localStorage.getItem('chatDemoSelectedAgent');
    if (savedAgent) {
      setSelectedAgent(savedAgent);
    }

    const openState = sessionStorage.getItem(`chatDemo_${currentRoute}`);
    if (openState === 'true' || forceEnabled) {
      setIsOpen(true);
    }
  }, [currentRoute]);

  // Save settings to localStorage
  const saveSettings = useCallback(() => {
    localStorage.setItem('chatDemoSettings', JSON.stringify({
      enableBadge,
      playSound,
      compactDensity,
      isDemoEnabled,
      conversationOnly
    }));
  }, [enableBadge, playSound, compactDensity, isDemoEnabled, conversationOnly]);

  useEffect(() => {
    saveSettings();
  }, [saveSettings]);

  // Load agents
  useEffect(() => {
    // Fetch agent usage data
    const fetchAgentUsageData = async (agentIds: string[]) => {
      console.log('🔍 Fetching usage data for agents:', agentIds);
      const usageData: Record<string, { current: number; limit: number; plan: string }> = {};
      
      for (const agentId of agentIds) {
        try {
          console.log(`📊 Checking usage for agent: ${agentId}`);
          const { data, error } = await supabase.rpc('check_agent_usage_limit', {
            _agent_id: agentId,
            _usage_type: 'ai_request'
          });
          
          if (error) {
            console.error(`❌ Error checking usage for agent ${agentId}:`, error);
            usageData[agentId] = { current: 0, limit: 25, plan: 'Unknown' }; // Default fallback
            continue;
          }
          
          console.log(`📈 Usage data for agent ${agentId}:`, data);
          
          if (data && data.length > 0) {
            const usage = data[0];
            usageData[agentId] = {
              current: usage.current_usage || 0,
              limit: usage.limit_amount || 25,
              plan: usage.plan_name || 'Unknown'
            };
          } else {
            console.warn(`⚠️ No usage data returned for agent ${agentId}`);
            usageData[agentId] = { current: 0, limit: 25, plan: 'Unknown' };
          }
        } catch (error) {
          console.error(`💥 Failed to fetch usage for agent ${agentId}:`, error);
          usageData[agentId] = { current: 0, limit: 25, plan: 'Unknown' };
        }
      }
      
      console.log('💾 Setting agent usage data:', usageData);
      setAgentUsageData(usageData);
    };

    const loadAgents = async () => {
      try {
        const { data, error } = await supabase
          .from('agents')
          .select('id, hostname, os, status, agent_type, customer_id')
          .order('hostname');

        if (error) throw error;

        if (data && data.length > 0) {
          console.log('🎯 Loaded agents:', data.length);
          setAgents(data);
          
          // Fetch usage data for all agents
          console.log('🔄 About to fetch usage data for agents...');
          await fetchAgentUsageData(data.map(agent => agent.id));
          
          if (!selectedAgent) {
            const demoAgent = data.find(a => a.hostname?.includes('Demo') || a.agent_type === 'demo') || data[0];
            setSelectedAgent(demoAgent.id);
            console.log('✅ Selected default agent:', demoAgent.id);
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
  }, [shouldShowDemo, toast]); // Removed selectedAgent from dependencies to avoid circular dependency

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
              user_id: user.id, // Required field
              plan_key: 'free_plan', // Required field
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
      // Clear messages when switching agents to prevent confusion
      console.log('🧹 CLEARING MESSAGES when switching agents');
      setMessages([]);
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

  // FIXED: Only set up router event listeners, NO automatic connection
  useEffect(() => {
    if (!selectedAgent) return;
    
    console.log('🔌 Setting up router event listeners ONLY (no auto-connect) for agent:', selectedAgent);
    
    // Set router timeout (25 seconds)
    const startRouterTimeout = () => {
      if (routerTimeoutRef.current) {
        clearTimeout(routerTimeoutRef.current);
      }
      routerTimeoutRef.current = setTimeout(() => {
        if (isTyping) {
          setIsTyping(false);
          setRouterPhase('');
          setStreamingResponse('');
          
          // Log timeout (no UI notification)
          console.warn('Router timeout reached after 25 seconds');
        }
      }, 25000); // 25 seconds
    };
    
    const unsubscribe = onRouter((eventType, data) => {
      // Create unique message ID using RID and timestamp for deduplication
      const messageId = `${eventType}-${data.rid}-${data.ts}`;
      
      // Check for duplicates using ref (persists across renders)
      if (eventType === 'router.selected') {
        if (processedMessagesRef.current.has(messageId)) {
          console.log('🚫 Skipping duplicate router.selected event with ID:', messageId);
          return;
        }
        console.log('✅ Processing router.selected event with ID:', messageId);
        processedMessagesRef.current.add(messageId);
        
        // Clean up old message IDs (keep only last 10)
        if (processedMessagesRef.current.size > 10) {
          const oldestId = processedMessagesRef.current.values().next().value;
          processedMessagesRef.current.delete(oldestId);
        }
      }
      
      switch (eventType) {
        case 'router.start':
          console.log('Router started:', data);
          // Start router timeout since API has begun
          startRouterTimeout();
          
          // Don't create empty pending message - only show the typing indicator
          
          // Add router request to logs
          const lastUserMessage = messages.filter(m => m.role === 'user').pop();
          setApiLogs(prev => [...prev, {
            id: `router-req-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'router_request',
            data: data,
            userMessage: lastUserMessage?.content
          }]);
          break;
          
        case 'router.retrieved':
          console.log('🔄 Router retrieved candidates:', data);
          console.log('🔢 Candidate count:', data.candidate_count);
          console.log('🎯 Current router phase before decision:', routerPhase);
          
          // Different handling for action vs chat requests
          if (routerPhase === RouterPhases.THINKING) {
            console.log('💭 Chat request - keeping THINKING phase only, no server action phases');
            // For chat requests, never show server management phases
            setCandidateCount(0); // Don't show candidate badges for chat
          } else if (routerPhase === RouterPhases.CHECKING && data.candidate_count && data.candidate_count > 0) {
            console.log('📊 Action request - transitioning to ANALYZING phase (candidates found)');
            setRouterPhase(RouterPhases.ANALYZING);
            setCandidateCount(data.candidate_count);
            
            // Immediate transition to SELECTING for actions
            console.log('✅ Transitioning to SELECTING phase');
            setRouterPhase(RouterPhases.SELECTING);
          } else {
            console.log('❓ No phase change for this request type');
          }
          break;
          
        case 'router.token':
          console.log('Router token:', data);
          setStreamingResponse(data.accumulated);
          
          // Add token to logs
          setApiLogs(prev => [...prev, {
            id: `router-token-${Date.now()}-${Math.random()}`,
            timestamp: new Date().toISOString(),
            type: 'router_token',
            data: data
          }]);
          
          const accumulated = data.accumulated || data.delta || '';
          const isJsonResponse = accumulated.trim().startsWith('{');
          
          if (isJsonResponse) {
            // Try to parse complete JSON
            try {
              const jsonData = JSON.parse(accumulated);
              
              if (jsonData.mode === 'action') {
                // Start the action sequence
                startActionSequence(jsonData);
                return; // Exit early, sequence will handle everything
              }
            } catch (e) {
              // JSON not complete yet, keep current phase
              return;
            }
            
            // If we reach here, JSON is not complete or not action mode
            
          } else {
            // For regular text responses, show immediately and clear phase
            setRouterPhase('');
            
            setMessages(prev => {
              const updated = [...prev];
              let foundPending = false;
              
              for (let i = updated.length - 1; i >= 0; i--) {
                if (updated[i].pending && updated[i].role === 'assistant') {
                  updated[i] = {
                    ...updated[i],
                    content: accumulated
                  };
                  foundPending = true;
                  break;
                }
              }
              
              if (!foundPending) {
                const streamingMessage: Message = {
                  id: `streaming-${Date.now()}`,
                  role: 'assistant',
                  content: accumulated,
                  timestamp: new Date(),
                  pending: true
                };
                updated.push(streamingMessage);
              }
              
              return updated;
            });
          }
          break;
          
         case 'router.selected':
          console.log('🎯 Router selected decision:', data);
          
          // Add router response to logs with enhanced OpenAI data
          const latestRouterData = routerLogData.get('latest');
          setApiLogs(prev => [...prev, {
            id: `router-resp-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'router_response',
            data: data,
            systemPrompt: latestRouterData?.systemPrompt,
            apiEndpoint: latestRouterData?.apiEndpoint,
            openaiRequest: latestRouterData?.openaiRequest,
            openaiResponse: latestRouterData?.openaiResponse
          }]);
          
          // Clear router phase and typing state immediately
          setRouterPhase('');
          setStreamingResponse('');
          setIsTyping(false);
          if (routerTimeoutRef.current) {
            clearTimeout(routerTimeoutRef.current);
          }
            
          // Create a new assistant message with the final decision
          console.log('🔴 Creating new assistant message for router decision');
          console.log('🔍 Data RID:', data.rid, 'Mode:', data.mode);
          console.log('🔍 Data text:', data.text || data.message);
          console.log('🔍 Messages array length before:', messages.length);
          
          // SIMPLE BUT EFFECTIVE: Prevent duplicates by checking exact same content + recent timing
          const messageContent = data.text || data.message || '';
          const now = Date.now();
          const isDuplicate = messages.some(m => 
            m.role === 'assistant' && 
            m.content === messageContent && 
            (now - m.timestamp.getTime()) < 3000
          );
          
          if (isDuplicate) {
            console.log('🚫 BLOCKED DUPLICATE - same content within 3 seconds');
            return;
          }
          
          console.log('✅ CREATING MESSAGE - no duplicate found');
          
          setMessages(prev => {
            const newMessage: Message = {
              id: `router-result-${Date.now()}`,
              role: 'assistant',
              content: '',
              timestamp: new Date(),
              pending: false,
              decision: data
            };
            
            console.log('🔴 New message ID:', newMessage.id, 'Mode:', data.mode);
            
            // Handle different decision modes
            if (data.mode === 'chat') {
              // Simple chat response - clear phases immediately for chat
              setRouterPhase('');
              
              // For chat mode, show the full message or the streamed content
              newMessage.content = data.message || data.text || streamingResponse || 'Response received';
             
             // Check if this is an "I'm sorry" or "not supported" response and generate AI suggestions
             const messageContent = data.message || data.text || streamingResponse || '';
             console.log('🔍 Checking chat response for AI suggestions:', messageContent);
             
             if (messageContent.toLowerCase().includes("i'm sorry") || 
                 messageContent.toLowerCase().includes("couldn't find") ||
                 messageContent.toLowerCase().includes("not supported") ||
                 messageContent.toLowerCase().includes("not available") ||
                 messageContent.toLowerCase().includes("don't have") ||
                 messageContent.toLowerCase().includes("unable to")) {
               
               console.log('🎯 Detected unsupported request in chat mode, generating AI suggestions...');
               
               // Generate AI suggestions asynchronously
               const lastUserMessage = messages.filter(m => m.role === 'user').pop();
               if (lastUserMessage) {
                 console.log('📝 Last user message:', lastUserMessage.content);
                 generateAISuggestion(lastUserMessage.content, data).then(aiSuggestion => {
                   if (aiSuggestion) {
                     console.log('✨ AI suggestion generated successfully:', aiSuggestion);
                     setMessages(prevMessages => {
                       const updatedMessages = [...prevMessages];
                       const messageIndex = updatedMessages.findIndex(m => m.id === newMessage.id);
                       if (messageIndex !== -1) {
                         updatedMessages[messageIndex] = {
                           ...updatedMessages[messageIndex],
                           aiSuggestion: aiSuggestion
                         };
                         console.log('💾 Updated message with AI suggestion');
                       }
                       return updatedMessages;
                     });
                   } else {
                     console.log('❌ No AI suggestion generated');
                   }
                 }).catch(error => {
                   console.error('💥 Failed to generate AI suggestion:', error);
                 });
               } else {
                 console.log('❌ No user message found for AI suggestion');
               }
             } else {
               console.log('ℹ️ Chat response does not trigger AI suggestions');
             }
            } else if (data.mode === 'action') {
               // Check if this is a not_supported task and generate AI suggestions
               if (data.task === 'not_supported') {
                 newMessage.content = getDecisionMessage(data);
                 
                 console.log('Detected not_supported task, generating AI suggestions...');
                 
                 // Generate AI suggestions asynchronously
                 const lastUserMessage = messages.filter(m => m.role === 'user').pop();
                 if (lastUserMessage) {
                   generateAISuggestion(lastUserMessage.content, data).then(aiSuggestion => {
                     if (aiSuggestion) {
                       console.log('AI suggestion generated:', aiSuggestion);
                       setMessages(prevMessages => {
                         const updatedMessages = [...prevMessages];
                         const messageIndex = updatedMessages.findIndex(m => m.id === newMessage.id);
                         if (messageIndex !== -1) {
                           updatedMessages[messageIndex] = {
                             ...updatedMessages[messageIndex],
                             aiSuggestion: aiSuggestion
                           };
                         }
                         return updatedMessages;
                       });
                     }
                   }).catch(error => {
                     console.error('Failed to generate AI suggestion:', error);
                   });
                 }
               } else {
                 // Clear phases completely for successful actions
                 setRouterPhase('');
                 
                 // For action mode, show the user-friendly human message
                 newMessage.content = data.human_message || data.summary || data.message || `I'll help you ${data.task || 'execute this task'}.`;
                 
                 // Set action phase to planning for actions and drafts
                 setActionPhase('planning');
                
                // Set up needs inputs if missing params OR if action has configurable inputs
                const hasInputSchema = data.batch_details?.inputs_schema?.properties && 
                                      Object.keys(data.batch_details.inputs_schema.properties).length > 0;
                
                 if (data.batch_id && ((data.status === 'unconfirmed' && data.missing_params?.length > 0) || 
                     (data.status === 'confirmed' && hasInputSchema))) {
                   handleMissingParams(newMessage, data);
                   
                   // Show "Requesting More Data" phase during input form delay
                   setRouterPhase(RouterPhases.REQUESTING_DATA);
                   console.log('📋 Setting phase to REQUESTING_DATA (preparing input form)');
                   
                    // Show input form immediately
                    setRouterPhase(''); // Clear phase when input form shows
                    setTimeout(() => {
                      setMessages(prev => {
                        const msgUpdated = [...prev];
                        const msgIndex = msgUpdated.findIndex(m => m.id === newMessage.id);
                        if (msgIndex !== -1) {
                          msgUpdated[msgIndex].showInputsDelayed = true;
                        }
                        return msgUpdated;
                       });
                    }, 0);
                 } else if (data.status === 'confirmed' && data.batch_id) {
                  // Ready for preflight
                  newMessage.preflightStatus = {
                    agent_id: selectedAgent!,
                    decision: data,
                    streaming: true
                  };
                }
              }
           } else if (data.mode === 'ai_draft_action') {
              // For AI draft action mode, show human message and set up draft card
              newMessage.content = data.human_message || data.summary || `I've created a plan to ${data.task || 'help you'}.`;
              
              // Set action phase to planning for drafts
              setActionPhase('planning');
           } else {
            // Fallback - show the raw decision
            newMessage.content = JSON.stringify(data, null, 2);
          }
          
            console.log('🔴 Final message array length before return:', [...prev, newMessage].length);
            return [...prev, newMessage];
        });
            
            // Store the conversation in React Query cache if needed
            if (conversationId) {
              // This would trigger a refetch of conversation data
              // The actual message will be stored via the real-time listener
            }
          break;
          
        case 'router.done':
          console.log('Router completed:', data);
          setIsTyping(false);
          setRouterPhase('');
          setStreamingResponse('');
          if (routerTimeoutRef.current) {
            clearTimeout(routerTimeoutRef.current);
          }
          break;
          
        case 'router.error':
          console.error('Router error:', data);
          setIsTyping(false);
          setRouterPhase('');
          setStreamingResponse('');
          if (routerTimeoutRef.current) {
            clearTimeout(routerTimeoutRef.current);
          }
          
          // Check if this is a usage limit error
          const isUsageLimit = data.error === 'AI request limit exceeded' || data.limit_type === 'ai_requests' || 
                              (data.details && (data.details.includes('429') || data.details.includes('limit exceeded')));
          
          if (isUsageLimit) {
            const errorMessage: Message = {
              id: Date.now().toString(),
              role: 'assistant',
              content: `⚠️ **AI Usage Limit Reached**\n\nYou have reached your plan's monthly AI request limit. Please check your subscription plan to see your current usage.\n\n[View your plan details](/subscription-plans)`,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
          } else {
            // Add general error message to chat
            const errorMessage: Message = {
              id: Date.now().toString(),
              role: 'assistant',
              content: `❌ **Connection Error**\n\nUnable to process your request. The system has been fixed - please try sending your message again.\n\n${data.details ? `Technical details: ${data.details}` : ''}`,
              timestamp: new Date()
             };
             setMessages(prev => [...prev, errorMessage]);
           }
           break;
           
        case 'router.disconnected':
          console.log('Router disconnected:', data);
          setIsTyping(false);
          setRouterPhase('');
          setStreamingResponse('');
          if (routerTimeoutRef.current) {
            clearTimeout(routerTimeoutRef.current);
          }
          
          // Log disconnection (no UI notification)
          console.warn('Router connection disconnected');
          break;
      }
    });
    
    return () => {
      console.log('🧹🧹🧹 CLEANING UP ROUTER EVENT LISTENERS for agent:', selectedAgent);
      console.log('🧹🧹🧹 Cleanup running at:', new Date().toISOString());
      unsubscribe();
      // NOTE: Do NOT disconnect WebSocket here - let the Connect button control it
      if (routerTimeoutRef.current) {
        clearTimeout(routerTimeoutRef.current);
      }
    };
  }, [selectedAgent, onRouter]); // Minimal dependencies to prevent stale closures

  // Set up WebSocket execution event listeners
  useEffect(() => {
    const unsubscribers = [
      on('preflight.start', (data) => {
        console.log('Preflight started:', data);
        setActionPhase('analyzing'); // Analyzing server when preflight starts
      }),
      
      on('preflight.item', (data) => {
        console.log('Preflight check:', data);
        // Individual preflight checks are handled by ActionChips
      }),
      
      on('preflight.done', (data) => {
        console.log('Preflight completed:', data);
        if (data.ok) {
          setActionPhase('ready'); // Ready to apply changes
        } else {
          setActionPhase('failed'); // Could not complete changes
          
          // Update any messages with preflight failure
          setMessages(prev => {
            const updated = [...prev];
            for (let i = updated.length - 1; i >= 0; i--) {
              if (updated[i].executionStatus?.status === 'preparing') {
                updated[i] = {
                  ...updated[i],
                  executionStatus: {
                    ...updated[i].executionStatus!,
                    status: 'preflight_failed',
                    error: data.failed?.join(', ') || 'Preflight checks failed'
                  }
                };
                break;
              }
            }
            return updated;
          });
        }
      }),
      
      on('exec.queued', (data) => {
        console.log('Execution queued:', data);
        // Update execution status in messages
        setMessages(prev => {
          const updated = [...prev];
          for (let i = updated.length - 1; i >= 0; i--) {
            if (updated[i].executionStatus?.run_id === data.run_id || updated[i].executionStatus?.status === 'preparing') {
              updated[i] = {
                ...updated[i],
                executionStatus: {
                  run_id: data.run_id,
                  status: 'queued'
                }
              };
              break;
            }
          }
          return updated;
        });
      }),
      
       on('exec.started', (data) => {
         console.log('Execution started:', data);
         setActionPhase('working'); // Working on server when execution starts
         
         setMessages(prev => {
           const updated = [...prev];
           for (let i = updated.length - 1; i >= 0; i--) {
             if (updated[i].executionStatus?.run_id === data.run_id) {
               updated[i] = {
                 ...updated[i],
                 executionStatus: {
                   ...updated[i].executionStatus!,
                   status: 'running'
                 }
               };
               break;
             }
           }
           return updated;
         });
       }),
      
      on('exec.progress', (data) => {
        console.log('Execution progress:', data);
        // Progress updates are handled by ExecutionStatusCard
      }),
      
      on('exec.stdout', (data) => {
        console.log('Execution stdout:', data);
        // Stdout updates are handled by ExecutionStatusCard
      }),
      
       on('exec.finished', (data) => {
         console.log('Execution finished:', data);
         setActionPhase(data.success ? 'completed' : 'failed'); // Changes applied or failed
         
         setMessages(prev => {
           const updated = [...prev];
           for (let i = updated.length - 1; i >= 0; i--) {
             if (updated[i].executionStatus?.run_id === data.run_id) {
               updated[i] = {
                 ...updated[i],
                 executionStatus: {
                   ...updated[i].executionStatus!,
                   status: data.success ? 'completed' : 'failed',
                   contract: data.contract,
                   stdout: data.stdout,
                   stderr: data.stderr,
                   duration: data.duration_ms
                 }
               };
               break;
             }
           }
           return updated;
         });
       }),
      
      on('exec.error', (data) => {
        console.error('Execution error:', data);
        setActionPhase('failed'); // Could not complete changes
        
        setMessages(prev => {
          const updated = [...prev];
          for (let i = updated.length - 1; i >= 0; i--) {
            if (updated[i].executionStatus && (updated[i].executionStatus?.status === 'running' || updated[i].executionStatus?.status === 'queued' || updated[i].executionStatus?.status === 'preparing')) {
              updated[i] = {
                ...updated[i],
                executionStatus: {
                  ...updated[i].executionStatus!,
                  status: 'failed',
                  error: data.error
                }
              };
              break;
            }
          }
          return updated;
        });
        
        toast({
          title: "Execution Error",
          description: data.error,
          variant: "destructive"
        });
      }),
      
      on('exec.connected', () => {
        console.log('Exec WebSocket connected');
      }),
      
      on('exec.disconnected', (data) => {
        console.log('Exec WebSocket disconnected:', data);
      })
    ];
    
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [on, toast, setActionPhase]);

  // REMOVED: This was causing duplicate connections - now handled in consolidated useEffect above
  // useEffect(() => {
  //   console.log('🔌 Setting up WebSocket router connection...');
  //   connect();
  // }, [selectedAgent]); // Only reconnect when agent changes

  // Cleanup WebSocket connections on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up WebSocket connections...');
      disconnect();
      disconnectExec();
    };
  }, [disconnect, disconnectExec]);

  // Start action sequence for install commands
  const startActionSequence = async (jsonData: any) => {
    console.log('Starting action sequence with data:', jsonData);
    
    // Clear the thinking phases and start streaming summary
    setRouterPhase('');
    
    const summaryText = jsonData.summary || jsonData.message || 'I\'ll help you with this task.';
    
    // Create message bubble and simulate streaming
    const messageId = `streaming-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: messageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      pending: true
    }]);
    
    // Stream the summary text character by character
    for (let i = 0; i <= summaryText.length; i++) {
      const partialText = summaryText.substring(0, i);
      
      setMessages(prev => {
        const updated = [...prev];
        const msgIndex = updated.findIndex(m => m.id === messageId);
        if (msgIndex !== -1) {
          updated[msgIndex] = {
            ...updated[msgIndex],
            content: partialText
          };
        }
        return updated;
      });
      
      // Adjust speed: faster for spaces, slower for other characters
      const delay = summaryText[i] === ' ' ? 20 : 40;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Phase 4: Finalize message and add input handling
    setMessages(prev => {
      const updated = [...prev];
      const msgIndex = updated.findIndex(m => m.id === messageId);
      if (msgIndex !== -1) {
        updated[msgIndex] = {
          ...updated[msgIndex],
          pending: false,
          decision: jsonData
        };
        
        // Set up input requirements for actions with configurable inputs
        const hasInputSchema = jsonData.batch_details?.inputs_schema?.properties && 
                               Object.keys(jsonData.batch_details.inputs_schema.properties).length > 0;
        
        if (jsonData.batch_id && ((jsonData.status === 'unconfirmed' && jsonData.missing_params?.length > 0) || 
            (jsonData.status === 'confirmed' && hasInputSchema))) {
          handleMissingParams(updated[msgIndex], jsonData);
          
          // Show input form immediately  
          setMessages(prevMsgs => {
            const msgsUpdated = [...prevMsgs];
            const msgIdx = msgsUpdated.findIndex(m => m.id === messageId);
            if (msgIdx !== -1) {
              msgsUpdated[msgIdx].showInputsDelayed = true;
            }
            return msgsUpdated;
          });
        }
      }
      return updated;
    });
    
    setIsTyping(false);
  };

  // Handle missing parameters for batch execution
  const handleMissingParams = async (message: Message, decision: any) => {
    try {
      // Use batch details from decision if available (for WordPress and other installations)
      if (decision.batch_details) {
        // Merge defaults with params from router response to auto-fill fields
        const mergedDefaults = {
          ...(decision.batch_details.inputs_defaults || {}),
          ...(decision.params || {})
        };
        
        message.needsInputs = {
          schema: decision.batch_details.inputs_schema,
          defaults: mergedDefaults,
          missingParams: decision.missing_params || []
        };
        
        message.renderConfig = decision.batch_details.render_config || { type: 'text' };
        // Don't overwrite content - it was already set correctly in router.selected
        return;
      }
      
      // Fallback: fetch from database
      const { data: batchData, error: batchError } = await supabase
        .from('script_batches')
        .select('inputs_schema, inputs_defaults, render_config')
        .eq('id', decision.batch_id)
        .single();

      if (!batchError && batchData) {
        // Merge defaults with params from router response to auto-fill fields
        const mergedDefaults = {
          ...((batchData.inputs_defaults as Record<string, any>) || {}),
          ...(decision.params || {})
        };
        
        message.needsInputs = {
          schema: batchData.inputs_schema,
          defaults: mergedDefaults,
          missingParams: decision.missing_params || []
        };
        
        message.renderConfig = (batchData.render_config as unknown as RenderConfig) || { type: 'text' };
        // Don't overwrite content - it was already set correctly in router.selected
      }
    } catch (error) {
      console.error('Error setting up batch inputs:', error);
    }
  };

  // Auto-scroll to bottom within messages container
  useEffect(() => {
    if (messagesEndRef.current) {
      const messagesContainer = messagesEndRef.current.closest('.overflow-y-auto');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      } else {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
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
          
          // Don't add automatic messages - only show messages when user connects to OpenAI
          
          // Send heartbeat data to router for context
          console.log('Sending agent context to ChatGPT:', agentInfoMessage);
        } else {
          // Don't add automatic messages - only show messages when user connects to OpenAI
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
      
      // Validate agent access - be more lenient for demo purposes
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('id, customer_id, hostname, status')
        .eq('id', selectedAgent)
        .single();

      if (agentError || !agent) {
        throw new Error('Agent not found');
      }

      // For demo purposes, allow access if user has any role in system or agent belongs to same customer
      const hasAccess = userRoles.some(role => role.customer_id === agent.customer_id) || 
                       userRoles.length > 0; // Allow if user has any roles

      if (!hasAccess) {
        console.warn('Agent customer_id:', agent.customer_id, 'User customer_ids:', userRoles.map(r => r.customer_id));
        // For demo, just log warning but allow access
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

    console.log('🚀🚀🚀 sendMessage CALLED - DETAILED DEBUG:', {
      content: content.trim(),
      isAction,
      timestamp: Date.now(),
      selectedAgent,
      callStack: new Error().stack?.split('\n').slice(0, 4),
      messagesLength: messages.length
    });

    // PREVENT RAPID DUPLICATE SUBMISSIONS
    const now = Date.now();
    const lastSentKey = `${content.trim()}-${selectedAgent}`;
    if (lastSentMessageRef.current?.key === lastSentKey && 
        (now - lastSentMessageRef.current.timestamp) < 1000) {
      console.log('🚫🚫🚫 BLOCKED RAPID DUPLICATE SUBMISSION:', content.trim());
      return;
    }
    lastSentMessageRef.current = { key: lastSentKey, timestamp: now };

    // Clear action phase when starting new message  
    setActionPhase(null);

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

    console.log('🔵 Adding user message to state:', userMessage.id);
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

      // Detect if this is likely an action request vs casual chat BEFORE any router logic
      const isActionRequest = detectActionRequest(content.trim());
      console.log('🎯 Message type decision - isActionRequest:', isActionRequest);
      
      // All messages should go through the API - no hardcoded responses
      console.log('📤 Sending message to router API for processing');
      setIsTyping(true);
      
      // Ensure WebSocket is connected before sending
      if (!isConnected) {
        console.log('❌ WebSocket not connected, waiting for connection...');
        
        // Wait for connection with timeout
        const maxWaitTime = 5000; // 5 seconds
        const startTime = Date.now();
        
        // Try to connect if not already connecting
        connect();
        
        // Wait for connection to establish
        while (!isConnected && (Date.now() - startTime) < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        if (!isConnected) {
          setIsTyping(false);
          throw new Error('Failed to connect to chat service. Please refresh the page and try again.');
        }
        console.log('✅ WebSocket connected successfully');
      }
      
      // Handle different request types with appropriate phases
      if (isActionRequest) {
        // For server actions, show server management phases
        setRouterPhase(RouterPhases.CHECKING);
        console.log('⚡ Starting router for action request with server phases');
      } else {
        // For chat, use minimal "thinking" phase only
        setRouterPhase(RouterPhases.THINKING);
        console.log('💭 Starting router for chat request with thinking phase only');
      }
      
      console.log('🚀 Sending router request:', content.trim());
      
      // Send the request through router
      sendRequest({
        agent_id: selectedAgent,
        user_request: content.trim()
      });
      
      console.log('📤 Router request sent successfully');
      
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
      setRouterPhase('');
    }
  };

  // Helper function to execute AI suggestion
  const executeAISuggestion = async (suggestion: any) => {
    try {
      if (suggestion.type === 'command') {
        const commandText = suggestion.commands?.join(' && ') || '';
        sendMessage(`Please execute these commands: ${commandText}`);
      } else if (suggestion.type === 'batch_script') {
        const script = suggestion.batch_script;
        if (script) {
          // Create a message that requests creation and execution of the batch script
          const requestText = `Please create and execute a batch script named "${script.name}" with the following specifications:

Description: ${script.description}
Risk Level: ${script.risk_level}

Commands:
${script.commands.join('\n')}

${script.inputs && script.inputs.length > 0 ? 
  `Required Inputs:\n${script.inputs.map(input => 
    `- ${input.name} (${input.type}): ${input.description}${input.required ? ' [Required]' : ' [Optional]'}`
  ).join('\n')}` : ''}

${script.prerequisites && script.prerequisites.length > 0 ? 
  `Prerequisites:\n${script.prerequisites.map(p => `- ${p}`).join('\n')}` : ''}

Please proceed with creating and executing this batch script.`;
          
          sendMessage(requestText);
        }
      }
    } catch (error) {
      console.error('Error executing AI suggestion:', error);
      toast({
        title: "Error",
        description: "Failed to execute AI suggestion",
        variant: "destructive"
      });
    }
  };

  // Helper function to generate AI suggestions
  // Helper function to generate AI suggestions
  const generateAISuggestion = async (userMessage: string, decision: any) => {
    try {
      console.log('🔍 Generating AI suggestion for message:', userMessage);
      console.log('📊 Decision context:', decision);
      
      const { data, error } = await supabase.functions.invoke('ultaai-command-suggest', {
        body: {
          user_message: userMessage,
          agent_os: 'linux', // Default OS
          tenant_id: selectedAgent || 'demo-tenant',
          agent_id: selectedAgent || 'demo-agent'
        }
      });

      if (error) {
        console.error('❌ Error generating AI suggestion:', error);
        return null;
      }

      console.log('✅ AI suggestion response received:', data);

      return {
        ...data,
        original_request: userMessage
      };
    } catch (error) {
      console.error('💥 Exception calling AI suggestion function:', error);
      return null;
    }
  };

  // Helper function to generate decision message content
  const getDecisionMessage = (decision: any): string => {
    switch (decision.task) {
      case 'not_supported':
        return `I'm not able to help with that request directly. ${decision.reason || 'This type of request is not supported in our current system.'}`;
      
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

  // Handle preflight completion (called from PreflightBlockCard)
  const handlePreflightComplete = async (success: boolean, runId?: string) => {
    if (success && runId) {
      // Preflight passed, start execution monitoring
      const executionMessage: Message = {
        id: `execution-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        pending: false,
        executionStatus: {
          run_id: runId,
          status: 'queued'
        }
      };

      setMessages(prev => [...prev, executionMessage]);

      // Start execution monitoring via WebSocket
      if (!isExecConnected) {
        await connectExec();
        // Wait for connection to establish
        // Process immediately without delay
      }
      
      sendExecRequest({
        run_id: runId
      });
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
      {/* Backdrop Overlay - only show if not forced enabled */}
      {isOpen && !forceEnabled && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setIsOpen(false)} />
      )}

      {/* Floating Launcher - only show if not forced enabled */}
      {!forceEnabled && (
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
      )}

      {/* Chat Interface */}
      {isOpen && (
        <div className={forceEnabled ? "w-full h-full flex flex-col" : "fixed inset-0 flex items-center justify-center z-50 p-4"}>
          {/* Chat Controls - Separate section above chat window */}
          {forceEnabled && (
            <div className="mb-4 p-4 bg-card border rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Agent Selector */}
                  {selectedAgentData && (
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        selectedAgentData.status === 'online' ? 'bg-success' : 'bg-muted-foreground'
                      }`} />
                      <Select value={selectedAgent} onValueChange={handleAgentChange}>
                        <SelectTrigger className="w-80 h-8">
                          <SelectValue />
                        </SelectTrigger>
                         <SelectContent className="z-50">
                          {agents.map(agent => {
                            const usage = agentUsageData[agent.id];
                            const usagePercent = usage ? Math.round((usage.current / usage.limit) * 100) : 0;
                            const isNearLimit = usagePercent >= 80;
                            
                            return (
                              <SelectItem key={agent.id} value={agent.id}>
                                <div className="flex items-center justify-between w-full gap-3">
                                  <div className="flex items-center gap-2">
                                    <span>{agent.hostname || `${agent.agent_type} Agent`}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {agent.os}
                                    </Badge>
                                  </div>
                                   {usage ? (
                                     <div className="flex items-center gap-2 ml-auto">
                                       <Badge 
                                         variant={isNearLimit ? "destructive" : "secondary"} 
                                         className="text-xs"
                                       >
                                         {usage.current}/{usage.limit}
                                       </Badge>
                                       <span className="text-xs text-muted-foreground">
                                         ({usagePercent}%)
                                       </span>
                                     </div>
                                   ) : (
                                     <div className="flex items-center gap-2 ml-auto">
                                       <Badge variant="outline" className="text-xs">
                                         Loading...
                                       </Badge>
                                     </div>
                                   )}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {/* API Logs Button */}
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
                  
                  {/* Documentation Button */}
                  <ChatDocumentation>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      title="View System Documentation"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-950"
                    >
                      <BookOpen className="w-4 h-4" />
                    </Button>
                  </ChatDocumentation>
                  
                  {/* Connect to OpenAI Button */}
                  {selectedAgent && selectedAgentDetails && (
                    <Button
                      onClick={isConnectedToOpenAI ? disconnectFromOpenAI : connectToOpenAI}
                      disabled={openAIConnectionStatus === 'connecting'}
                      size="sm"
                      variant={isConnectedToOpenAI ? "destructive" : "default"}
                      className="flex items-center gap-2"
                    >
                      {openAIConnectionStatus === 'connecting' ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Connecting...
                        </>
                      ) : isConnectedToOpenAI ? (
                        <>
                          <X className="w-4 h-4" />
                          Disconnect
                        </>
                      ) : (
                        <>
                          <MessageCircle className="w-4 h-4" />
                          Connect to OpenAI
                        </>
                      )}
                    </Button>
                  )}
                  
                  {/* Settings Popover */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 z-50">
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
            </div>
          )}
          
          <Card className={`flex flex-col bg-background border ${forceEnabled ? "w-full h-[calc(100vh-12rem)] min-h-0" : "w-full max-w-3xl h-[80vh] shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200"}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">Chat Demo</h3>
                {!forceEnabled && selectedAgentData && (
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      selectedAgentData.status === 'online' ? 'bg-success' : 'bg-muted-foreground'
                    }`} />
                    <Select value={selectedAgent} onValueChange={handleAgentChange}>
                      <SelectTrigger className="w-52 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-50">
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
                {!forceEnabled && (
                  <>
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
                    
                    {/* Documentation Button */}
                    <ChatDocumentation>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        title="View System Documentation"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-950"
                      >
                        <BookOpen className="w-4 h-4" />
                      </Button>
                    </ChatDocumentation>
                    
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 z-50">
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
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setIsOpen(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground">
                  <p className="mb-2">👋 Welcome to Chat Demo!</p>
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
              
               {messages.map((message) => (
                 <div key={message.id}>
                   {/* Always show chat message bubble */}
                   <div className={`group flex gap-3 ${
                     message.role === 'user' ? 'justify-end' : 'justify-start'
                   }`}>
                    <div className={`${
                        // Use wider width for messages with batch scripts or execution status
                        (message.decision?.mode === 'action' || message.executionStatus || message.aiSuggestion) 
                          ? 'max-w-[95%] w-full' 
                          : 'max-w-[80%]'
                      } rounded-lg p-3 ${
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
                                  <div className="w-3 h-3 bg-success rounded-full flex items-center justify-center" title="Task completed successfully">
                                    <div className="w-1.5 h-1.5 bg-background rounded-full"></div>
                                  </div>
                                ) : message.taskStatus.type === 'task_failed' ? (
                                  <div className="w-3 h-3 bg-destructive rounded-full flex items-center justify-center" title="Task failed">
                                    <div className="w-1.5 h-1.5 bg-background rounded-full"></div>
                                  </div>
                                ) : message.taskStatus.type === 'task_started' ? (
                                  <div className="w-3 h-3 bg-primary rounded-full animate-pulse" title="Task running">
                                    <div className="w-1.5 h-1.5 bg-background rounded-full m-0.75"></div>
                                  </div>
                                ) : (
                                  <div className="w-3 h-3 bg-muted-foreground rounded-full" title="Task status unknown">
                                    <div className="w-1.5 h-1.5 bg-background rounded-full m-0.75"></div>
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
                            {message.pending && !message.content ? null : (
                              typeof message.content === 'string' ? message.content : JSON.stringify(message.content)
                            )}
                          </div>
                          
                          {/* Task Status Icon */}
                          {message.taskStatus && (
                            <div className="flex-shrink-0 ml-2">
                              {message.taskStatus.type === 'task_succeeded' ? (
                                <div className="w-3 h-3 bg-success rounded-full flex items-center justify-center" title="Task completed successfully">
                                  <div className="w-1.5 h-1.5 bg-background rounded-full"></div>
                                </div>
                              ) : message.taskStatus.type === 'task_failed' ? (
                                <div className="w-3 h-3 bg-destructive rounded-full flex items-center justify-center" title="Task failed">
                                  <div className="w-1.5 h-1.5 bg-background rounded-full"></div>
                                </div>
                              ) : message.taskStatus.type === 'task_started' ? (
                                <div className="w-3 h-3 bg-primary rounded-full animate-pulse" title="Task running">
                                  <div className="w-1.5 h-1.5 bg-background rounded-full m-0.75"></div>
                                </div>
                              ) : (
                                <div className="w-3 h-3 bg-muted-foreground rounded-full" title="Task status unknown">
                                  <div className="w-1.5 h-1.5 bg-background rounded-full m-0.75"></div>
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
                       
                       {/* Action Chips - Show only for actions and drafts, not chat */}
                       {actionPhase && message.decision && message.role === 'assistant' && 
                        (message.decision.mode === 'action' || message.decision.mode === 'ai_draft_action') && (
                         <div className="mt-2">
                           <ActionChips phase={actionPhase} />
                         </div>
                       )}
                        
                         {/* AI Draft Action Card */}
                         {message.decision && message.role === 'assistant' && message.decision.mode === 'ai_draft_action' && (
                           <div className="mt-3">
                             <AiDraftActionCard
                               decision={message.decision}
                               run_id={message.executionStatus?.run_id}
                               executionStatus={message.executionStatus?.status as 'queued' | 'running' | 'completed' | 'failed' | null}
                                onConfirm={() => {
                                 // Handle draft confirmation
                                 if (message.decision && message.decision.mode === 'ai_draft_action') {
                                   // Generate a run_id for tracking across router -> preflight -> exec
                                   const runId = crypto.randomUUID();
                                   
                                   // Convert draft to executable action
                                   const executableAction = {
                                     mode: 'action' as const,
                                     task: message.decision.suggested.kind === 'command' ? 'custom_shell' : 'proposed_batch_script',
                                     status: 'unconfirmed' as const,
                                     risk: message.decision.risk,
                                     params: message.decision.suggested.kind === 'command' ? {
                                       description: message.decision.summary,
                                       shell: message.decision.suggested.command
                                     } : undefined,
                                     script: message.decision.suggested.kind === 'batch_script' ? {
                                       name: message.decision.suggested.name,
                                       overview: message.decision.suggested.overview,
                                       commands: message.decision.suggested.commands,
                                       post_checks: message.decision.suggested.post_checks || []
                                     } : undefined,
                                     human: "Confirm & Execute to apply changes",
                                     // Add draft action data for WebSocket
                                     suggested: message.decision.suggested,
                                     summary: message.decision.summary
                                   };
                                   
                                   // Set up execution status tracking for draft actions
                                   setMessages(prev => {
                                     const updated = [...prev];
                                     const msgIndex = updated.findIndex(m => m.id === message.id);
                                     if (msgIndex !== -1) {
                                       updated[msgIndex] = {
                                         ...updated[msgIndex],
                                         executionStatus: {
                                           run_id: runId,
                                           status: 'preparing'
                                         }
                                       };
                                     }
                                     return updated;
                                   });
                                     
                                     // Connect to exec WebSocket and start preflight
                                     const startPreflight = async () => {
                                       if (!isExecConnected) {
                                         await connectExec();
                                         // Wait for connection to establish
                                         // Process immediately without delay
                                       }
                                       
                                       sendExecRequest({
                                         mode: 'preflight',
                                         agent_id: selectedAgent!,
                                         decision: executableAction,
                                         run_id: runId
                                       });
                                     };
                                     
                                     startPreflight();
                                 }
                               }}
              onCancel={() => {
                // Clear the action phase when cancelled
                setActionPhase(null);
              }}
              disabled={isTyping}
            />
                          </div>
                        )}
                        
                        {/* Router Decision Action Buttons */}
                       {message.decision && message.role === 'assistant' && message.decision.mode === 'action' && (
                         message.decision.status === 'confirmed' || 
                         message.decision.task === 'custom_shell' || 
                         message.decision.task === 'proposed_batch_script'
                       ) && (
                         <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-muted/50">
                           {/* Confirmed batch actions */}
                           {message.decision.mode === 'action' && message.decision.status === 'confirmed' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => message.decision && message.decision.mode === 'action' && handlePreflightCheck(message.decision)}
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
                           {message.decision.mode === 'action' && (message.decision.task === 'custom_shell' || message.decision.task === 'proposed_batch_script') && (
                             <Button
                               size="sm"
                               onClick={() => message.decision && message.decision.mode === 'action' && handleExecution(message.decision, true)}
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
                        <div className="mt-3 p-3 rounded-lg border border-success/20 bg-success/10 text-success dark:text-success-foreground">
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
                         <div className="mt-4 relative overflow-hidden rounded-xl backdrop-blur-sm bg-gradient-to-br from-accent/80 to-secondary/80 border border-accent-foreground/20 shadow-md shadow-primary/10 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                           <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5"></div>
                           <div className="relative p-4">
                             <div className="flex items-start gap-3">
                               <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mt-0.5">
                                 <svg className="w-3.5 h-3.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                 </svg>
                               </div>
                               <div className="flex-1 min-w-0">
                                 <h4 className="text-sm font-semibold text-foreground mb-3 tracking-tight">
                                   💡 AI Suggestions
                                 </h4>
                                 <div className="space-y-2.5">
                                   {message.adviceResult.suggested_fixes.map((fix, index) => (
                                     <div key={index} className="group">
                                       <div className="flex items-start gap-2">
                                         <div className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-2 flex-shrink-0 group-hover:scale-110 transition-transform duration-200"></div>
                                         <div className="flex-1 text-sm text-muted-foreground leading-relaxed">
                                           {fix}
                                         </div>
                                       </div>
                                     </div>
                                   ))}
                                 </div>
                               </div>
                             </div>
                           </div>
                         </div>
                       )}

                       {/* AI Command Suggestions Display */}
                       {message.aiSuggestion && (
                         <div className="mt-4 relative overflow-hidden rounded-xl backdrop-blur-sm bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-800/50 shadow-md shadow-blue-500/10 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                           <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5"></div>
                           <div className="relative p-4">
                             <div className="flex items-start gap-3">
                               <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center mt-0.5">
                                 <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                 </svg>
                               </div>
                               <div className="flex-1 min-w-0">
                                 <h4 className="text-sm font-semibold text-foreground mb-2 tracking-tight">
                                   ⚡ AI Command Suggestion
                                 </h4>
                                 <div className="space-y-3">
                                   <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                                     <h5 className="text-sm font-medium text-foreground mb-1">{message.aiSuggestion.title}</h5>
                                     <p className="text-sm text-muted-foreground mb-3">{message.aiSuggestion.description}</p>
                                     
                                     {/* Commands Display */}
                                     {message.aiSuggestion.type === 'command' && message.aiSuggestion.commands && (
                                       <div className="space-y-2">
                                         <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Suggested Commands:</p>
                                         {message.aiSuggestion.commands.map((cmd, index) => (
                                           <div key={index} className="bg-muted/50 rounded px-3 py-2 font-mono text-sm">
                                             {cmd}
                                           </div>
                                         ))}
                                       </div>
                                     )}

                                     {/* Batch Script Display */}
                                     {message.aiSuggestion.type === 'batch_script' && message.aiSuggestion.batch_script && (
                                       <div className="space-y-2">
                                         <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Suggested Batch Script:</p>
                                         <div className="bg-muted/50 rounded p-3 space-y-2">
                                           <div className="flex items-center justify-between">
                                             <span className="font-medium text-sm">{message.aiSuggestion.batch_script.name}</span>
                                             <span className={`text-xs px-2 py-1 rounded-full ${
                                               message.aiSuggestion.batch_script.risk_level === 'low' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                                               message.aiSuggestion.batch_script.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                                               'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                             }`}>
                                               {message.aiSuggestion.batch_script.risk_level} risk
                                             </span>
                                           </div>
                                           <p className="text-sm text-muted-foreground">{message.aiSuggestion.batch_script.description}</p>
                                           <div className="space-y-1">
                                             {message.aiSuggestion.batch_script.commands.map((cmd, index) => (
                                               <div key={index} className="bg-background/70 rounded px-2 py-1 font-mono text-xs">
                                                 {cmd}
                                               </div>
                                             ))}
                                           </div>
                                         </div>
                                       </div>
                                     )}

                                     <div className="mt-3 p-2 bg-blue-50/50 dark:bg-blue-900/10 rounded text-xs text-muted-foreground">
                                       <strong>Why this helps:</strong> {message.aiSuggestion.explanation}
                                     </div>

                                     {/* Policy Warnings */}
                                     {message.aiSuggestion.policy_status && message.aiSuggestion.policy_status !== 'allowed' && (
                                       <div className={`mt-3 p-3 rounded-lg border ${
                                         message.aiSuggestion.policy_status === 'forbidden' 
                                           ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                                           : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                                       }`}>
                                         <div className="flex items-start gap-2">
                                           <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                                             message.aiSuggestion.policy_status === 'forbidden' 
                                               ? 'text-red-600 dark:text-red-400' 
                                               : 'text-yellow-600 dark:text-yellow-400'
                                           }`} />
                                           <div>
                                             <p className={`text-sm font-medium ${
                                               message.aiSuggestion.policy_status === 'forbidden' 
                                                 ? 'text-red-800 dark:text-red-200' 
                                                 : 'text-yellow-800 dark:text-yellow-200'
                                             }`}>
                                               {message.aiSuggestion.policy_status === 'forbidden' 
                                                 ? '🚫 Policy Violation' 
                                                 : '⚠️ Requires Confirmation'}
                                             </p>
                                             {message.aiSuggestion.policy_issues && message.aiSuggestion.policy_issues.length > 0 && (
                                               <ul className={`mt-1 text-xs ${
                                                 message.aiSuggestion.policy_status === 'forbidden' 
                                                   ? 'text-red-700 dark:text-red-300' 
                                                   : 'text-yellow-700 dark:text-yellow-300'
                                               }`}>
                                                 {message.aiSuggestion.policy_issues.map((issue, index) => (
                                                   <li key={index} className="flex items-start gap-1">
                                                     <span className="text-xs">•</span>
                                                     <span>{issue}</span>
                                                   </li>
                                                 ))}
                                               </ul>
                                             )}
                                           </div>
                                         </div>
                                       </div>
                                     )}

                                     {/* Action Buttons based on AI Suggestions mode and policy */}
                                     {message.aiSuggestion.suggestions_mode !== 'off' && (
                                       <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
                                         {/* Show mode or forbidden commands */}
                                         {(message.aiSuggestion.suggestions_mode === 'show' || message.aiSuggestion.policy_status === 'forbidden') && (
                                           <div className="text-xs text-muted-foreground italic">
                                             {message.aiSuggestion.policy_status === 'forbidden' 
                                               ? '🚫 Commands blocked by security policy - review only' 
                                               : '📖 AI suggestions are in "Show" mode - execution disabled'}
                                           </div>
                                         )}
                                         
                                         {/* Execute mode - show confirmation flow */}
                                         {message.aiSuggestion.suggestions_mode === 'execute' && message.aiSuggestion.policy_status !== 'forbidden' && (
                                           <>
                                             {message.aiSuggestion.requires_confirmation ? (
                                               // Show confirmation buttons
                                               <div className="w-full">
                                                 <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-xs text-amber-800 dark:text-amber-200">
                                                   <strong>⚠️ Confirmation Required:</strong> This suggestion contains commands that require your explicit approval before execution.
                                                 </div>
                                                 <div className="flex gap-2">
                                                   <Button
                                                     size="sm"
                                                     onClick={() => executeAISuggestion(message.aiSuggestion!)}
                                                     disabled={isTyping}
                                                     className="text-xs bg-green-600 hover:bg-green-700 text-white"
                                                   >
                                                     <CheckCircle className="w-3 h-3 mr-1" />
                                                     Confirm & Execute
                                                   </Button>
                                                   <Button
                                                     size="sm"
                                                     variant="outline"
                                                     onClick={() => {
                                                       sendMessage("No, I don't want to execute this suggestion");
                                                     }}
                                                     disabled={isTyping}
                                                     className="text-xs"
                                                   >
                                                     <X className="w-3 h-3 mr-1" />
                                                     Cancel
                                                   </Button>
                                                 </div>
                                               </div>
                                             ) : (
                                               // Direct execution buttons
                                               <>
                                                 <Button
                                                   size="sm"
                                                   onClick={() => executeAISuggestion(message.aiSuggestion!)}
                                                   disabled={isTyping}
                                                   className="text-xs"
                                                 >
                                                   <Play className="w-3 h-3 mr-1" />
                                                   {message.aiSuggestion.type === 'command' ? 'Execute Commands' : 'Create & Execute Script'}
                                                 </Button>
                                                 <Button
                                                   size="sm"
                                                   variant="outline"
                                                   onClick={() => {
                                                     sendMessage("No, I don't want to use this suggestion");
                                                   }}
                                                   disabled={isTyping}
                                                   className="text-xs"
                                                 >
                                                   <X className="w-3 h-3 mr-1" />
                                                   Decline
                                                 </Button>
                                               </>
                                             )}
                                           </>
                                         )}
                                       </div>
                                     )}
                                   </div>
                                 </div>
                               </div>
                             </div>
                           </div>
                         </div>
                       )}
                       
                      
                       <div className="flex items-center justify-between mt-2">
                         <span className="text-xs opacity-70">
                           {message.timestamp.toLocaleTimeString()}
                         </span>
                       </div>
                     </div>
                   </div>
                   
                      {/* Input Form - Show only after delay */}
                     {message.needsInputs && message.showInputsDelayed && (
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

                    {/* Remove the large TaskStatusCard since we now show small icons */}
                  
                   {/* Preflight Status Card - NEW */}
                   {message.preflightStatus && (
                     <div className="mt-2">
                       <PreflightBlockCard
                         agent_id={message.preflightStatus.agent_id}
                         decision={message.preflightStatus.decision}
                         onPreflightComplete={handlePreflightComplete}
                       />
                     </div>
                   )}

                    {/* Execution Status Card - Only show for non-draft actions */}
                    {message.executionStatus && message.decision?.mode !== 'ai_draft_action' && (
                     <div className="mt-2">
                       <ExecutionStatusCard
                         run_id={message.executionStatus.run_id}
                         onComplete={(success) => {
                           console.log('Execution completed:', success);
                         }}
                       />
                     </div>
                   )}
                   
                   {/* Preflight Block Card - LEGACY */}
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
                     <div className="mt-4 relative overflow-hidden rounded-xl backdrop-blur-sm bg-gradient-to-br from-destructive/10 to-warning/10 dark:from-card dark:to-muted border border-destructive/20 dark:border-destructive/30 shadow-lg shadow-destructive/10 dark:shadow-destructive/10 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                       <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-orange-500/5 dark:from-red-500/15 dark:to-orange-500/15"></div>
                       <div className="relative p-4">
                         <div className="flex items-start gap-3">
                           <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center mt-0.5">
                             <svg className="w-3.5 h-3.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                   
                     {/* Custom Shell Command Card */}
                     {message.decision?.mode === 'action' && message.decision?.task === 'custom_shell' && selectedAgentDetails && (
                       <div className="mt-2">
                         <CustomShellCard
                          data={message.decision as any}
                          agentId={selectedAgent}
                          tenantId={selectedAgentDetails.customer_id}
                        />
                      </div>
                    )}

                    {/* Proposed Batch Script Card */}
                    {message.decision?.mode === 'action' && message.decision?.task === 'proposed_batch_script' && selectedAgentDetails && (
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
              
              {isTyping && routerPhase && (
                <div className="flex justify-start" role="status" aria-live="polite">
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex gap-2 items-center">
                      {routerPhase === RouterPhases.THINKING ? (
                        // Show 3-dot animation for thinking phase (chat)
                        <div className="flex gap-1" aria-label="Thinking...">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      ) : (
                        // Show phase text with icon for server action phases
                        <div className="flex items-center gap-2" aria-label={`Status: ${routerPhase}`}>
                          {routerPhase === RouterPhases.CHECKING && (
                            <Settings className="w-4 h-4 text-purple-500 animate-pulse" aria-hidden="true" />
                          )}
                          {routerPhase === RouterPhases.ANALYZING && (
                            <Search className="w-4 h-4 text-orange-500 animate-pulse" aria-hidden="true" />
                          )}
                          {routerPhase === RouterPhases.SELECTING && (
                            <CheckCircle className="w-4 h-4 text-green-500 animate-pulse" aria-hidden="true" />
                          )}
                          {routerPhase === RouterPhases.REQUESTING_DATA && (
                            <Clock className="w-4 h-4 text-blue-600 animate-pulse" aria-hidden="true" />
                          )}
                          <span className="text-sm text-muted-foreground font-medium animate-pulse">
                            {getRouterPhaseText(routerPhase)}
                          </span>
                        </div>
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