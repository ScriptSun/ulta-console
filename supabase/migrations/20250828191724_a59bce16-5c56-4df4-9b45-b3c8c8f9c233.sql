-- Fix the search path for the increment_widget_metric function
CREATE OR REPLACE FUNCTION public.increment_widget_metric(
  _tenant_id UUID,
  _metric_type TEXT,
  _increment INTEGER DEFAULT 1,
  _metadata JSONB DEFAULT '{}'
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.widget_metrics (tenant_id, metric_type, metric_value, metadata, date_bucket)
  VALUES (_tenant_id, _metric_type, _increment, _metadata, CURRENT_DATE)
  ON CONFLICT (tenant_id, metric_type, date_bucket)
  DO UPDATE SET 
    metric_value = widget_metrics.metric_value + _increment,
    metadata = COALESCE(_metadata, widget_metrics.metadata),
    updated_at = now();
END;
$$;