-- Create policies for security_events
CREATE POLICY "Admins can manage all security_events" 
ON public.security_events 
FOR ALL 
USING (is_admin());

CREATE POLICY "System can insert security_events" 
ON public.security_events 
FOR INSERT 
WITH CHECK (true);

-- Create policies for widget_sessions  
CREATE POLICY "System can manage widget_sessions" 
ON public.widget_sessions 
FOR ALL 
USING (true);

-- Create policies for rate_limit_buckets
CREATE POLICY "System can manage rate_limit_buckets" 
ON public.rate_limit_buckets 
FOR ALL 
USING (true);