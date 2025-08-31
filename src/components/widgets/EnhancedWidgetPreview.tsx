import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Monitor, Smartphone, MessageCircle, Settings, Send, X, FileText, Copy, Play, CheckCircle, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Widget, WidgetTheme } from "@/hooks/useWidgets";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TaskStatusCard } from "@/components/chat/TaskStatusCard";
import { InputForm } from "@/components/chat/InputForm";
import { PreflightBlockCard } from "@/components/chat/PreflightBlockCard";
import { ApiLogsViewer } from "@/components/chat/ApiLogsViewer";
import { CustomShellCard } from "@/components/chat/CustomShellCard";
import { ProposedBatchScriptCard } from "@/components/chat/ProposedBatchScriptCard";
import { QuickInputChips } from "@/components/chat/QuickInputChips";
import { RenderedResultCard } from "@/components/chat/RenderedResultCard";

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
  taskStatus?: any;
  quickInputs?: string[];
  needsInputs?: any;
  inputErrors?: Record<string, string>;
  preflightBlocked?: any;
  decision?: any;
  preflightResult?: any;
  executionResult?: any;
  adviceResult?: any;
  renderConfig?: any;
}

const DEMO_ACTIONS = [
  { label: 'Install WordPress', action: 'install_wordpress' },
  { label: 'Check CPU Usage', action: 'check_cpu' },
  { label: 'Check Disk Space', action: 'check_disk' },
  { label: 'Restart Nginx', action: 'restart_nginx' },
  { label: 'Update System', action: 'update_system' },
  { label: 'Monitor Logs', action: 'monitor_logs' },
];

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
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  
  // Chat state
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
  const [compactMode, setCompactMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load agents on component mount
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: agents, error } = await supabase
          .from('agents')
          .select('*')
          .eq('customer_id', '22222222-2222-2222-2222-222222222222')
          .order('hostname');

        if (error) throw error;
        
        if (agents && agents.length > 0) {
          setAgents(agents);
          if (!selectedAgent) {
            setSelectedAgent(agents[0].id);
          }
        } else {
          // Seed demo agents
          const demoAgents = [
            {
              id: 'demo-agent-1',
              hostname: 'web-server-01.ultahost.com',
              os: 'ubuntu',
              status: 'online',
              agent_type: 'web-server',
              customer_id: '22222222-2222-2222-2222-222222222222'
            },
            {
              id: 'demo-agent-2', 
              hostname: 'db-server-01.ultahost.com',
              os: 'centos',
              status: 'online',
              agent_type: 'database',
              customer_id: '22222222-2222-2222-2222-222222222222'
            },
            {
              id: 'demo-agent-3',
              hostname: 'staging.ultahost.com',
              os: 'debian',
              status: 'offline',
              agent_type: 'staging',
              customer_id: '22222222-2222-2222-2222-222222222222'
            }
          ];
          setAgents(demoAgents);
          setSelectedAgent(demoAgents[0].id);
        }
      } catch (error) {
        console.error('Error loading agents:', error);
        // Use demo agents as fallback
        const demoAgents = [
          {
            id: 'demo-agent-1',
            hostname: 'web-server-01.ultahost.com',
            os: 'ubuntu',
            status: 'online',
            agent_type: 'web-server',
            customer_id: '22222222-2222-2222-2222-222222222222'
          }
        ];
        setAgents(demoAgents);
        setSelectedAgent(demoAgents[0].id);
      }
    };

    loadAgents();
  }, [selectedAgent]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Enhanced send message function with realistic simulation
  const sendMessage = useCallback(async (messageContent: string, inputData?: any) => {
    if (!messageContent.trim() || !selectedAgent) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate realistic AI processing
    const processingTime = Math.random() * 2000 + 1000; // 1-3 seconds
    
    setTimeout(() => {
      // Simulate different response types based on message content
      let aiResponse: Message;
      
      if (messageContent.toLowerCase().includes('install') || messageContent.toLowerCase().includes('wordpress')) {
        aiResponse = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "I'll help you install WordPress. Let me check the server requirements and set up the installation.",
          timestamp: new Date(),
          taskStatus: {
            type: 'task_started',
            intent: 'install_wordpress',
            runId: 'run_' + Math.random().toString(36).substr(2, 9),
            summary: 'Installing WordPress with latest version'
          }
        };
      } else if (messageContent.toLowerCase().includes('cpu') || messageContent.toLowerCase().includes('check')) {
        aiResponse = {
          id: (Date.now() + 1).toString(),
          role: 'assistant', 
          content: "I'll check the CPU usage on your server. Let me run a quick diagnostic.",
          timestamp: new Date(),
          taskStatus: {
            type: 'task_progress',
            intent: 'check_cpu',
            progress: 75,
            summary: 'Checking CPU usage and performance metrics'
          }
        };
      } else if (messageContent.toLowerCase().includes('disk') || messageContent.toLowerCase().includes('space')) {
        aiResponse = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "Checking disk space on all mounted drives. This may take a moment.",
          timestamp: new Date(),
          taskStatus: {
            type: 'task_succeeded',
            intent: 'check_disk',
            summary: 'Disk usage: 45% used (180GB free)',
            contract: {
              disk_usage: '45%',
              free_space: '180GB',
              total_space: '327GB'
            }
          }
        };
      } else if (messageContent.toLowerCase().includes('restart') || messageContent.toLowerCase().includes('nginx')) {
        aiResponse = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "I'll restart the Nginx service for you. This will cause a brief interruption.",
          timestamp: new Date(),
          decision: {
            task: 'restart_nginx',
            status: 'approved',
            risk: 'medium',
            preflight: ['check_nginx_config', 'backup_current_state']
          }
        };
      } else {
        // Default response with theme colors applied
        aiResponse = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I understand you want to "${messageContent}". This is a themed demo response showing how your custom widget styling looks. The colors, fonts, and layout all reflect your design choices. In production, I would connect to your agents and execute real commands.`,
          timestamp: new Date()
        };
      }
      
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
      
      // Add to API logs for demo
      setApiLogs(prev => [...prev, {
        timestamp: new Date().toISOString(),
        type: 'completion',
        model: 'gpt-4',
        tokens: Math.floor(Math.random() * 200) + 50,
        latency: processingTime
      }]);
    }, processingTime);
  }, [selectedAgent]);

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

  const handleAgentChange = (agentId: string) => {
    setSelectedAgent(agentId);
    // Clear messages when switching agents
    setMessages([]);
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

  const handleInputFormSubmit = (data: any) => {
    const formattedData = Object.entries(data)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    sendMessage(`Submitted form data: ${formattedData}`, data);
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
            Interactive Chat Preview
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
            Full-featured chat interface with your custom theme applied
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
            {/* Enhanced Chat Interface */}
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
                        <h4 className="font-medium">Widget Settings</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-sm">Compact Mode</label>
                            <Switch checked={compactMode} onCheckedChange={setCompactMode} />
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-sm">Sound Effects</label>
                            <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Messages Area with enhanced theming */}
              <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-[var(--widget-background)]" style={{
                fontFamily: 'var(--widget-font-family)',
                fontSize: 'var(--widget-font-size)',
                padding: compactMode ? 'var(--widget-spacing)' : 'calc(var(--widget-spacing) * 1.5)'
              }}>
                {/* Enhanced Welcome Message */}
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <MessageCircle className="w-8 h-8 mx-auto mb-3 text-[var(--widget-text-secondary)]" />
                    <p className="text-[var(--widget-text)] mb-2" style={{
                      fontSize: 'var(--widget-font-size)'
                    }}>
                      {config.theme.welcome_text || 'Hello! How can I help you manage your servers today?'}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                      {DEMO_ACTIONS.map((action, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => sendMessage(action.label)}
                          className="text-xs border-[var(--widget-border)] text-[var(--widget-text)]"
                          style={{
                            borderRadius: 'var(--widget-border-radius)',
                            fontSize: 'var(--widget-font-size-small)'
                          }}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Enhanced Messages with full theming */}
                {messages.map((message) => (
                  <div key={message.id} className="space-y-2">
                    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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
                          marginLeft: message.role === 'user' ? 'calc(var(--widget-spacing) * 1)' : '0',
                          marginRight: message.role === 'assistant' ? 'calc(var(--widget-spacing) * 1)' : '0',
                          boxShadow: 'var(--widget-shadow)',
                          transition: `all var(--widget-animation-speed) ease`
                        }}
                      >
                        <p className={message.collapsed ? 'line-clamp-2' : ''}>{message.content}</p>
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

                    {/* Enhanced Message Components with theming */}
                    {message.taskStatus && (
                      <div style={{ marginLeft: message.role === 'assistant' ? '0' : 'auto', maxWidth: '80%' }}>
                        <TaskStatusCard {...message.taskStatus} />
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

                    {message.decision && (
                      <div style={{ marginLeft: message.role === 'assistant' ? '0' : 'auto', maxWidth: '80%' }}>
                        <Card className="bg-[var(--widget-surface)] border-[var(--widget-border)]">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="w-4 h-4 text-[var(--widget-primary)]" />
                              <span className="font-medium text-[var(--widget-text)]">Task Decision</span>
                            </div>
                            <p className="text-sm text-[var(--widget-text)]">Task: {message.decision.task}</p>
                            <p className="text-sm text-[var(--widget-text-secondary)]">Risk Level: {message.decision.risk}</p>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {message.quickInputs && (
                      <div style={{ marginLeft: message.role === 'assistant' ? '0' : 'auto', maxWidth: '80%' }}>
                        <QuickInputChips 
                          inputs={message.quickInputs}
                          onInputSelect={(input) => sendMessage(input)}
                        />
                      </div>
                    )}
                  </div>
                ))}

                {/* Enhanced Typing Indicator */}
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

              {/* Enhanced Input Area */}
              <div className="p-4 border-t border-[var(--widget-border)] bg-[var(--widget-surface)]" style={{
                padding: compactMode ? 'calc(var(--widget-spacing) * 0.75)' : 'var(--widget-spacing)'
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
                    rows={compactMode ? 1 : 2}
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

          {/* Enhanced Preview Note */}
          <div className="p-4 bg-muted/50 rounded-b-lg border-t">
            <p className="text-sm text-muted-foreground">
              <strong>Enhanced Interactive Demo:</strong> This preview shows the complete chat experience with your custom theme applied to all elements including colors, typography, spacing, and animations. Test message sending, agent selection, task execution, and all interactive features.
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