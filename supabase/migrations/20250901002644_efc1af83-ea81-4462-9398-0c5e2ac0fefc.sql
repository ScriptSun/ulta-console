-- Create company themes table
CREATE TABLE IF NOT EXISTS public.company_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  colors JSONB NOT NULL,
  logo TEXT,
  font_family TEXT,
  is_active BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_themes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view company themes" ON public.company_themes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create themes" ON public.company_themes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Users can update their own themes" ON public.company_themes
  FOR UPDATE USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can manage all themes" ON public.company_themes
  FOR ALL USING (is_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_company_themes_updated_at
  BEFORE UPDATE ON public.company_themes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default themes
INSERT INTO public.company_themes (name, colors, is_active) VALUES 
('UltaAI Default', '{
  "primary": "262 83% 58%",
  "secondary": "210 40% 95%",
  "accent": "210 40% 90%",
  "background": "0 0% 100%",
  "foreground": "222.2 84% 4.9%",
  "muted": "210 40% 96%",
  "card": "0 0% 100%",
  "border": "214.3 31.8% 91.4%",
  "destructive": "0 84.2% 60.2%",
  "success": "142.1 76.2% 36.3%",
  "warning": "47.9 95.8% 53.1%"
}', true) ON CONFLICT DO NOTHING;