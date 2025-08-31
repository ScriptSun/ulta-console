import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Monitor, Smartphone, RefreshCw, Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Widget } from "@/hooks/useWidgets";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

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
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const config = previewConfig || widget;
  if (!config) return null;

  const theme = {
    colorPrimary: config.theme.color_primary || '#007bff',
    textColor: config.theme.text_color || '#333333',
    logoUrl: config.theme.logo_url || '',
    welcomeText: config.theme.welcome_text || 'Hello! How can I help you today?'
  };

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage: Message = {
      id: '1',
      role: 'assistant',
      content: theme.welcomeText,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, [theme.welcomeText]);

  // Send message function
  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response after delay
    setTimeout(() => {
      const responses = [
        "I can help you with system administration tasks like installing WordPress, checking server status, and managing services.",
        "That's a great question! I can assist with server management, software installation, and troubleshooting.",
        "I'd be happy to help you with that. What specific task would you like me to perform?",
        "Let me help you with that. I can run commands, install software, and check system status.",
        "I understand what you're looking for. I can execute various system administration tasks safely."
      ];

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
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

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Interactive Preview
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
          Test your theme settings with this interactive chat demo
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-6 min-h-[500px] flex items-center justify-center">
            {/* View Mode Toggle */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
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

            {/* Chat Widget Container */}
            <div 
              className={`relative bg-white rounded-lg shadow-lg transition-all duration-300 flex flex-col ${
                viewMode === 'desktop' 
                  ? 'w-[400px] h-[600px]' 
                  : 'w-[320px] h-[500px]'
              }`}
            >
              {/* Header */}
              <div 
                className="flex items-center gap-3 p-4 rounded-t-lg"
                style={{ backgroundColor: theme.colorPrimary }}
              >
                {theme.logoUrl && (
                  <img 
                    src={theme.logoUrl} 
                    alt="Logo" 
                    className="w-8 h-8 rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <div>
                  <h3 className="text-white font-semibold text-sm">
                    {config.name || 'Chat Support'}
                  </h3>
                  <p className="text-white/80 text-xs">Online now</p>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 text-sm ${
                        message.role === 'user'
                          ? 'text-white'
                          : 'bg-white border'
                      }`}
                      style={{
                        backgroundColor: message.role === 'user' ? theme.colorPrimary : '#ffffff',
                        color: message.role === 'user' ? '#ffffff' : theme.textColor,
                      }}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                
                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div 
                      className="bg-white border rounded-lg p-3 text-sm"
                      style={{ color: theme.textColor }}
                    >
                      <div className="flex items-center gap-1">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                        <span className="text-xs text-gray-500 ml-2">Typing...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 border-t bg-white rounded-b-lg">
                <div className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    className="flex-1"
                    disabled={isTyping}
                  />
                  <Button
                    onClick={() => sendMessage(inputValue)}
                    disabled={!inputValue.trim() || isTyping}
                    size="sm"
                    style={{ backgroundColor: theme.colorPrimary }}
                    className="text-white hover:opacity-90"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Preview Info */}
            <div className="absolute top-4 left-4">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm">
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>
                    <span className="font-medium">View:</span> {viewMode}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Theme:</span>
                    <div 
                      className="w-3 h-3 rounded border"
                      style={{ backgroundColor: theme.colorPrimary }}
                    ></div>
                    <span className="text-xs">{theme.colorPrimary}</span>
                  </div>
                  {theme.logoUrl && (
                    <div>
                      <span className="font-medium">Logo:</span> ✓
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Preview Note */}
          <div className="p-4 bg-muted/50 rounded-b-lg border-t">
            <p className="text-sm text-muted-foreground">
              <strong>Interactive Demo:</strong> This is a live chat widget using your theme settings. 
              Try typing a message to test the appearance and functionality.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}