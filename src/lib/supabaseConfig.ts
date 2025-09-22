// Centralized Supabase configuration
export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL || "https://lfsdqyvvboapsyeauchm.supabase.co",
  anonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxmc2RxeXZ2Ym9hcHN5ZWF1Y2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMjA3ODYsImV4cCI6MjA3MTg5Njc4Nn0.8lE_UEjrIviFz6nygL7HocGho-aUG9YH1NCi6y_CrFk"
};

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