-- Remove any existing constraint first
ALTER TABLE public.agents 
DROP CONSTRAINT IF EXISTS agents_status_check;

-- Update all existing data to new status values
UPDATE public.agents 
SET status = 'active' 
WHERE status = 'running';

UPDATE public.agents 
SET status = 'suspended' 
WHERE status = 'error';

UPDATE public.agents 
SET status = 'terminated' 
WHERE status = 'offline';

-- Now add the constraint for new status values
ALTER TABLE public.agents 
ADD CONSTRAINT agents_status_check 
CHECK (status IN ('active', 'suspended', 'terminated'));

-- Update the default status
ALTER TABLE public.agents 
ALTER COLUMN status SET DEFAULT 'active';