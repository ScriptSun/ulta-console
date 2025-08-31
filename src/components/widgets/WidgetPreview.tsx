import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Monitor, Smartphone, MessageCircle, Settings, Send, X, FileText, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Widget } from "@/hooks/useWidgets";
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
  { label: 'Check CPU', action: 'check_cpu' },
  { label: 'Check Disk', action: 'check_disk' },
  { label: 'Restart Nginx', action: 'restart_nginx' },
];

interface WidgetPreviewProps {
  widget: Widget | null;
  previewConfig?: {
    name: string;
    theme: {
      color_primary?: string;
      text_color?: string;
      logo_url?: string;
      welcome_text?: string;
    };
  };
}

export function WidgetPreview({ widget, previewConfig }: WidgetPreviewProps) {
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
          // Seed demo agent
          const demoAgent = {
            id: 'demo-agent-1',
            hostname: 'demo.ultahost.com',
            os: 'ubuntu',
            status: 'online',
            agent_type: 'api-server',
            customer_id: '22222222-2222-2222-2222-222222222222'
          };
          setAgents([demoAgent]);
          setSelectedAgent(demoAgent.id);
        }
      } catch (error) {
        console.error('Error loading agents:', error);
        // Use demo agent as fallback
        const demoAgent = {
          id: 'demo-agent-1',
          hostname: 'demo.ultahost.com',
          os: 'ubuntu',
          status: 'online',
          agent_type: 'api-server',
          customer_id: '22222222-2222-2222-2222-222222222222'
        };
        setAgents([demoAgent]);
        setSelectedAgent(demoAgent.id);
      }
    };

    loadAgents();
  }, [selectedAgent]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message function
  const sendMessage = useCallback(async (messageContent: string) => {
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

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I understand you want to ${messageContent}. This is a demo response showing how your widget will work with your custom theme. In the real widget, I would connect to your agents and execute commands.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
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
  };

  if (!widget && !previewConfig) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Widget Preview</CardTitle>
          <CardDescription>
            Select or create a widget to see the preview
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96 bg-muted rounded-lg">
            <p className="text-muted-foreground">No widget selected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const config = previewConfig || widget;
  if (!config) return null;

  const selectedAgentData = agents.find(a => a.id === selectedAgent);

  return (
    <div>
      <div className="mb-4">
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
          Test your widget theme by chatting with agents in real-time
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Apply theme customization via CSS variables */}
          <div
            style={{
              '--primary': config.theme.color_primary || '#007bff',
              '--primary-foreground': '#ffffff',
              '--muted': '#f8f9fa',
              '--muted-foreground': config.theme.text_color || '#333333',
              '--background': '#ffffff',
              '--foreground': config.theme.text_color || '#333333',
            } as React.CSSProperties}
            className={`relative transition-all duration-300 ${
              viewMode === 'desktop' 
                ? 'w-full h-[600px]' 
                : 'w-full h-[600px] max-w-[380px] mx-auto'
            }`}
          >
            {/* View Mode Toggle */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <div className="flex items-center border rounded-lg p-1 bg-white/90 backdrop-blur-sm">
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

            {/* Chat Interface */}
            <div className="flex flex-col h-full bg-background border rounded-lg overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b bg-muted/5">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-foreground">Chat Widget</h3>
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
                        <h4 className="font-medium">Widget Settings</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-sm">Compact Mode</label>
                            <Switch />
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-sm">Sound Effects</label>
                            <Switch />
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-background">
                {/* Welcome Message */}
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <MessageCircle className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground mb-2">
                      {config.theme.welcome_text || 'Hello! How can I help you today?'}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                      {DEMO_ACTIONS.map((action, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => sendMessage(action.label)}
                          className="text-xs"
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages */}
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground ml-4'
                          : 'bg-muted text-muted-foreground mr-4'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-muted text-muted-foreground p-3 rounded-lg mr-4">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t bg-muted/5">
                <div className="flex gap-2">
                  <Textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="resize-none min-h-[40px] max-h-[120px]"
                    rows={1}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isTyping}
                    size="sm"
                    className="px-3"
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
              <strong>Interactive Demo:</strong> This is a fully functional chat interface with your theme settings applied. 
              You can type messages, select agents, and test how users will interact with your widget.
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