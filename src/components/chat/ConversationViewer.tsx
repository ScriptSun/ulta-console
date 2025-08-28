import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  User,
  Clock,
  MessageSquare,
  Tag,
  X,
  AlertCircle,
  CheckCircle,
  Info,
  Activity,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

interface Conversation {
  id: string;
  tenant_id: string;
  user_id: string | null;
  agent_id: string;
  session_id: string | null;
  source: string;
  started_at: string;
  closed_at: string | null;
  status: string;
  last_intent: string | null;
  last_action: string | null;
  meta: any;
  created_at: string;
  updated_at: string;
  agents?: {
    id: string;
    hostname: string | null;
    status: string;
    version: string | null;
  };
}

interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  tokens: number | null;
  redacted: boolean;
}

interface Event {
  id: string;
  conversation_id: string;
  type: string;
  agent_id: string;
  ref_id: string | null;
  payload: any;
  created_at: string;
}

interface ConversationViewerProps {
  conversation: Conversation;
  open: boolean;
  onClose: () => void;
  onCloseConversation: (conversationId: string) => Promise<void>;
  onTagConversation: (conversationId: string, tags: string[]) => Promise<void>;
}

export function ConversationViewer({
  conversation,
  open,
  onClose,
  onCloseConversation,
  onTagConversation,
}: ConversationViewerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTags, setNewTags] = useState("");
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && conversation) {
      fetchConversationData();
    }
  }, [open, conversation]);

  const fetchConversationData = async () => {
    if (!conversation) return;
    
    setLoading(true);
    try {
      // Fetch messages and events in parallel
      const [messagesResult, eventsResult] = await Promise.all([
        supabase
          .from('chat_messages')
          .select('*')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('chat_events')
          .select('*')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: true })
      ]);

      if (messagesResult.error) throw messagesResult.error;
      if (eventsResult.error) throw eventsResult.error;

      setMessages((messagesResult.data || []).map(msg => ({
        ...msg,
        role: msg.role as 'user' | 'assistant' | 'system'
      })));
      setEvents(eventsResult.data || []);
    } catch (error: any) {
      console.error('Error fetching conversation data:', error);
      toast({
        title: "Error",
        description: "Failed to load conversation details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseConversation = async () => {
    await onCloseConversation(conversation.id);
  };

  const handleAddTags = async () => {
    const tags = newTags.split(',').map(tag => tag.trim()).filter(Boolean);
    await onTagConversation(conversation.id, tags);
    setNewTags("");
    setTagDialogOpen(false);
  };

  const getEventIcon = (type: string) => {
    const icons: Record<string, any> = {
      conversation_started: Info,
      conversation_closed: X,
      message_received: MessageSquare,
      task_queued: Clock,
      task_completed: CheckCircle,
      task_failed: AlertCircle,
    };
    
    const IconComponent = icons[type] || Activity;
    return <IconComponent className="h-4 w-4" />;
  };

  const getEventColor = (type: string) => {
    const colors: Record<string, string> = {
      conversation_started: "text-blue-500",
      conversation_closed: "text-gray-500",
      message_received: "text-green-500",
      task_queued: "text-yellow-500",
      task_completed: "text-green-600",
      task_failed: "text-red-500",
    };
    
    return colors[type] || "text-gray-500";
  };

  // Merge messages and events into timeline
  const timeline = [...messages.map(m => ({ ...m, type: 'message' })), ...events.map(e => ({ ...e, type: 'event' }))]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <SheetTitle>Conversation Details</SheetTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Agent Header */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Link
                to={`/agents/${conversation.agent_id}`}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Bot className="h-4 w-4" />
                {conversation.agents?.hostname || `Agent-${conversation.agent_id.slice(0, 8)}`}
              </Link>
              <Badge variant={conversation.agents?.status === 'online' ? 'default' : 'secondary'}>
                {conversation.agents?.status || 'unknown'}
              </Badge>
              {conversation.agents?.version && (
                <Badge variant="outline" className="text-xs">
                  v{conversation.agents.version}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Tag className="h-4 w-4 mr-2" />
                    Tag
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Tags</DialogTitle>
                    <DialogDescription>
                      Add comma-separated tags to categorize this conversation.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="tags">Tags</Label>
                      <Textarea
                        id="tags"
                        placeholder="support, billing, technical..."
                        value={newTags}
                        onChange={(e) => setNewTags(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddTags}>Add Tags</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              {conversation.status === 'open' && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleCloseConversation}
                >
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
              )}
            </div>
          </div>

          {/* Conversation Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Status:</span>
              <Badge className="ml-2" variant={conversation.status === 'open' ? 'default' : 'secondary'}>
                {conversation.status}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Source:</span>
              <Badge className="ml-2" variant="outline">
                {conversation.source}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Started:</span>
              <span className="ml-2">{formatDistanceToNow(new Date(conversation.started_at), { addSuffix: true })}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Updated:</span>
              <span className="ml-2">{formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true })}</span>
            </div>
            {conversation.last_intent && (
              <div>
                <span className="text-muted-foreground">Last Intent:</span>
                <Badge className="ml-2" variant="outline">
                  {conversation.last_intent.replace('_', ' ')}
                </Badge>
              </div>
            )}
            {conversation.meta?.tags && conversation.meta.tags.length > 0 && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Tags:</span>
                <div className="flex gap-1 mt-1">
                  {conversation.meta.tags.map((tag: string, index: number) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <SheetDescription>
            Timeline of messages and events for this conversation
          </SheetDescription>
        </SheetHeader>

        {/* Timeline */}
        <div className="mt-6">
          <ScrollArea className="h-[calc(100vh-400px)]">
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-100 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {timeline.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="flex gap-3 p-3 rounded-lg border">
                    {item.type === 'message' ? (
                      <>
                        <div className={`p-2 rounded-full ${
                          (item as Message).role === 'user' 
                            ? 'bg-blue-100 text-blue-600' 
                            : 'bg-green-100 text-green-600'
                        }`}>
                          {(item as Message).role === 'user' ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium capitalize">
                              {(item as Message).role}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                            </span>
                            {(item as Message).tokens && (
                              <Badge variant="outline" className="text-xs">
                                {(item as Message).tokens} tokens
                              </Badge>
                            )}
                            {(item as Message).redacted && (
                              <Badge variant="destructive" className="text-xs flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Redacted
                              </Badge>
                            )}
                          </div>
                          <div className={`text-sm ${
                            (item as Message).redacted ? 'italic text-muted-foreground' : ''
                          }`}>
                            {(item as Message).redacted 
                              ? '[Content redacted for privacy]'
                              : (item as Message).content
                            }
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={`p-2 rounded-full bg-gray-100 ${getEventColor((item as Event).type)}`}>
                          {getEventIcon((item as Event).type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">
                              {(item as Event).type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          {(item as Event).payload && (
                            <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
                              <pre className="whitespace-pre-wrap">
                                {JSON.stringify((item as Event).payload, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
                
                {timeline.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                    <p>No messages or events yet</p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}