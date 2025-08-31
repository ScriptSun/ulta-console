-- Add token tracking columns to agent_usage table
ALTER TABLE public.agent_usage 
ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completion_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'gpt-4o-mini';