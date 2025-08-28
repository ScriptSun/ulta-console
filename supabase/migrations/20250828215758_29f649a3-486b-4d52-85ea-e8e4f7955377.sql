-- Enable real-time for chat_events table
ALTER TABLE public.chat_events REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.chat_events;