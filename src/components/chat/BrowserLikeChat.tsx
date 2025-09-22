import React, { useState } from 'react';
import { ChatDemo } from './ChatDemo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  MessageCircle, 
  Home, 
  Settings, 
  X, 
  Plus,
  Sparkles,
  BarChart3,
  Activity,
  Send
} from 'lucide-react';

interface BrowserLikeChatProps {
  currentRoute?: string;
  forceEnabled?: boolean;
}

const quickActions = [
  {
    icon: '🏠',
    title: 'Install WordPress on my server',
    description: 'Set up a WordPress installation'
  },
  {
    icon: '📊',
    title: 'Show the current CPU usage',
    description: 'Monitor system performance'
  },
  {
    icon: '🏠',
    title: 'Install WordPress on my server',
    description: 'Set up a WordPress installation'
  },
  {
    icon: '📊',
    title: 'Show the current CPU usage',
    description: 'Monitor system performance'
  }
];

export const BrowserLikeChat: React.FC<BrowserLikeChatProps> = ({ 
  currentRoute = '/chat',
  forceEnabled = true 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showChatDemo, setShowChatDemo] = useState(false);

  const handleQuickAction = (title: string) => {
    setInputValue(title);
    setShowChatDemo(true);
  };

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      setShowChatDemo(true);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col overflow-hidden">
      {/* Browser Top Bar */}
      <div className="bg-slate-800/90 border-b border-slate-700/50 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
        </div>
        
        {/* Browser Tabs */}
        <div className="flex-1 flex items-center justify-center max-w-2xl mx-8">
          <div className="flex bg-slate-700/50 rounded-lg p-1 gap-1 w-full">
            {[1, 2, 3, 4].map((tab) => (
              <div
                key={tab}
                className="flex-1 bg-slate-600/50 rounded px-3 py-1.5 flex items-center gap-2 text-sm text-slate-300"
              >
                <div className="w-4 h-4 bg-blue-500 rounded-sm flex items-center justify-center">
                  <BarChart3 className="w-2.5 h-2.5 text-white" />
                </div>
                <span className="truncate">analytics.google.com</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
            <Plus className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-16 bg-slate-800/90 border-r border-slate-700/50 flex flex-col items-center py-4 gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-10 h-10 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg"
          >
            <Home className="w-5 h-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="w-10 h-10 text-blue-400 bg-blue-500/20 hover:text-blue-300 hover:bg-blue-500/30 rounded-lg"
          >
            <MessageCircle className="w-5 h-5" />
          </Button>
          <span className="text-xs text-slate-400 mt-1">Chat</span>
          
          <Button
            variant="ghost"
            size="sm"
            className="w-10 h-10 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg"
          >
            <Activity className="w-5 h-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="w-10 h-10 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chat Messages Area */}
          <div className="flex-1 relative overflow-hidden">
            {showChatDemo ? (
              /* Show the actual ChatDemo when user interacts */
              <div className="h-full">
                <ChatDemo 
                  currentRoute={currentRoute} 
                  forceEnabled={forceEnabled} 
                />
              </div>
            ) : (
              /* Custom UI Overlay - Initial State */
              <div className="flex flex-col items-center justify-center p-8 h-full">
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-blue-400" />
                  </div>
                  <h1 className="text-2xl font-semibold text-white mb-2">
                    Manage Your Server
                  </h1>
                  <p className="text-slate-400 text-sm">
                    Tell me what I can do to help you manage analytics.google.com
                  </p>
                </div>

                {/* Quick Action Cards */}
                <div className="grid grid-cols-2 gap-4 max-w-2xl w-full">
                  {quickActions.map((action, index) => (
                    <Card
                      key={index}
                      className="bg-slate-700/50 border-slate-600/50 hover:bg-slate-700/70 transition-colors cursor-pointer p-4"
                      onClick={() => handleQuickAction(action.title)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-slate-600/50 rounded-lg flex items-center justify-center text-lg">
                          {action.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-white text-sm font-medium mb-1">
                            {action.title}
                          </h3>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Input Area */}
          <div className="bg-slate-800/90 border-t border-slate-700/50 p-4">
            <div className="flex items-center gap-3 max-w-4xl mx-auto">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white p-2"
              >
                <Settings className="w-4 h-4" />
              </Button>
              
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask anything..."
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">⌘↵ Execution</span>
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};