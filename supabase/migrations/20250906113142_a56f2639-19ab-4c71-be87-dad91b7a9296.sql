-- Add missing updated_at column to script_batch_variants table
ALTER TABLE public.script_batch_variants 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Add updated_by column for consistency
ALTER TABLE public.script_batch_variants 
ADD COLUMN updated_by UUID NOT NULL DEFAULT auth.uid();

-- Create trigger for automatic updated_at updates
CREATE TRIGGER update_script_batch_variants_updated_at
BEFORE UPDATE ON public.script_batch_variants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();