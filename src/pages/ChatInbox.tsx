import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ConversationTable } from "@/components/chat/ConversationTable";
import { ConversationViewer } from "@/components/chat/ConversationViewer";
import { Card } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

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
  _count?: {
    chat_messages: number;
    chat_events: number;
  };
}

export default function ChatInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      
      // Get conversations with agent info and message/event counts
      const { data: conversationsData, error } = await supabase
        .from('chat_conversations')
        .select(`
          *,
          agents!inner (
            id,
            hostname,
            status,
            version
          )
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Get message and event counts for each conversation
      const conversationsWithCounts = await Promise.all(
        (conversationsData || []).map(async (conversation) => {
          const [messagesResult, eventsResult] = await Promise.all([
            supabase
              .from('chat_messages')
              .select('id', { count: 'exact' })
              .eq('conversation_id', conversation.id),
            supabase
              .from('chat_events')
              .select('id', { count: 'exact' })
              .eq('conversation_id', conversation.id)
          ]);

          return {
            ...conversation,
            _count: {
              chat_messages: messagesResult.count || 0,
              chat_events: eventsResult.count || 0
            }
          };
        })
      );

      setConversations(conversationsWithCounts);
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase.functions.invoke('chat-api', {
        body: { 
          action: 'close',
          conversation_id: conversationId 
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Conversation closed",
      });

      // Refresh conversations
      await fetchConversations();
      
      // Close viewer if this conversation was selected
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
      }
    } catch (error: any) {
      console.error('Error closing conversation:', error);
      toast({
        title: "Error",
        description: "Failed to close conversation",
        variant: "destructive",
      });
    }
  };

  const handleTagConversation = async (conversationId: string, tags: string[]) => {
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({
          meta: { tags },
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Conversation tagged",
      });

      // Refresh conversations
      await fetchConversations();
    } catch (error: any) {
      console.error('Error tagging conversation:', error);
      toast({
        title: "Error",
        description: "Failed to tag conversation",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MessageSquare className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Chat Inbox</h1>
          <p className="text-muted-foreground">
            Manage customer conversations and support requests
          </p>
        </div>
      </div>

      {/* Conversations Table */}
      <Card className="p-6">
        <ConversationTable
          conversations={conversations}
          loading={loading}
          onConversationSelect={setSelectedConversation}
          onRefresh={fetchConversations}
        />
      </Card>

      {/* Conversation Viewer */}
      {selectedConversation && (
        <ConversationViewer
          conversation={selectedConversation}
          open={!!selectedConversation}
          onClose={() => setSelectedConversation(null)}
          onCloseConversation={handleCloseConversation}
          onTagConversation={handleTagConversation}
        />
      )}
    </div>
  );
}