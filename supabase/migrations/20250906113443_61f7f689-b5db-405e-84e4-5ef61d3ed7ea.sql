-- Add missing updated_at column to script_batch_variants table (nullable first)
ALTER TABLE public.script_batch_variants 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add updated_by column for consistency (nullable first) 
ALTER TABLE public.script_batch_variants 
ADD COLUMN updated_by UUID DEFAULT auth.uid();

-- Update existing records to have proper values
UPDATE public.script_batch_variants 
SET updated_at = created_at, updated_by = created_by 
WHERE updated_at IS NULL OR updated_by IS NULL;

-- Now make columns not null
ALTER TABLE public.script_batch_variants 
ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.script_batch_variants 
ALTER COLUMN updated_by SET NOT NULL;

-- Create trigger for automatic updated_at updates
CREATE TRIGGER update_script_batch_variants_updated_at
BEFORE UPDATE ON public.script_batch_variants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();