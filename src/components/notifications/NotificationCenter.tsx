import React, { useState, useEffect } from 'react';
import { Bell, Check, X, AlertCircle, Info, CheckCircle, AlertTriangle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useEmailNotifications } from '@/hooks/useEmailNotifications';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export function NotificationCenter() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { sendCustomNotification, loading: emailLoading } = useEmailNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'warning',
      title: 'Agent Server Offline',
      message: 'Agent srv-web-01.ultahost.com has been offline for 5 minutes',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      read: false,
      actionUrl: '/agents/406398b1-12d6-419e-bff5-7e1efb1717e2',
    },
    {
      id: '2',
      type: 'success',
      title: 'Batch Script Completed',
      message: 'Security audit script completed successfully on 3 agents',
      timestamp: new Date(Date.now() - 900000).toISOString(),
      read: false,
    },
    {
      id: '3',
      type: 'info',
      title: 'System Update Available',
      message: 'UltaAI platform v2.1.5 is now available with security improvements',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      read: true,
    },
    {
      id: '4',
      type: 'error',
      title: 'API Rate Limit Exceeded',
      message: 'Your account has exceeded the hourly API rate limit',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      read: true,
    },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const sendEmailNotification = async (notification: Notification) => {
    if (!user?.email) {
      toast({
        title: 'Email Required',
        description: 'You must be logged in to send email notifications.',
        variant: 'destructive',
      });
      return;
    }
    
    await sendCustomNotification(
      notification.title,
      notification.message
    );
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative hover-scale group transition-all duration-300 hover:bg-accent/50 rounded-xl p-2"
        >
          <Bell className="h-5 w-5 transition-all duration-300 group-hover:rotate-12 text-red-500" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full flex items-center justify-center p-0 text-[11px] font-bold bg-red-500 text-white shadow-lg border-2 border-background min-w-[24px] animate-pulse">
              <span className="leading-none">{unreadCount > 99 ? '99+' : unreadCount}</span>
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[500px] p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl font-bold">Notifications</SheetTitle>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs hover:bg-primary/10"
                >
                  Mark all read
                </Button>
              )}
            </div>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">
                You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </SheetHeader>
          
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Bell className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No notifications</p>
                  <p className="text-sm text-center max-w-[280px]">
                    You're all caught up! We'll notify you when something new happens.
                  </p>
                </div>
              ) : (
                <div className="space-y-0">
                  {notifications.map((notification, index) => (
                    <div key={notification.id}>
                      <div
                        className={`p-6 hover:bg-muted/50 transition-colors cursor-pointer ${
                          !notification.read ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                        }`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex items-start gap-4">
                          <div className="mt-1">
                            {getIcon(notification.type)}
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className={`text-sm font-semibold ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {notification.title}
                              </p>
                              <div className="flex items-center gap-2">
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-primary rounded-full" />
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    sendEmailNotification(notification);
                                  }}
                                  disabled={emailLoading}
                                  className="h-7 w-7 p-0 hover:bg-blue-100 hover:text-blue-600"
                                  title="Send as email"
                                >
                                  <Mail className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 hover:bg-destructive/20 hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeNotification(notification.id);
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground font-medium">
                              {formatTime(notification.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                      {index < notifications.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
          
          {notifications.length > 0 && (
            <div className="p-6 pt-4 border-t bg-muted/30">
              <Button variant="outline" className="w-full font-medium" size="default">
                View All Notifications
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}