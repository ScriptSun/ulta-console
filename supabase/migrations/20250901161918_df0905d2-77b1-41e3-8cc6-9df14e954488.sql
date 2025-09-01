-- Enable realtime for agents table
ALTER TABLE public.agents REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agents;