// Configuration constants
export const CONFIG = {
  // Use the current domain for SDK URL to avoid hard-coding preview URLs
  SDK_URL: `${window.location.protocol}//${window.location.host}/sdk/v1.js`,
  
  // Fallback to production URL if needed
  PRODUCTION_SDK_URL: 'https://preview--ultaai-console.lovable.app/sdk/v1.js',
  
  // Widget defaults
  WIDGET_DEFAULTS: {
    position: 'bottom-right',
    width: '400px',
    height: '600px',
    showBadge: true,
    hideOnMobile: false,
    autoOpen: false,
    debugMode: false
  },
  
  // Size constraints
  SIZE_LIMITS: {
    minWidth: 200,
    maxWidth: 800,
    minHeight: 300,
    maxHeight: 800
  }
} as const;

export function getSDKUrl(): string {
  // In development, use current domain; in production, use the deployed URL
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname.includes('preview--');
  
  return isDevelopment ? CONFIG.PRODUCTION_SDK_URL : CONFIG.SDK_URL;
}