-- Add inputs_schema and inputs_defaults columns to script_batches table
ALTER TABLE public.script_batches 
ADD COLUMN inputs_schema JSONB DEFAULT NULL,
ADD COLUMN inputs_defaults JSONB DEFAULT NULL;