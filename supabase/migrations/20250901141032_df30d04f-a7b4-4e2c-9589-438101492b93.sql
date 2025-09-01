-- Create email_logs table for tracking sent emails (only if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'email_logs'
  ) THEN
    CREATE TABLE public.email_logs (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      email TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('password_reset', 'welcome', 'security_alert', 'notification', 'system_update')),
      subject TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
      sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      error_message TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );

    -- Add indexes for performance
    CREATE INDEX idx_email_logs_user_id ON public.email_logs(user_id);
    CREATE INDEX idx_email_logs_type ON public.email_logs(type);
    CREATE INDEX idx_email_logs_sent_at ON public.email_logs(sent_at);

    -- Enable RLS
    ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

    -- Create policies for email_logs
    CREATE POLICY "Users can view their own email logs" 
    ON public.email_logs 
    FOR SELECT 
    USING (auth.uid() = user_id);

    CREATE POLICY "Admins can view all email logs" 
    ON public.email_logs 
    FOR SELECT 
    USING (is_admin());

    CREATE POLICY "System can insert email logs" 
    ON public.email_logs 
    FOR INSERT 
    WITH CHECK (true);
  END IF;
END $$;