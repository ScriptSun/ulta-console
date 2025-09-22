// TEMPORARY FIX: Force production URL
export const supabaseConfig = {
  url: "https://lfsdqyvvboapsyeauchm.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxmc2RxeXZ2Ym9hcHN5ZWF1Y2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMjA3ODYsImV4cCI6MjA3MTg5Njc4Nn0.8lE_UEjrIviFz6nygL7HocGho-aUG9YH1NCi6y_CrFk"
};

// Debug environment variables
console.log('🔧 Supabase Config Debug (FORCED PRODUCTION):', {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  configUrl: supabaseConfig.url,
  FORCED_MODE: true
});

// Helper function to build API URLs
export const buildApiUrl = (path: string) => {
  return `${supabaseConfig.url}${path}`;
};

// Common API endpoints
export const apiEndpoints = {
  functions: '/functions/v1',
  rest: '/rest/v1',
  auth: '/auth/v1'
};