import React, { useState, useEffect, useRef } from 'react';
import { ChatDemo } from '@/components/chat/ChatDemo';
import { createClient } from '@supabase/supabase-js';

interface EnhancedChatWidgetProps {
  supabaseUrl: string;
  supabaseAnonKey: string;
  siteKey: string;
  tenantId?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  theme?: 'light' | 'dark' | 'auto';
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
  width?: string;
  height?: string;
  autoOpen?: boolean;
  showBadge?: boolean;
  embedded?: boolean;
  widgetTheme?: {
    color_primary?: string;
    text_color?: string;
    welcome_text?: string;
    logo_url?: string;
    [key: string]: any;
  };
  onMessage?: (message: any) => void;
  onError?: (error: any) => void;
  onReady?: () => void;
}

export const EnhancedChatWidget: React.FC<EnhancedChatWidgetProps> = ({
  supabaseUrl,
  supabaseAnonKey,
  siteKey,
  tenantId,
  userId,
  userEmail,
  userName,
  theme = 'auto',
  position = 'bottom-right',
  width = '400px',
  height = '600px',
  autoOpen = false,
  showBadge = true,
  embedded = false,
  widgetTheme = {},
  onMessage,
  onError,
  onReady
}) => {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [isReady, setIsReady] = useState(false);
  const [widgetConfig, setWidgetConfig] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = useRef(createClient(supabaseUrl, supabaseAnonKey));

  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
  };

  // Load widget configuration and set up real-time updates
  useEffect(() => {
    loadWidgetConfig();
    setupRealtimeUpdates();
    
    // Mark as ready after initialization
    setTimeout(() => {
      setIsReady(true);
      onReady?.();
    }, 100);
  }, [siteKey]);

  const loadWidgetConfig = async () => {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/widget-admin-api/api/widget/config?site_key=${siteKey}&origin=${window.location.origin}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load widget config: ${response.status}`);
      }

      const config = await response.json();
      setWidgetConfig(config);
      
      // Merge server config with props
      if (config.theme) {
        Object.assign(widgetTheme, config.theme);
      }
    } catch (error) {
      console.error('Error loading widget config:', error);
      onError?.(error);
    }
  };

  // Set up real-time updates for widget configuration changes
  const setupRealtimeUpdates = () => {
    const channel = supabase.current
      .channel('widget-config-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'widgets',
          filter: `site_key=eq.${siteKey}`
        },
        (payload) => {
          console.log('Widget config updated:', payload.new);
          setWidgetConfig(payload.new);
          
          // Apply theme updates immediately
          if (payload.new.theme) {
            Object.assign(widgetTheme, payload.new.theme);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.current.removeChannel(channel);
    };
  };

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    
    if (newState) {
      setUnreadCount(0);
    }
  };

  const handleChatMessage = (message: any) => {
    onMessage?.(message);
    
    // Show unread indicator if widget is closed
    if (!isOpen && message.role === 'assistant') {
      setUnreadCount(prev => prev + 1);
    }
  };

  // Apply theme styles
  const buttonStyle = {
    backgroundColor: widgetTheme.color_primary || '#007bff',
    color: 'white',
    border: 'none',
    cursor: 'pointer'
  };

  const chatStyle = {
    width,
    height,
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
    border: '1px solid rgba(0, 0, 0, 0.08)'
  };

  if (embedded) {
    // Return full embedded chat interface
    return (
      <div className="w-full h-full bg-background">
        <ChatDemo 
          currentRoute="/widget-embedded" 
          forceEnabled={true}
        />
      </div>
    );
  }

  // Return floating widget interface
  return (
    <div 
      className={`fixed z-[999999] font-sans ${positionClasses[position]}`}
      data-widget-id={siteKey}
      data-widget-version="2.0"
    >
      {/* Floating Button */}
      {showBadge && (
        <button
          onClick={handleToggle}
          className="relative w-14 h-14 rounded-full shadow-lg transition-all duration-200 hover:scale-105 flex items-center justify-center"
          style={buttonStyle}
        >
          <span className="text-xl">
            {isOpen ? '✕' : '💬'}
          </span>
          {unreadCount > 0 && !isOpen && (
            <span className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
          className={`absolute flex flex-col overflow-hidden ${position.includes('bottom') ? 'bottom-16' : 'top-16'} ${position.includes('right') ? 'right-0' : 'left-0'}`}
          style={chatStyle}
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between p-4 text-white"
            style={{ backgroundColor: widgetTheme.color_primary || '#007bff' }}
          >
            <div className="flex items-center gap-2">
              {widgetTheme.logo_url && (
                <img 
                  src={widgetTheme.logo_url} 
                  alt="Logo" 
                  className="w-6 h-6 rounded"
                />
              )}
              <span className="font-semibold">
                {widgetConfig?.name || 'AI Assistant'}
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded hover:bg-black hover:bg-opacity-10 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Chat Content - Full ChatDemo */}
          <div className="flex-1 overflow-hidden">
            {isReady && (
              <ChatDemo 
                currentRoute="/widget-chat" 
                forceEnabled={true}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Widget initialization function for global use
export const initEnhancedChatWidget = (config: EnhancedChatWidgetProps) => {
  const container = document.createElement('div');
  container.id = `ultaai-widget-${Date.now()}`;
  document.body.appendChild(container);
  
  // This would be rendered by React in a real implementation
  console.log('Enhanced Chat Widget initialized with config:', config);
  
  return container.id;
};