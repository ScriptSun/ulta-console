-- Create widgets table for widget configuration management
CREATE TABLE public.widgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_key TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  name TEXT NOT NULL,
  allowed_domains TEXT[] NOT NULL DEFAULT '{}',
  theme JSONB NOT NULL DEFAULT '{}',
  customer_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL DEFAULT auth.uid(),
  updated_by UUID NOT NULL DEFAULT auth.uid()
);

-- Enable RLS
ALTER TABLE public.widgets ENABLE ROW LEVEL SECURITY;

-- Create policies for widgets
CREATE POLICY "Admins can manage all widgets" 
ON public.widgets 
FOR ALL
USING (is_admin());

CREATE POLICY "Users can manage widgets in their customer" 
ON public.widgets 
FOR ALL
USING ((customer_id = ANY (get_user_customer_ids())) OR is_admin())
WITH CHECK ((customer_id = ANY (get_user_customer_ids())) AND (created_by = auth.uid() OR updated_by = auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_widgets_updated_at
BEFORE UPDATE ON public.widgets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_widgets_customer_id ON public.widgets(customer_id);
CREATE INDEX idx_widgets_site_key ON public.widgets(site_key);
CREATE INDEX idx_widgets_created_at ON public.widgets(created_at DESC);