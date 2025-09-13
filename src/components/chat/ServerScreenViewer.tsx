import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Monitor, MousePointer2, Terminal, Activity, Maximize2, Minimize2, Play, Pause, RotateCcw } from 'lucide-react';

interface ServerScreenViewerProps {
  isOpen: boolean;
  onClose: () => void;
  agentId?: string;
  agentHostname?: string;
}

export const ServerScreenViewer: React.FC<ServerScreenViewerProps> = ({
  isOpen,
  onClose,
  agentId,
  agentHostname
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const handleConnect = () => {
    if (!agentId) return;
    
    // This would connect to a WebSocket endpoint that streams screen data
    // For now, we'll simulate the connection
    setIsConnected(true);
    setIsStreaming(true);
    setLastActivity(new Date());
    
    // Simulate mouse movements
    const interval = setInterval(() => {
      setMousePosition({
        x: Math.random() * 800,
        y: Math.random() * 600
      });
      setLastActivity(new Date());
    }, 2000);

    return () => clearInterval(interval);
  };

  const handleDisconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setIsConnected(false);
    setIsStreaming(false);
  };

  const handleRefresh = () => {
    // Refresh the screen capture
    console.log('Refreshing screen capture...');
  };

  useEffect(() => {
    if (!isOpen) {
      handleDisconnect();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Server Screen Activity
            {agentHostname && (
              <Badge variant="outline" className="ml-2">
                {agentHostname}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Controls */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`} />
                <span className="text-sm font-medium">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              {lastActivity && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="w-3 h-3" />
                  Last activity: {lastActivity.toLocaleTimeString()}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={!isConnected}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              
              {!isConnected ? (
                <Button onClick={handleConnect} size="sm">
                  <Play className="w-4 h-4 mr-2" />
                  Connect
                </Button>
              ) : (
                <Button onClick={handleDisconnect} variant="destructive" size="sm">
                  <Pause className="w-4 h-4 mr-2" />
                  Disconnect
                </Button>
              )}
            </div>
          </div>

          {/* Screen View */}
          <div className="flex-1 flex gap-4 min-h-0">
            {/* Main Screen Area */}
            <Card className="flex-1 flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  Screen Capture
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-4">
                <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
                  {isConnected ? (
                    <>
                      <canvas
                        ref={canvasRef}
                        className="w-full h-full object-contain"
                        width={800}
                        height={600}
                      />
                      {/* Mouse Cursor Indicator */}
                      <div 
                        className="absolute pointer-events-none transition-all duration-200"
                        style={{ 
                          left: `${(mousePosition.x / 800) * 100}%`,
                          top: `${(mousePosition.y / 600) * 100}%`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      >
                        <MousePointer2 className="w-4 h-4 text-red-500 drop-shadow-lg" />
                      </div>
                      
                      {/* Activity Indicator */}
                      {isStreaming && (
                        <div className="absolute top-2 right-2 flex items-center gap-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          LIVE
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Monitor className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-sm">Click Connect to start screen capture</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Terminal Activity Panel */}
            <Card className="w-80 flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  Terminal Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-4">
                <div className="h-full bg-black text-green-400 font-mono text-xs p-3 rounded overflow-y-auto">
                  {isConnected ? (
                    <div className="space-y-1">
                      <div>user@{agentHostname || 'server'}:~$ ls -la</div>
                      <div>total 24</div>
                      <div>drwxr-xr-x 3 user user 4096 Dec 13 14:30 .</div>
                      <div>drwxr-xr-x 3 root root 4096 Dec 13 14:25 ..</div>
                      <div>-rw-r--r-- 1 user user  220 Dec 13 14:25 .bash_logout</div>
                      <div>-rw-r--r-- 1 user user 3771 Dec 13 14:25 .bashrc</div>
                      <div>-rw-r--r-- 1 user user  807 Dec 13 14:25 .profile</div>
                      <div>user@{agentHostname || 'server'}:~$ <span className="animate-pulse">_</span></div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 mt-8">
                      Terminal not connected
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};