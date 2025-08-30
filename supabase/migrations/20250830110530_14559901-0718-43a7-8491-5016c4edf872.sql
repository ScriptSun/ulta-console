-- Add render_config column to script_batches table
ALTER TABLE public.script_batches ADD COLUMN render_config JSONB DEFAULT '{"type": "text"}'::jsonb;