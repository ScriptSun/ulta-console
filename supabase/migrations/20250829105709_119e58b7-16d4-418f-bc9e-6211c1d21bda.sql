-- Add last_decision_json column to agents table
ALTER TABLE public.agents 
ADD COLUMN last_decision_json jsonb DEFAULT NULL;