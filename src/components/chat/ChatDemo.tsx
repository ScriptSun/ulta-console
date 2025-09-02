import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { MessageCircle, X, Copy, Settings, Send, Plus, ChevronDown, ChevronUp, CheckCircle, Play, FileText, Brain, Search, Clock, AlertCircle, Terminal } from 'lucide-react';
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
  
  // Router streaming state
  const [routerPhase, setRouterPhase] = useState<string>('');
  const [streamingResponse, setStreamingResponse] = useState<string>('');
  const [candidateCount, setCandidateCount] = useState<number>(0);
  const [actionPhase, setActionPhase] = useState<'planning' | 'analyzing' | 'ready' | 'working' | 'completed' | 'failed' | null>(null);
  
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

  // Check if current route should show chat demo
  const shouldShowDemo = (forceEnabled || isDemoEnabled) && !currentRoute.includes('/admin') && !currentRoute.includes('/settings');

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

  // Set up WebSocket router event listeners
  useEffect(() => {
    
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
      switch (eventType) {
        case 'router.start':
          console.log('Router started:', data);
          // Start router timeout since API has begun
          startRouterTimeout();
          
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
          console.log('Router retrieved candidates:', data);
          // Phase management now handled in sendMessage
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
              
              if (jsonData.mode === 'action' && jsonData.summary) {
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
          (async () => {
            console.log('Router selected decision:', data);
            setRouterPhase('Selecting installer');
            
            // Add router response to logs
            setApiLogs(prev => [...prev, {
              id: `router-resp-${Date.now()}`,
              timestamp: new Date().toISOString(),
              type: 'router_response',
              data: data
            }]);
            
            // Give a moment for the "Selecting installer" label to show
            await new Promise(resolve => setTimeout(resolve, 500));
            
            setRouterPhase('');
            setStreamingResponse('');
            setIsTyping(false);
            if (routerTimeoutRef.current) {
              clearTimeout(routerTimeoutRef.current);
            }
            
            // Update the last pending message with final decision
            setMessages(prev => {
              const updated = [...prev];
              // Find the most recent pending message
              for (let i = updated.length - 1; i >= 0; i--) {
                if (updated[i].pending && updated[i].role === 'assistant') {
                  updated[i] = {
                    ...updated[i],
                    pending: false,
                    decision: data
                  };
                  
                   // Handle different decision modes
                   if (data.mode === 'chat') {
                     // For chat mode, show the full message or the streamed content
                     updated[i].content = data.message || data.text || streamingResponse || 'Response received';
                     
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
                               const messageIndex = updatedMessages.findIndex(m => m.id === updated[i].id);
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
                        updated[i].content = getDecisionMessage(data);
                        
                        console.log('Detected not_supported task, generating AI suggestions...');
                        
                        // Generate AI suggestions asynchronously
                        const lastUserMessage = messages.filter(m => m.role === 'user').pop();
                        if (lastUserMessage) {
                          generateAISuggestion(lastUserMessage.content, data).then(aiSuggestion => {
                            if (aiSuggestion) {
                              console.log('AI suggestion generated:', aiSuggestion);
                              setMessages(prevMessages => {
                                const updatedMessages = [...prevMessages];
                                const messageIndex = updatedMessages.findIndex(m => m.id === updated[i].id);
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
                        // For action mode, show a more user-friendly summary
                        updated[i].content = data.summary || data.message || `I'll help you ${data.task || 'execute this task'}.`;
                        
                        // Set action phase to planning for actions and drafts
                        setActionPhase('planning');
                        
                        // Set up needs inputs if missing params
                        if (data.status === 'unconfirmed' && data.missing_params && data.batch_id) {
                          handleMissingParams(updated[i], data);
                          
                          // Delay showing input form to allow summary to be visible first
                          setTimeout(() => {
                            setMessages(prev => {
                              const msgUpdated = [...prev];
                              const msgIndex = msgUpdated.findIndex(m => m.id === updated[i].id);
                              if (msgIndex !== -1) {
                                msgUpdated[msgIndex].showInputsDelayed = true;
                              }
                              return msgUpdated;
                            });
                          }, 1000); // 1 second delay
                        } else if (data.status === 'confirmed' && data.batch_id) {
                          // Ready for preflight
                          updated[i].preflightStatus = {
                            agent_id: selectedAgent!,
                            decision: data,
                            streaming: true
                          };
                        }
                      }
                   } else if (data.mode === 'ai_draft_action') {
                      // For AI draft action mode, show summary and set up draft card
                      updated[i].content = data.summary || `I've created a plan to ${data.task || 'help you'}.`;
                      
                      // Set action phase to planning for drafts
                      setActionPhase('planning');
                   } else {
                    // Fallback - show the raw decision
                    updated[i].content = JSON.stringify(data, null, 2);
                  }
                  break;
                }
              }
              return updated;
            });
            
            // Store the conversation in React Query cache if needed
            if (conversationId) {
              // This would trigger a refetch of conversation data
              // The actual message will be stored via the real-time listener
            }
          })();
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
          
          // Update any pending message to show error
          setMessages(prev => {
            const updated = [...prev];
            for (let i = updated.length - 1; i >= 0; i--) {
              if (updated[i].pending && updated[i].role === 'assistant') {
                updated[i] = {
                  ...updated[i],
                  pending: false,
                  content: `I encountered an error: ${data.error}. Please try again.`
                };
                break;
              }
            }
            return updated;
          });
          
          toast({
            title: "Assistant Error",
            description: data.error,
            variant: "destructive"
          });
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
      unsubscribe();
      if (routerTimeoutRef.current) {
        clearTimeout(routerTimeoutRef.current);
      }
    };
  }, [onRouter, toast, selectedAgent, conversationId, streamingResponse, isTyping]);

  // Set up WebSocket execution event listeners
  useEffect(() => {
    const unsubscribers = [
      on('exec.queued', (data) => {
        console.log('Execution queued:', data);
        // Update execution status in messages
        setMessages(prev => {
          const updated = [...prev];
          for (let i = updated.length - 1; i >= 0; i--) {
            if (updated[i].executionStatus?.run_id === data.run_id) {
              updated[i] = {
                ...updated[i],
                executionStatus: {
                  ...updated[i].executionStatus!,
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
         // Set phase based on execution result
         if (data.success) {
           setActionPhase('completed'); // Changes applied on success
         } else {
           setActionPhase('failed'); // Could not complete changes on failure
         }
         
         setMessages(prev => {
           const updated = [...prev];
           for (let i = updated.length - 1; i >= 0; i--) {
             if (updated[i].executionStatus?.run_id === data.run_id) {
               updated[i] = {
                 ...updated[i],
                 executionStatus: {
                   ...updated[i].executionStatus!,
                   status: data.success ? 'completed' : 'failed'
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
        // Log only, no UI notification
      }),
      
       on('preflight.start', (data) => {
         console.log('Preflight started:', data);
         setActionPhase('analyzing'); // Analyzing server when preflight starts
       }),
       
       on('preflight.item', (data) => {
         console.log('Preflight check:', data);
         // Individual preflight checks are handled by PreflightBlockCard
       }),
       
       on('preflight.done', (data) => {
         console.log('Preflight completed:', data);
         // Set phase based on preflight result
         if (data.preflight_ok) {
           setActionPhase('ready'); // Ready to apply changes if preflight passed
         } else {
           setActionPhase('failed'); // Failed if preflight blocked
         }
       }),
      
      on('preflight.error', (data) => {
        console.error('Preflight error:', data);
        toast({
          title: "Preflight Error",
          description: data.error,
          variant: "destructive",
        });
      })
    ];
    
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [on, toast]);

  // Connect WebSocket when component mounts and agent is selected
  useEffect(() => {
    if (selectedAgent && shouldShowDemo) {
      connect();
      connectExec();
    }
    
    return () => {
      disconnect();
      disconnectExec();
    };
  }, [selectedAgent, shouldShowDemo, connect, disconnect, connectExec, disconnectExec]);

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
        
        // Set up input requirements
        if (jsonData.status === 'unconfirmed' && jsonData.missing_params && jsonData.batch_id) {
          handleMissingParams(updated[msgIndex], jsonData);
          
          // Show input form after a brief delay
          setTimeout(() => {
            setMessages(prevMsgs => {
              const msgsUpdated = [...prevMsgs];
              const msgIdx = msgsUpdated.findIndex(m => m.id === messageId);
              if (msgIdx !== -1) {
                msgsUpdated[msgIdx].showInputsDelayed = true;
              }
              return msgsUpdated;
            });
          }, 300); // 300ms delay for input fields
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
        message.needsInputs = {
          schema: decision.batch_details.inputs_schema,
          defaults: decision.batch_details.inputs_defaults || {},
          missingParams: decision.missing_params
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
        message.needsInputs = {
          schema: batchData.inputs_schema,
          defaults: (batchData.inputs_defaults as Record<string, any>) || {},
          missingParams: decision.missing_params
        };
        
        message.renderConfig = (batchData.render_config as unknown as RenderConfig) || { type: 'text' };
        // Don't overwrite content - it was already set correctly in router.selected
      }
    } catch (error) {
      console.error('Error setting up batch inputs:', error);
    }
  };

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
    
    // System checks
    if (input.includes('cpu') || input.includes('memory') || input.includes('disk')) {
      return "I understand you want to check system resources. In conversation-only mode, I can explain how to monitor CPU, memory, and disk usage, and discuss what to look for, but I won't run any actual system commands. Would you like me to explain the monitoring process?";
    }
    
    // Service management
    if (input.includes('restart') || input.includes('nginx') || input.includes('apache') || input.includes('service')) {
      return "I see you're interested in service management. In conversation-only mode, I can discuss service management best practices and explain commands, but I won't actually restart or modify any services. What would you like to know about service management?";
    }
    
    // General technical questions
    if (input.includes('how') || input.includes('what') || input.includes('why')) {
      return "That's a great question! I'm in conversation-only mode, so I can provide information, explanations, and guidance, but I won't perform any actual system operations. How can I help explain or discuss this topic with you?";
    }
    
    // Default response
    return "I'm currently in conversation-only mode, which means I can chat and provide information, but I won't make any changes to your systems or run any commands. I'm here to discuss, explain, and guide you through technical topics. What would you like to talk about?";
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
  const handlePreflightComplete = (success: boolean, runId?: string) => {
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
          
          <Card className={`flex flex-col bg-background border ${forceEnabled ? "w-full flex-1" : "w-full max-w-3xl h-[80vh] shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200"}`}>
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
                            {typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}
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
                              onConfirm={() => {
                                // Handle draft confirmation
                                if (message.decision && message.decision.mode === 'ai_draft_action') {
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
                                    human: "Confirm & Execute to apply changes"
                                  };
                                  
                                  handleExecution(executableAction, true);
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

                   {/* Execution Status Card - NEW */}
                   {message.executionStatus && (
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
              
              {isTyping && (
                <div className="flex justify-start" role="status" aria-live="polite">
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex gap-2 items-center">
                       {routerPhase && (
                         <div className="flex items-center gap-2" aria-label={`Status: ${routerPhase}`}>
                           {routerPhase === 'Thinking' && (
                             <Brain className="w-4 h-4 text-blue-500 animate-pulse" aria-hidden="true" />
                           )}
                           {routerPhase === 'Checking my ability' && (
                             <Settings className="w-4 h-4 text-purple-500 animate-pulse" aria-hidden="true" />
                           )}
                           {routerPhase === 'Analyzing server' && (
                             <Search className="w-4 h-4 text-orange-500 animate-pulse" aria-hidden="true" />
                           )}
                           {routerPhase === 'Selecting installer' && (
                             <CheckCircle className="w-4 h-4 text-green-500 animate-pulse" aria-hidden="true" />
                           )}
                           <span className="text-sm text-muted-foreground font-medium">
                             {routerPhase}
                             {routerPhase === 'Selecting installer' && '...'}
                           </span>
                          {candidateCount > 0 && routerPhase === 'Analyzing server' && (
                            <Badge variant="outline" className="text-xs" aria-label={`${candidateCount} matches found`}>
                              {candidateCount} matches
                            </Badge>
                          )}
                        </div>
                      )}
                       {!routerPhase && (
                         <div className="flex gap-1" aria-label="Processing...">
                           <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                           <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                           <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
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