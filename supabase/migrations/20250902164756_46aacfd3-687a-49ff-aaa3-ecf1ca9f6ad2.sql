-- Create system_prompts table for storing AI system prompts
CREATE TABLE public.system_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  content_base64 TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_prompts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can read system prompts" 
ON public.system_prompts 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert system prompts" 
ON public.system_prompts 
FOR INSERT 
TO authenticated
WITH CHECK (updated_by = auth.uid());

CREATE POLICY "Authenticated users can update system prompts" 
ON public.system_prompts 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (updated_by = auth.uid());

-- Create updated_at trigger
CREATE TRIGGER update_system_prompts_updated_at
  BEFORE UPDATE ON public.system_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default system prompts (base64 encoded)
INSERT INTO public.system_prompts (prompt_key, name, description, content_base64) VALUES
('router', 'Router System Prompt', 'Main routing and decision-making prompt for AI agents', 'WW91IGFyZSBVbHRhQUksIGEgc2VydmVyIG1hbmFnZW1lbnQgYXNzaXN0YW50LiBZb3VyIGpvYiBpcyB0byBhbmFseXplIGFuZCByb3V0ZSBjb21tYW5kcyB0byB0aGUgYXBwcm9wcmlhdGUgc3lzdGVtcy4='),
('chat', 'Chat System Prompt', 'Conversational AI prompt for user interactions', 'WW91IGFyZSBhIGhlbHBmdWwgQUkgYXNzaXN0YW50IGZvciBzZXJ2ZXIgbWFuYWdlbWVudCBhbmQgc3lzdGVtIGFkbWluaXN0cmF0aW9uLg=='),
('tools', 'Tools System Prompt', 'Tool usage and integration prompt for AI functions', 'WW91IGFyZSBhIHNwZWNpYWxpemVkIEFJIGFzc2lzdGFudCBmb3IgdG9vbCBtYW5hZ2VtZW50IGFuZCBpbnRlZ3JhdGlvbi4='),
('advice', 'Advice System Prompt', 'Advisory and recommendation prompt for AI guidance', 'WW91IGFyZSBhbiBleHBlcnQgYWR2aXNvciBmb3Igc2VydmVyIG1hbmFnZW1lbnQgYW5kIGJlc3QgcHJhY3RpY2VzLg=='),
('input-filler', 'Input Filler System Prompt', 'Automatic input completion and suggestion prompt', 'WW91IGFyZSBhbiBBSSBhc3Npc3RhbnQgc3BlY2lhbGl6ZWQgaW4gaW50ZWxsaWdlbnQgaW5wdXQgY29tcGxldGlvbi4='),
('command-suggestion', 'Command Suggestion System Prompt', 'Command recommendation and safety validation prompt', 'WW91IGFyZSBVbHRhQUksIGEgc2VydmVyIG1hbmFnZW1lbnQgYXNzaXN0YW50LiBUaGUgdXNlciByZXF1ZXN0ZWQgYSBjb21tYW5kIG9yIGFjdGlvbiB0aGF0IGlzIG5vdCBkaXJlY3RseSBhdmFpbGFibGUgaW4gb3VyIHN5c3RlbS4=');