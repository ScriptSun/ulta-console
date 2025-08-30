-- Create system_settings table for global configuration
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid PRIMARY KEY,
  ai_suggestions_mode TEXT NOT NULL DEFAULT 'off' CHECK (ai_suggestions_mode IN ('off', 'show', 'execute')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Ensure only one row exists (singleton pattern)
CREATE UNIQUE INDEX IF NOT EXISTS system_settings_singleton_idx ON public.system_settings (id);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage system_settings" 
ON public.system_settings 
FOR ALL 
USING (is_admin());

CREATE POLICY "Users can read system_settings" 
ON public.system_settings 
FOR SELECT 
USING (true);

-- Insert default row if not exists
INSERT INTO public.system_settings (id, ai_suggestions_mode) 
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'off')
ON CONFLICT (id) DO NOTHING;

-- Add trigger to update updated_at
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();