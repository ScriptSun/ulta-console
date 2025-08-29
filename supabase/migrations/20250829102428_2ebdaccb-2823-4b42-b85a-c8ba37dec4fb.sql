-- Add description field to script_batches table for ChatGPT context
ALTER TABLE public.script_batches 
ADD COLUMN description TEXT;