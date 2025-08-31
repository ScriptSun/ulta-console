/**
 * AltaAI Widget SDK v1.0.0
 * Public JavaScript SDK for embedding AltaAI chat widgets
 */
(function(window, document) {
  'use strict';

  // Prevent multiple SDK loads
  if (window.AltaAIWidget) {
    console.warn('AltaAI Widget SDK already loaded');
    return;
  }

  // Default configuration
  const DEFAULT_OPTS = {
    position: 'bottom-right', // 'top-left', 'top-right', 'bottom-left', 'bottom-right'
    width: '400px',
    height: '600px',
    borderRadius: '12px',
    zIndex: '9999',
    colorPrimary: '#007bff',
    textColor: '#333333',
    logoUrl: '',
    welcomeText: 'Hello! How can I help you today?'
  };

  // Position mappings
  const POSITION_STYLES = {
    'top-left': { top: '20px', left: '20px', right: 'auto', bottom: 'auto' },
    'top-right': { top: '20px', right: '20px', left: 'auto', bottom: 'auto' },
    'bottom-left': { bottom: '20px', left: '20px', right: 'auto', top: 'auto' },
    'bottom-right': { bottom: '20px', right: '20px', left: 'auto', top: 'auto' }
  };

  // Utility functions
  function isValidPosition(position) {
    return Object.keys(POSITION_STYLES).includes(position);
  }

  function sanitizeOpts(opts) {
    const sanitized = Object.assign({}, DEFAULT_OPTS, opts || {});
    
    // Validate position
    if (!isValidPosition(sanitized.position)) {
      console.warn(`Invalid position "${sanitized.position}", using default "bottom-right"`);
      sanitized.position = 'bottom-right';
    }

    // Ensure dimensions are strings with units
    if (typeof sanitized.width === 'number') {
      sanitized.width = sanitized.width + 'px';
    }
    if (typeof sanitized.height === 'number') {
      sanitized.height = sanitized.height + 'px';
    }

    // Ensure borderRadius has units
    if (typeof sanitized.borderRadius === 'number') {
      sanitized.borderRadius = sanitized.borderRadius + 'px';
    }

    // Ensure zIndex is string
    if (typeof sanitized.zIndex === 'number') {
      sanitized.zIndex = sanitized.zIndex.toString();
    }

    return sanitized;
  }

  function buildIframeSrc(siteKey, opts) {
    const origin = window.location.origin;
    const optsParam = encodeURIComponent(JSON.stringify(opts));
    
    // Build the iframe source URL using absolute path to prevent mixed content issues
    const baseUrl = window.location.origin;
    return `${baseUrl}/public/widget/frame.html?site_key=${encodeURIComponent(siteKey)}&origin=${encodeURIComponent(origin)}&opts=${optsParam}`;
  }

  function createIframe(siteKey, opts) {
    const iframe = document.createElement('iframe');
    const positionStyle = POSITION_STYLES[opts.position];
    
    // Set iframe attributes
    iframe.src = buildIframeSrc(siteKey, opts);
    iframe.id = 'altaai-widget-iframe';
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('allow', 'microphone; camera; autoplay');
    iframe.setAttribute('title', 'AltaAI Chat Widget');
    
    // Apply styles
    Object.assign(iframe.style, {
      position: 'fixed',
      width: opts.width,
      height: opts.height,
      borderRadius: opts.borderRadius,
      zIndex: opts.zIndex,
      border: 'none',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
      transition: 'all 0.3s ease',
      backgroundColor: 'white'
    }, positionStyle);

    return iframe;
  }

  function removeExistingWidget() {
    const existingIframe = document.getElementById('altaai-widget-iframe');
    if (existingIframe) {
      existingIframe.remove();
    }
  }

  function validateSiteKey(siteKey) {
    if (!siteKey || typeof siteKey !== 'string') {
      throw new Error('AltaAI Widget: siteKey is required and must be a string');
    }
    if (siteKey.length < 10) {
      throw new Error('AltaAI Widget: siteKey appears to be invalid (too short)');
    }
  }

  function waitForDocumentReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }

  // Main SDK object
  const AltaAIWidget = {
    version: '1.0.0',
    
    /**
     * Load and display the AltaAI widget
     * @param {string} siteKey - The site key for the widget
     * @param {Object} opts - Configuration options
     */
    load: function(siteKey, opts) {
      try {
        // Validate inputs
        validateSiteKey(siteKey);
        
        // Sanitize options
        const sanitizedOpts = sanitizeOpts(opts);
        
        // Wait for document to be ready
        waitForDocumentReady(function() {
          try {
            // Remove any existing widget
            removeExistingWidget();
            
            // Create and inject new iframe
            const iframe = createIframe(siteKey, sanitizedOpts);
            document.body.appendChild(iframe);
            
            console.log('AltaAI Widget loaded successfully');
          } catch (error) {
            console.error('AltaAI Widget: Failed to inject iframe:', error);
            throw error;
          }
        });
        
      } catch (error) {
        console.error('AltaAI Widget: Load failed:', error);
        throw error;
      }
    },

    /**
     * Remove the widget from the page
     */
    unload: function() {
      removeExistingWidget();
      console.log('AltaAI Widget unloaded');
    },

    /**
     * Check if widget is currently loaded
     */
    isLoaded: function() {
      return document.getElementById('altaai-widget-iframe') !== null;
    },

    /**
     * Update widget options (reloads the widget)
     */
    updateOptions: function(siteKey, opts) {
      if (this.isLoaded()) {
        this.load(siteKey, opts);
      } else {
        console.warn('AltaAI Widget: No widget currently loaded to update');
      }
    }
  };

  // Expose SDK to global scope
  window.AltaAIWidget = AltaAIWidget;

  // Optional: Auto-load if data attributes are present on script tag
  (function autoLoad() {
    const scripts = document.querySelectorAll('script[data-altaai-site-key]');
    if (scripts.length > 0) {
      const script = scripts[0];
      const siteKey = script.getAttribute('data-altaai-site-key');
      
      if (siteKey) {
        const opts = {};
        
        // Parse data attributes for options
        const dataAttrs = script.dataset;
        for (const key in dataAttrs) {
          if (key !== 'altaaiSiteKey' && key.startsWith('altaai')) {
            const optKey = key.replace('altaai', '').toLowerCase();
            opts[optKey] = dataAttrs[key];
          }
        }
        
        // Auto-load the widget
        try {
          AltaAIWidget.load(siteKey, opts);
        } catch (error) {
          console.error('AltaAI Widget: Auto-load failed:', error);
        }
      }
    }
  })();

})(window, document);