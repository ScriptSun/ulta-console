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
                <div className="relative w-full h-full bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 rounded-lg overflow-hidden">
                  {isConnected ? (
                    <>
                      {/* Ubuntu Server Desktop */}
                      <div className="w-full h-full relative">
                        {/* Desktop Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-600 via-purple-700 to-purple-900"></div>
                        
                        {/* Top Panel */}
                        <div className="absolute top-0 left-0 right-0 h-8 bg-gray-900/90 border-b border-gray-700 flex items-center justify-between px-2">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">U</div>
                            <span className="text-white text-xs">Ubuntu Server 22.04 LTS</span>
                          </div>
                          <div className="flex items-center gap-1 text-white text-xs">
                            <span>{new Date().toLocaleTimeString()}</span>
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          </div>
                        </div>

                        {/* Terminal Window */}
                        <div className="absolute top-16 left-4 w-96 h-64 bg-black/95 rounded border border-gray-600 shadow-lg">
                          <div className="flex items-center justify-between bg-gray-800 px-2 py-1 rounded-t border-b border-gray-600">
                            <span className="text-white text-xs">Terminal</span>
                            <div className="flex gap-1">
                              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            </div>
                          </div>
                          <div className="p-2 text-green-400 font-mono text-xs leading-relaxed">
                            <div>user@ubuntu-server:~$ htop</div>
                            <div className="text-white">Tasks: 127 total, 2 running, 125 sleeping</div>
                            <div className="text-cyan-400">%Cpu(s): 12.5 us, 3.1 sy, 0.0 ni, 84.4 id</div>
                            <div className="text-yellow-400">KiB Mem: 8049316 total, 3247892 used</div>
                            <div className="mt-1">
                              <div>PID USER   %CPU %MEM COMMAND</div>
                              <div>1234 www    15.2  2.1 nginx</div>
                              <div>5678 mysql  8.7   12.3 mysqld</div>
                              <div>9012 user   2.1   1.5 python</div>
                            </div>
                          </div>
                        </div>

                        {/* File Manager Window */}
                        <div className="absolute top-32 right-4 w-80 h-48 bg-gray-100 rounded border border-gray-400 shadow-lg">
                          <div className="flex items-center justify-between bg-gray-200 px-2 py-1 rounded-t border-b border-gray-300">
                            <span className="text-gray-800 text-xs">Files - /var/www/html</span>
                            <div className="flex gap-1">
                              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            </div>
                          </div>
                          <div className="p-2 text-gray-700 text-xs space-y-1">
                            <div className="flex items-center gap-2 hover:bg-blue-100 px-1">
                              <div className="w-3 h-3 bg-yellow-600 rounded"></div>
                              <span>📁 public</span>
                            </div>
                            <div className="flex items-center gap-2 hover:bg-blue-100 px-1">
                              <div className="w-3 h-3 bg-blue-600 rounded"></div>
                              <span>📄 index.html</span>
                            </div>
                            <div className="flex items-center gap-2 hover:bg-blue-100 px-1">
                              <div className="w-3 h-3 bg-green-600 rounded"></div>
                              <span>📄 config.php</span>
                            </div>
                            <div className="flex items-center gap-2 hover:bg-blue-100 px-1">
                              <div className="w-3 h-3 bg-red-600 rounded"></div>
                              <span>📄 error.log</span>
                            </div>
                          </div>
                        </div>

                        {/* System Monitor */}
                        <div className="absolute bottom-16 left-4 w-64 h-32 bg-gray-900 rounded border border-gray-600 shadow-lg">
                          <div className="bg-gray-800 px-2 py-1 rounded-t border-b border-gray-600">
                            <span className="text-white text-xs">System Monitor</span>
                          </div>
                          <div className="p-2 text-xs text-green-400 space-y-1">
                            <div className="flex justify-between">
                              <span>CPU:</span>
                              <div className="flex items-center gap-1">
                                <div className="w-16 h-1 bg-gray-700 rounded">
                                  <div className="w-3/4 h-full bg-green-500 rounded"></div>
                                </div>
                                <span>75%</span>
                              </div>
                            </div>
                            <div className="flex justify-between">
                              <span>RAM:</span>
                              <div className="flex items-center gap-1">
                                <div className="w-16 h-1 bg-gray-700 rounded">
                                  <div className="w-1/2 h-full bg-blue-500 rounded"></div>
                                </div>
                                <span>50%</span>
                              </div>
                            </div>
                            <div className="flex justify-between">
                              <span>Disk:</span>
                              <div className="flex items-center gap-1">
                                <div className="w-16 h-1 bg-gray-700 rounded">
                                  <div className="w-1/3 h-full bg-yellow-500 rounded"></div>
                                </div>
                                <span>33%</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Docker Container Status */}
                        <div className="absolute bottom-16 right-4 w-48 h-24 bg-blue-900 rounded border border-blue-600 shadow-lg">
                          <div className="bg-blue-800 px-2 py-1 rounded-t border-b border-blue-600">
                            <span className="text-white text-xs">Docker Containers</span>
                          </div>
                          <div className="p-2 text-xs text-blue-200 space-y-1">
                            <div className="flex justify-between">
                              <span>nginx-web</span>
                              <span className="text-green-400">✓ Running</span>
                            </div>
                            <div className="flex justify-between">
                              <span>mysql-db</span>
                              <span className="text-green-400">✓ Running</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Mouse Cursor Indicator */}
                      <div 
                        className="absolute pointer-events-none transition-all duration-200 z-50"
                        style={{ 
                          left: `${(mousePosition.x / 800) * 100}%`,
                          top: `${(mousePosition.y / 600) * 100}%`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      >
                        <MousePointer2 className="w-4 h-4 text-white drop-shadow-lg" />
                      </div>
                      
                      {/* Activity Indicator */}
                      {isStreaming && (
                        <div className="absolute top-2 right-2 flex items-center gap-2 bg-black/70 text-white px-2 py-1 rounded text-xs z-40">
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