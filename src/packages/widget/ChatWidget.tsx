import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

interface ChatWidgetProps {
  supabaseUrl: string;
  supabaseAnonKey: string;
  agentId?: string;
  tenantId?: string;
  userId?: string;
  theme?: 'light' | 'dark' | 'auto';
  position?: 'bottom-right' | 'bottom-left';
  iframeSafe?: boolean;
  onMessage?: (message: any) => void;
  onError?: (error: any) => void;
  widgetTheme?: {
    widget_button_bg?: string;
    widget_button_icon_color?: string;
    widget_button_size?: string;
    widget_button_position?: string;
    widget_initial_state?: string;
    widget_button_open_icon?: string;
    widget_button_close_icon?: string;
  };
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  pending?: boolean;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  supabaseUrl,
  supabaseAnonKey,
  agentId,
  tenantId,
  userId,
  theme = 'auto',
  position = 'bottom-right',
  iframeSafe = false,
  onMessage,
  onError,
  widgetTheme = {}
}) => {
  // Get initial state from theme or default to closed
  const initialState = widgetTheme.widget_initial_state === 'open';
  const [isOpen, setIsOpen] = useState(initialState);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = useRef(createClient(supabaseUrl, supabaseAnonKey));

  // Position classes - use theme position if available
  const widgetPosition = widgetTheme.widget_button_position || position;
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };

  // Button size classes
  const getSizeClasses = () => {
    const size = widgetTheme.widget_button_size || 'medium';
    switch (size) {
      case 'small': return 'h-12 w-12';
      case 'large': return 'h-16 w-16';
      default: return 'h-14 w-14';
    }
  };

  // Get icon for current state
  const getButtonIcon = () => {
    if (isOpen) {
      const closeIcon = widgetTheme.widget_button_close_icon || 'x';
      switch (closeIcon) {
        case 'chevron-down': return '⌄';
        case 'minus': return '−';
        case 'arrow-down': return '↓';
        default: return '✕';
      }
    } else {
      const openIcon = widgetTheme.widget_button_open_icon || 'message-circle';
      switch (openIcon) {
        case 'message-square': return '💬';
        case 'help-circle': return '❓';
        case 'phone': return '📞';
        case 'mail': return '✉️';
        case 'headphones': return '🎧';
        case 'user': return '👤';
        default: return '💬';
      }
    }
  };

  // Theme classes
  const getThemeClasses = () => {
    if (theme === 'dark') return 'dark';
    if (theme === 'light') return '';
    return 'auto'; // Auto-detect system theme
  };

  // Iframe-safe styles
  const containerStyles: React.CSSProperties = iframeSafe ? {
    position: 'fixed',
    zIndex: 999999,
    fontFamily: 'system-ui, sans-serif',
  } : {};

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Bootstrap chat session
  const bootstrapChat = async () => {
    if (!agentId || conversationId) return conversationId;

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/chat-api/chat/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          agent_id: agentId,
          user_id: userId,
          source: 'widget'
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start chat');
      }

      const newConversationId = data.conversation?.id;
      setConversationId(newConversationId);
      
      return newConversationId;
    } catch (error) {
      console.error('Error bootstrapping chat:', error);
      onError?.(error);
      return null;
    }
  };

  // Send message
  const sendMessage = async (content: string) => {
    if (!content.trim() || !agentId) return;

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
      const response = await fetch(`${supabaseUrl}/functions/v1/chat-api/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          conversation_id: currentConversationId,
          role: 'user',
          content: content.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      // Add assistant message
      const assistantContent = data.router_response || 'I received your message and I\'m processing it.';
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
        pending: false
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Show unread indicator if widget is closed
      if (!isOpen) {
        setUnreadCount(prev => prev + 1);
      }

      onMessage?.(assistantMessage);

    } catch (error) {
      console.error('Error sending message:', error);
      onError?.(error);
      
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

  // Handle open/close
  const handleToggle = () => {
    setIsOpen(prev => !prev);
    if (!isOpen) {
      setUnreadCount(0);
    }
  };

  // Handle textarea input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  return (
    <div style={containerStyles} className={`${getThemeClasses()} fixed ${positionClasses[widgetPosition]} z-50`}>
      {/* Floating Button */}
      <button
        onClick={handleToggle}
        className={`
          relative ${getSizeClasses()} rounded-full shadow-lg transition-all duration-200 hover:scale-105 flex items-center justify-center
          ${iframeSafe 
            ? 'border-0 cursor-pointer' 
            : ''
          }
        `}
        style={{
          backgroundColor: widgetTheme.widget_button_bg || (iframeSafe ? '#2563eb' : undefined),
          color: widgetTheme.widget_button_icon_color || (iframeSafe ? 'white' : undefined),
          border: iframeSafe ? 'none' : undefined,
          cursor: 'pointer',
          fontSize: '20px',
          ...(iframeSafe ? {} : {})
        }}
      >
        <span className="flex items-center justify-center">
          {getButtonIcon()}
          {unreadCount > 0 && !isOpen && (
            <span 
              className={`
                absolute -top-2 -right-2 h-5 w-5 rounded-full flex items-center justify-center text-xs
                ${iframeSafe ? 'bg-red-500 text-white' : 'bg-destructive text-destructive-foreground'}
              `}
              style={iframeSafe ? {
                backgroundColor: '#ef4444',
                color: 'white',
                fontSize: '12px'
              } : {}}
            >
              {unreadCount}
            </span>
          )}
        </span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div 
          className={`
            absolute bottom-16 w-80 h-96 rounded-lg shadow-2xl flex flex-col
            ${iframeSafe 
              ? 'bg-white border border-gray-200' 
              : 'bg-background border'
            }
          `}
          style={{
            ...(iframeSafe ? {
              backgroundColor: 'white',
              border: '1px solid #e5e7eb'
            } : {}),
            right: widgetPosition.includes('right') ? '0' : 'auto',
            left: widgetPosition.includes('left') ? '0' : 'auto',
            bottom: widgetPosition.includes('bottom') ? '16px' : 'auto',
            top: widgetPosition.includes('top') ? '16px' : 'auto'
          }}
        >
          {/* Header */}
          <div 
            className={`
              flex items-center justify-between p-4 rounded-t-lg
              ${iframeSafe 
                ? 'bg-gray-50 border-b border-gray-200' 
                : 'bg-muted border-b'
              }
            `}
            style={iframeSafe ? {
              backgroundColor: '#f9fafb',
              borderBottom: '1px solid #e5e7eb'
            } : {}}
          >
            <h3 
              className={`font-semibold ${iframeSafe ? 'text-gray-900' : ''}`}
              style={iframeSafe ? { color: '#111827', fontSize: '16px', margin: 0 } : {}}
            >
              Chat Support
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className={`
                p-1 rounded hover:bg-gray-200 transition-colors
                ${iframeSafe ? 'text-gray-500' : 'text-muted-foreground'}
              `}
              style={iframeSafe ? {
                color: '#6b7280',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px'
              } : {}}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div 
                className={`text-center ${iframeSafe ? 'text-gray-500' : 'text-muted-foreground'}`}
                style={iframeSafe ? { color: '#6b7280', fontSize: '14px' } : {}}
              >
                Start a conversation...
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`
                    max-w-[80%] rounded-lg p-3 text-sm
                    ${message.role === 'user'
                      ? iframeSafe 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-primary text-primary-foreground'
                      : iframeSafe
                        ? 'bg-gray-100 text-gray-900'
                        : 'bg-muted text-foreground'
                    }
                  `}
                  style={iframeSafe ? {
                    backgroundColor: message.role === 'user' ? '#2563eb' : '#f3f4f6',
                    color: message.role === 'user' ? 'white' : '#111827',
                    fontSize: '14px',
                    lineHeight: '1.4'
                  } : {}}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  <div 
                    className={`text-xs mt-1 opacity-70`}
                    style={iframeSafe ? { fontSize: '12px', opacity: 0.7 } : {}}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div 
                  className={`rounded-lg p-3 ${iframeSafe ? 'bg-gray-100' : 'bg-muted'}`}
                  style={iframeSafe ? { backgroundColor: '#f3f4f6' } : {}}
                >
                  <div className="flex gap-1">
                    <div 
                      className={`w-2 h-2 rounded-full animate-bounce ${iframeSafe ? 'bg-gray-400' : 'bg-muted-foreground'}`}
                      style={iframeSafe ? { backgroundColor: '#9ca3af', width: '8px', height: '8px' } : {}}
                    />
                    <div 
                      className={`w-2 h-2 rounded-full animate-bounce ${iframeSafe ? 'bg-gray-400' : 'bg-muted-foreground'}`}
                      style={iframeSafe ? { 
                        backgroundColor: '#9ca3af', 
                        width: '8px', 
                        height: '8px',
                        animationDelay: '0.1s'
                      } : { animationDelay: '0.1s' }}
                    />
                    <div 
                      className={`w-2 h-2 rounded-full animate-bounce ${iframeSafe ? 'bg-gray-400' : 'bg-muted-foreground'}`}
                      style={iframeSafe ? { 
                        backgroundColor: '#9ca3af', 
                        width: '8px', 
                        height: '8px',
                        animationDelay: '0.2s'
                      } : { animationDelay: '0.2s' }}
                    />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div 
            className={`p-4 border-t ${iframeSafe ? 'border-gray-200' : ''}`}
            style={iframeSafe ? { borderTop: '1px solid #e5e7eb' } : {}}
          >
            <div className="flex gap-2">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                className={`
                  flex-1 resize-none rounded border p-2 text-sm
                  ${iframeSafe 
                    ? 'border-gray-300 focus:border-blue-500 focus:outline-none' 
                    : 'border-input bg-background focus:border-primary focus:outline-none'
                  }
                `}
                style={iframeSafe ? {
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  padding: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'none'
                } : {}}
              />
              <button
                onClick={() => sendMessage(inputValue)}
                disabled={!inputValue.trim() || isTyping}
                className={`
                  px-3 py-2 rounded text-sm font-medium transition-colors
                  ${iframeSafe
                    ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white'
                    : 'bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground'
                  }
                `}
                style={iframeSafe ? {
                  backgroundColor: inputValue.trim() && !isTyping ? '#2563eb' : '#d1d5db',
                  color: 'white',
                  border: 'none',
                  cursor: inputValue.trim() && !isTyping ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  borderRadius: '6px'
                } : {}}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Widget initialization function for external use
export const initChatWidget = (elementId: string, config: Omit<ChatWidgetProps, 'children'>) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return;
  }

  // Create React root and render widget
  const React = require('react');
  const ReactDOM = require('react-dom/client');
  
  const root = ReactDOM.createRoot(element);
  root.render(React.createElement(ChatWidget, config));
  
  return {
    destroy: () => root.unmount(),
    updateConfig: (newConfig: Partial<ChatWidgetProps>) => {
      root.render(React.createElement(ChatWidget, { ...config, ...newConfig }));
    }
  };
};

export default ChatWidget;