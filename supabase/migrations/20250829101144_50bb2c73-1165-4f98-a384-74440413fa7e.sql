-- Fix security issue: Add search_path to the helper function
CREATE OR REPLACE FUNCTION set_agent_heartbeat(p_id UUID, p_json JSONB)
RETURNS VOID AS $$
BEGIN
  UPDATE public.agents 
  SET heartbeat = p_json, last_heartbeat = NOW() 
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';