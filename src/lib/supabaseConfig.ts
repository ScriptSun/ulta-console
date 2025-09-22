// Centralized Supabase configuration
export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
};

// Debug environment variables
console.log('🔧 Supabase Config Debug:', {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  configUrl: supabaseConfig.url,
  ENV_LOADED: true
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