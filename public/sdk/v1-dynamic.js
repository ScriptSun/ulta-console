(function() {
  'use strict';
  
  // Create the UltaAIWidget global object
  window.UltaAIWidget = window.UltaAIWidget || {};
  
  // CRITICAL: Emergency test to see if script loads at all
  console.log('🚨 SCRIPT LOADED: UltaAI Widget SDK v1.js loaded successfully');
  
  // Test if window.UltaAIWidget exists
  console.log('🚨 UltaAIWidget object:', window.UltaAIWidget);
  
  // Dynamic configuration - get from environment or meta tags
  function getConfig() {
    // Try to get from meta tags first
    const urlMeta = document.querySelector('meta[name="ultaai-supabase-url"]');
    const keyMeta = document.querySelector('meta[name="ultaai-supabase-key"]');
    
    return {
      API_BASE_URL: urlMeta?.content || window.ULTAAI_SUPABASE_URL || 'http://localhost:54321',
      WIDGET_API_ENDPOINT: '/functions/v1/widget-api'
    };
  }
  
  const CONFIG = getConfig();
  
  // Widget state management
  let widgetInstances = {};
  let isLoaded = false;
  
  // Debug utilities
  function debugLog(message, data = null, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = '🤖 UltaAI Widget DEBUG';
    
    if (level === 'error') {
      console.error(`${prefix} [${timestamp}] ${message}`, data || '');
    } else if (level === 'warn') {
      console.warn(`${prefix} [${timestamp}] ${message}`, data || '');
    } else {
      console.log(`${prefix} [${timestamp}] ${message}`, data || '');
    }
  }
  
  // Auto-load functionality
  function autoLoad() {
    const scripts = document.querySelectorAll('script[data-ultaai-site-key]');
    
    scripts.forEach(script => {
      const siteKey = script.getAttribute('data-ultaai-site-key');
      if (!siteKey) return;
      
      const options = {
        debug: script.getAttribute('data-ultaai-debug') === 'true',
        position: script.getAttribute('data-ultaai-position') || 'bottom-right',
        autoOpen: script.getAttribute('data-ultaai-auto-open') === 'true',
        hideOnMobile: script.getAttribute('data-ultaai-hide-on-mobile') === 'true',
        theme: {}
      };
      
      // Parse theme JSON if provided
      const themeStr = script.getAttribute('data-ultaai-theme');
      if (themeStr) {
        try {
          options.theme = JSON.parse(themeStr);
        } catch (error) {
          debugLog('Failed to parse theme JSON', error, 'warn');
        }
      }
      
      // Create widget with dynamic config
      createWidget(siteKey, options);
    });
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoLoad);
  } else {
    autoLoad();
  }
  
  // Export API
  window.UltaAIWidget = {
    load: createWidget,
    config: CONFIG,
    instances: widgetInstances,
    debug: debugLog
  };
  
  debugLog('Widget SDK v1.js loaded with dynamic configuration', CONFIG);
  
})();
