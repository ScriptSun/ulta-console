import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

// Create Supabase admin client for server-side operations
export const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)