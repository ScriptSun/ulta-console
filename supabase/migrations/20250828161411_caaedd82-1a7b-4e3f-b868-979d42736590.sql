-- Create chat_conversations table
CREATE TABLE public.chat_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  user_id uuid,
  agent_id uuid NOT NULL,
  session_id text,
  source text NOT NULL DEFAULT 'website',
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  closed_at timestamp with time zone,
  status text NOT NULL DEFAULT 'open',
  last_intent text,
  last_action text,
  meta jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  tokens integer,
  redacted boolean NOT NULL DEFAULT false
);

-- Create chat_events table
CREATE TABLE public.chat_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL,
  type text NOT NULL,
  agent_id uuid NOT NULL,
  ref_id uuid,
  payload jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE public.chat_messages 
  ADD CONSTRAINT fk_chat_messages_conversation 
  FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE;

ALTER TABLE public.chat_events 
  ADD CONSTRAINT fk_chat_events_conversation 
  FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE;

ALTER TABLE public.chat_conversations 
  ADD CONSTRAINT fk_chat_conversations_agent 
  FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;

ALTER TABLE public.chat_events 
  ADD CONSTRAINT fk_chat_events_agent 
  FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX idx_chat_conversations_tenant_id ON public.chat_conversations(tenant_id);
CREATE INDEX idx_chat_conversations_agent_id ON public.chat_conversations(agent_id);
CREATE INDEX idx_chat_conversations_user_id ON public.chat_conversations(user_id);
CREATE INDEX idx_chat_conversations_session_id ON public.chat_conversations(session_id);
CREATE INDEX idx_chat_conversations_status ON public.chat_conversations(status);
CREATE INDEX idx_chat_conversations_started_at ON public.chat_conversations(started_at);

CREATE INDEX idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX idx_chat_messages_role ON public.chat_messages(role);

CREATE INDEX idx_chat_events_conversation_id ON public.chat_events(conversation_id);
CREATE INDEX idx_chat_events_agent_id ON public.chat_events(agent_id);
CREATE INDEX idx_chat_events_type ON public.chat_events(type);
CREATE INDEX idx_chat_events_created_at ON public.chat_events(created_at);

-- Enable Row Level Security
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_conversations
CREATE POLICY "Admins can manage all chat_conversations" 
ON public.chat_conversations 
FOR ALL 
USING (is_admin());

CREATE POLICY "Service role can insert chat_conversations" 
ON public.chat_conversations 
FOR INSERT 
WITH CHECK (current_setting('role') = 'service_role');

CREATE POLICY "Users can view conversations in their tenant" 
ON public.chat_conversations 
FOR SELECT 
USING (tenant_id = ANY(get_user_customer_ids()) OR is_admin());

CREATE POLICY "Users can update conversations in their tenant" 
ON public.chat_conversations 
FOR UPDATE 
USING (tenant_id = ANY(get_user_customer_ids()) OR is_admin());

-- RLS Policies for chat_messages
CREATE POLICY "Admins can manage all chat_messages" 
ON public.chat_messages 
FOR ALL 
USING (is_admin());

CREATE POLICY "Service role can insert chat_messages" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (current_setting('role') = 'service_role');

CREATE POLICY "Users can view messages in their tenant conversations" 
ON public.chat_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations cc 
    WHERE cc.id = chat_messages.conversation_id 
    AND (cc.tenant_id = ANY(get_user_customer_ids()) OR is_admin())
  )
);

CREATE POLICY "Users can insert messages in their tenant conversations" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_conversations cc 
    WHERE cc.id = chat_messages.conversation_id 
    AND cc.tenant_id = ANY(get_user_customer_ids())
  )
);

-- RLS Policies for chat_events
CREATE POLICY "Admins can manage all chat_events" 
ON public.chat_events 
FOR ALL 
USING (is_admin());

CREATE POLICY "Service role can insert chat_events" 
ON public.chat_events 
FOR INSERT 
WITH CHECK (current_setting('role') = 'service_role');

CREATE POLICY "Users can view events in their tenant conversations" 
ON public.chat_events 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations cc 
    WHERE cc.id = chat_events.conversation_id 
    AND (cc.tenant_id = ANY(get_user_customer_ids()) OR is_admin())
  )
);

-- Add updated_at trigger for chat_conversations
CREATE TRIGGER update_chat_conversations_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();