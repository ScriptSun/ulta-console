-- Update agent status to new values: active, suspended, terminated
-- First, update existing data to map old statuses to new ones
UPDATE public.agents 
SET status = CASE 
  WHEN status = 'running' THEN 'active'
  WHEN status = 'error' THEN 'suspended'
  WHEN status = 'offline' THEN 'terminated'
  ELSE 'active'
END;

-- Add a check constraint for the new status values
ALTER TABLE public.agents 
DROP CONSTRAINT IF EXISTS agents_status_check;

ALTER TABLE public.agents 
ADD CONSTRAINT agents_status_check 
CHECK (status IN ('active', 'suspended', 'terminated'));

-- Update the default status
ALTER TABLE public.agents 
ALTER COLUMN status SET DEFAULT 'active';