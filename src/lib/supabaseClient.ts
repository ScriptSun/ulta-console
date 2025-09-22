import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://lfsdqyvvboapsyeauchm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxmc2RxeXZ2Ym9hcHN5ZWF1Y2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMjA3ODYsImV4cCI6MjA3MTg5Njc4Nn0.8lE_UEjrIviFz6nygL7HocGho-aUG9YH1NCi6y_CrFk";

// Enhanced Supabase client with better error handling and retry logic
export const supabaseEnhanced = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'x-client-info': 'supabase-js-web/2.56.0',
    },
  },
  db: {
    schema: 'public',
  },
  // Add retry logic for failed requests
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Enhanced query wrapper with retry logic and better error handling
export async function queryWithRetry<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  maxRetries = 3,
  retryDelay = 1000
): Promise<{ data: T | null; error: any }> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Query attempt ${attempt}/${maxRetries}`);
      const result = await queryFn();
      
      if (!result.error) {
        console.log(`Query succeeded on attempt ${attempt}`);
        return result;
      }
      
      lastError = result.error;
      
      // Don't retry on authentication or permission errors
      if (result.error?.code === 'PGRST116' || result.error?.message?.includes('JWT')) {
        console.log('Authentication/permission error - not retrying');
        return result;
      }
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      console.log(`Query failed on attempt ${attempt}, retrying in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      
    } catch (error: any) {
      console.error(`Network error on attempt ${attempt}:`, error);
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }
  
  return { data: null, error: lastError };
}

// Test connection function
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  error?: string;
  details?: any;
}> {
  try {
    console.log('Testing Supabase connection...');
    
    // Test 1: Basic connectivity
    const { data, error } = await supabaseEnhanced
      .from('agents')
      .select('id')
      .limit(1);
    
    if (error) {
      return {
        success: false,
        error: `Database query failed: ${error.message}`,
        details: error
      };
    }
    
    console.log('Supabase connection test successful');
    return {
      success: true,
      details: { recordCount: data?.length || 0 }
    };
    
  } catch (error: any) {
    console.error('Supabase connection test failed:', error);
    return {
      success: false,
      error: `Network error: ${error.message}`,
      details: error
    };
  }
}